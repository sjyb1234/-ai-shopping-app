import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type ParsedShoppingQuery = {
  product_keyword: string;
  include_terms: string[];
  exclude_terms: string[];
  max_price: number | null;
  min_price: number | null;
  display_count: number;
  sort: 'sim';
};

function cleanHtml(text: string) {
  return String(text || '').replace(/<[^>]*>/g, '');
}

function shouldExcludeItem(title: string, excludeTerms: string[]) {
  const lowered = title.toLowerCase();
  return excludeTerms.some((term) => lowered.includes(term.toLowerCase()));
}

function buildNaverQuery(parsed: ParsedShoppingQuery) {
  const parts = [parsed.product_keyword, ...parsed.include_terms].filter(Boolean);
  return parts.join(' ').trim();
}

function normalizeDisplayCount(value: number | null | undefined) {
  if (value === 40) return 40;
  if (value === 50) return 50;
  return 30;
}

async function parseWithGemini(userQuery: string): Promise<ParsedShoppingQuery> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              '너는 쇼핑 검색 조건 분석기다.',
              '사용자 자연어를 쇼핑 검색용 JSON으로 바꿔라.',
              '규칙:',
              '1. product_keyword는 가장 핵심 상품명만 넣어라. 예: "쇼파", "32인치 모니터", "무선청소기"',
              '2. include_terms는 상품을 더 잘 찾기 위한 조건어만 넣어라. 예: 색상, 크기, 용도',
              '3. exclude_terms는 제외 조건만 넣어라. 예: "쇼파커버"',
              '4. "20만원 이하"는 max_price=200000 으로 변환',
              '5. "30만원 이상"은 min_price=300000 으로 변환',
              '6. 표시 개수 언급 없으면 30',
              '7. 사용자가 40개, 50개를 원하면 display_count에 반영',
              '8. sort는 항상 "sim"',
              '9. 불필요한 조사나 문장어미는 제거',
              `사용자 문장: ${userQuery}`,
            ].join('\n'),
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          product_keyword: { type: Type.STRING },
          include_terms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          exclude_terms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          max_price: {
            type: Type.NUMBER,
            nullable: true,
          },
          min_price: {
            type: Type.NUMBER,
            nullable: true,
          },
          display_count: {
            type: Type.NUMBER,
            nullable: true,
          },
          sort: {
            type: Type.STRING,
          },
        },
        required: [
          'product_keyword',
          'include_terms',
          'exclude_terms',
          'max_price',
          'min_price',
          'display_count',
          'sort',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini 응답이 비어 있습니다.');
  }

  const parsed = JSON.parse(text) as ParsedShoppingQuery;

  return {
    ...parsed,
    display_count: normalizeDisplayCount(parsed.display_count),
    sort: 'sim',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userQuery = String(body.query || '').trim();

    if (!userQuery) {
      return NextResponse.json(
        { items: [], error: 'query is required' },
        { status: 400 }
      );
    }

    const naverClientId = process.env.NAVER_CLIENT_ID;
    const naverClientSecret = process.env.NAVER_CLIENT_SECRET;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!naverClientId || !naverClientSecret) {
      return NextResponse.json(
        { items: [], error: 'NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 이 없습니다.' },
        { status: 500 }
      );
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        { items: [], error: 'GEMINI_API_KEY 가 없습니다.' },
        { status: 500 }
      );
    }

    let parsed: ParsedShoppingQuery;

    try {
      parsed = await parseWithGemini(userQuery);
    } catch (e: any) {
      console.error('Gemini 호출 실패', e);

      return NextResponse.json(
        {
          items: [],
          error: 'Gemini 분석 실패',
          detail: e?.message || String(e),
        },
        { status: 500 }
      );
    }

    const naverQuery = buildNaverQuery(parsed);

    if (!naverQuery) {
      return NextResponse.json(
        { items: [], error: '검색어를 만들 수 없습니다.' },
        { status: 400 }
      );
    }

    const naverUrl =
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(naverQuery)}` +
      `&display=${parsed.display_count}&sort=${parsed.sort}`;

    const naverRes = await fetch(naverUrl, {
      headers: {
        'X-Naver-Client-Id': naverClientId,
        'X-Naver-Client-Secret': naverClientSecret,
      },
      cache: 'no-store',
    });

    const rawText = await naverRes.text();

    let naverData: any = {};
    try {
      naverData = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json(
        { items: [], error: '네이버 응답이 JSON 형식이 아닙니다.', raw: rawText },
        { status: 500 }
      );
    }

    if (!naverRes.ok) {
      return NextResponse.json(
        {
          items: [],
          error: naverData?.errorMessage || '네이버 API 호출 실패',
          detail: naverData,
        },
        { status: naverRes.status }
      );
    }

    const items = (naverData.items || [])
      .map((item: any) => ({
        title: cleanHtml(item.title),
        mallName: item.mallName,
        price: Number(item.lprice || 0),
        link: item.link,
        image: item.image,
      }))
      .filter((item: any) => {
        if (parsed.max_price != null && item.price > parsed.max_price) return false;
        if (parsed.min_price != null && item.price < parsed.min_price) return false;
        if (shouldExcludeItem(item.title, parsed.exclude_terms)) return false;
        return true;
      });

    return NextResponse.json({
      items,
      meta: {
        originalQuery: userQuery,
        analyzed: parsed,
        naverQuery,
        totalFiltered: items.length,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      {
        items: [],
        error: error?.message || 'server error',
      },
      { status: 500 }
    );
  }
}