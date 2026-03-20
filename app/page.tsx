'use client';

import { useState } from 'react';
import {
  Search,
  Sparkles,
  ShoppingBag,
  Tag,
  CircleDollarSign,
  Ban,
  ExternalLink,
  Loader2,
} from 'lucide-react';

type SearchMeta = {
  originalQuery?: string;
  naverQuery?: string;
  totalFiltered?: number;
  detected_conditions?: {
    type: string;
    label: string;
    value: string;
  }[];
};

type ProductItem = {
  title: string;
  mallName: string;
  price: number;
  link: string;
  image?: string;
};

function ConditionBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState('20만원 이하 쇼파커버 제외한 쇼파 찾아줘');
  const [result, setResult] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);

  const examples = [
    '20만원 이하 쇼파커버 제외한 쇼파 찾아줘',
    '32인치 모니터 20만원 이하 찾아줘',
    '화이트 색상 무선청소기 추천해줘',
    '아이패드 128GB 와이파이 모델 50개 보여줘',
  ];

  const search = async () => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/search-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const text = await res.text();

      let data: any;
      try {
        data = text ? JSON.parse(text) : { items: [] };
      } catch (e) {
        console.error('JSON 파싱 실패:', text);
        alert('서버 오류 발생 (JSON 아님)');
        return;
      }

      if (!res.ok) {
        alert(
          JSON.stringify(
            {
              error: data.error || '검색 API 오류',
              detail: data.detail || null,
              raw: data.raw || null,
            },
            null,
            2
          )
        );
        setResult([]);
        setSearchMeta(null);
        return;
      }

      setResult(data.items || []);
      setSearchMeta(data.meta || null);
    } catch (error) {
      console.error(error);
      alert('검색 중 오류가 발생했습니다.');
      setResult([]);
      setSearchMeta(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_45%,#020617_100%)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            <Sparkles className="h-4 w-4" />
            AI 쇼핑 검색 어시스턴트
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            자연어로 검색하고,
            <br className="hidden md:block" /> 조건까지 한눈에 확인
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            예산, 제외어, 개수, 상품 키워드를 AI가 분석하고 네이버 쇼핑 결과를
            보기 좋게 정리해줍니다.
          </p>
        </div>

        <SectionCard className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 pl-12 pr-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') search();
                }}
                placeholder="예: 20만원 이하 쇼파커버 제외한 쇼파 찾아줘"
              />
            </div>

            <button
              onClick={search}
              disabled={loading}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-cyan-400 px-6 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              검색
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10"
              >
                {example}
              </button>
            ))}
          </div>
        </SectionCard>

        {searchMeta && (
          <SectionCard className="mt-8 p-5">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Tag className="h-5 w-5 text-cyan-300" />
              분석된 검색 조건
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <Search className="h-4 w-4" />
                  원문
                </div>
                <div className="text-sm font-medium text-white">
                  {searchMeta.originalQuery || '-'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <ShoppingBag className="h-4 w-4" />
                  네이버 검색어
                </div>
                <div className="text-sm font-medium text-white">
                  {searchMeta.naverQuery || '-'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <CircleDollarSign className="h-4 w-4" />
                  결과 수
                </div>
                <div className="text-sm font-medium text-white">
                  {(searchMeta.totalFiltered ?? result.length).toLocaleString()}개
                </div>
              </div>
            </div>

            {searchMeta.detected_conditions?.length ? (
              <div className="flex flex-wrap gap-2">
                {searchMeta.detected_conditions.map((cond, idx) => (
                  <ConditionBadge
                    key={`${cond.type}-${idx}`}
                    label={cond.label}
                    value={cond.value}
                  />
                ))}
              </div>
            ) : null}
          </SectionCard>
        )}

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">검색 결과</h2>
            {loading ? (
              <span className="text-sm text-slate-400">검색중...</span>
            ) : null}
          </div>

          {!loading && result.length === 0 ? (
            <SectionCard className="p-10 text-center text-slate-400">
              <ShoppingBag className="mx-auto mb-3 h-10 w-10" />
              아직 검색 결과가 없어요. 위 검색창에 자연어로 원하는 상품을
              입력해보세요.
            </SectionCard>
          ) : null}

          <div className="grid gap-4">
            {result.map((item, i) => (
              <SectionCard
                key={`${item.link}-${i}`}
                className="group overflow-hidden p-4 transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
              >
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="h-36 w-full overflow-hidden rounded-2xl bg-slate-900 md:h-32 md:w-32 md:flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">
                        <Ban className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                        {item.mallName}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                        {Number(item.price).toLocaleString()}원
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-lg font-semibold text-white">
                      {item.title}
                    </h3>

                    <div className="mt-4">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm text-cyan-200 transition hover:bg-slate-800"
                      >
                        보러가기
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}