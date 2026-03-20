import { NextRequest, NextResponse } from 'next/server';

function extractExcludeTerms(query: string) {
  const excludes = new Set<string>();

  const patterns = [
    /([가-힣a-zA-Z0-9\s]+?)\s*제외/g,
    /([가-힣a-zA-Z0-9\s]+?)\s*빼고/g,
    /([가-힣a-zA-Z0-9\s]+?)\s*말고/g,
  ];

  for (const pattern of patterns) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const raw = (match[1] || '').trim();
      if (!raw) continue;

      raw
        .split(/\s+/)
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((word) => excludes.add(word));
    }
  }

  return Array.from(excludes);
}

function extractMaxPrice(query: string) {
  const match = query.match(/(\d+(?:\.\d+)?)\s*(만원|원)\s*(이하|까지|미만)/);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  if (Number.isNaN(amount)) return null;

  if (unit === '만원') return Math.round(amount * 10000);
  return Math.round(amount);
}

function extractProductKeyword(query: string) {
  return query
    .replace(/([가-힣a-zA-Z0-9\s]+?)\s*제외/g, ' ')
    .replace(/([가-힣a-zA-Z0-9\s]+?)\s*빼고/g, ' ')
    .replace(/([가-힣a-zA-Z0-9\s]+?)\s*말고/g, ' ')
    .replace(/(\d+(?:\.\d+)?)\s*(만원|원)\s*(이하|까지|미만)/g, ' ')
    .replace(/찾아줘|추천해줘|보여줘|검색해줘/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuery(query: string) {
  return extractProductKeyword(query);
}

function shouldExcludeItem(title: string, excludeTerms: string[]) {
  const lowered = title.toLowerCase();
  return excludeTerms.some((term) => lowered.includes(term.toLowerCase()));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const originalQuery = body.query ?? '';
    const displayCount = Math.min(Number(body.displayCount) || 30, 50);

    const query = normalizeQuery(originalQuery);
    const productKeyword = extractProductKeyword(originalQuery);
    const excludeTerms = extractExcludeTerms(originalQuery);
    const maxPrice = extractMaxPrice(originalQuery);

    if (!query) {
      return NextResponse.json(
        { items: [], error: 'query is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { items: [], error: 'NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 이 없습니다.' },
        { status: 500 }
      );
    }

    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${displayCount}`;

    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      cache: 'no-store',
    });

    const rawText = await res.text();

    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json(
        {
          items: [],
          error: '네이버 응답이 JSON 형식이 아닙니다.',
          raw: rawText,
        },
        { status: 500 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          items: [],
          error: data?.errorMessage || '네이버 API 호출 실패',
          detail: data,
        },
        { status: res.status }
      );
    }

    const items = (data.items || [])
      .map((item: any) => ({
        title: String(item.title || '').replace(/<[^>]*>/g, ''),
        mallName: item.mallName,
        price: Number(item.lprice || 0),
        link: item.link,
        image: item.image,
      }))
      .filter((item: any) => !shouldExcludeItem(item.title, excludeTerms))
      .filter((item: any) => {
        if (maxPrice == null) return true;
        return item.price <= maxPrice;
      });

    return NextResponse.json({
      items,
      meta: {
        originalQuery,
        normalizedQuery: query,
        productKeyword,
        excludeTerms,
        maxPrice,
        displayCount,
        totalFiltered: items.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        items: [],
        error: error?.message || 'server error',
      },
      { status: 500 }
    );
  }
}