'use client';

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);
  const [displayCount, setDisplayCount] = useState(30);

  const search = async () => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/search-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, displayCount }),
      });

      const text = await res.text();
      console.log('API raw response:', text);

      const data = text ? JSON.parse(text) : { items: [] };

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
    <div style={{ padding: 40, color: 'white' }}>
      <h1>AI 쇼핑 검색</h1>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          style={{
            width: 400,
            padding: 10,
            color: 'white',
            backgroundColor: '#111',
            border: '1px solid #444',
            borderRadius: 8,
          }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              search();
            }
          }}
          placeholder="예: 20만원 이하 쇼파커버 제외한 쇼파 찾아줘"
        />

        <select
          value={displayCount}
          onChange={(e) => setDisplayCount(Number(e.target.value))}
          style={{
            padding: 10,
            color: 'white',
            backgroundColor: '#111',
            border: '1px solid #444',
            borderRadius: 8,
          }}
        >
          <option value={30}>30개</option>
          <option value={40}>40개</option>
          <option value={50}>50개</option>
        </select>

        <button
          onClick={search}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #444',
            background: '#222',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          검색
        </button>
      </div>

      {searchMeta && (
        <div
          style={{
            marginBottom: 20,
            border: '1px solid #333',
            borderRadius: 12,
            padding: 16,
            backgroundColor: '#111',
          }}
        >
          <h3 style={{ marginTop: 0 }}>검색 조건</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ padding: '6px 10px', border: '1px solid #444', borderRadius: 999 }}>
              원문: {searchMeta.originalQuery || '-'}
            </div>

            <div style={{ padding: '6px 10px', border: '1px solid #444', borderRadius: 999 }}>
              검색어: {searchMeta.normalizedQuery || '-'}
            </div>

            <div style={{ padding: '6px 10px', border: '1px solid #444', borderRadius: 999 }}>
              물건: {searchMeta.productKeyword || '-'}
            </div>

            <div style={{ padding: '6px 10px', border: '1px solid #444', borderRadius: 999 }}>
              가격: {searchMeta.maxPrice ? `${searchMeta.maxPrice.toLocaleString()}원` : '제한 없음'}
            </div>

            <div style={{ padding: '6px 10px', border: '1px solid #444', borderRadius: 999 }}>
              제외어: {searchMeta.excludeTerms?.length ? searchMeta.excludeTerms.join(', ') : '없음'}
            </div>

            <div style={{ padding: '6px 10px', border: '1px solid #444', borderRadius: 999 }}>
              표시 개수: {searchMeta.displayCount || displayCount}개
            </div>

            <div style={{ padding: '6px 10px', border: '1px solid #444', borderRadius: 999 }}>
              결과 수: {searchMeta.totalFiltered ?? result.length}개
            </div>
          </div>
        </div>
      )}

      {loading && <p>검색중...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {result.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              border: '1px solid #333',
              borderRadius: 12,
              padding: 16,
              backgroundColor: '#111',
            }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: 'cover',
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  backgroundColor: '#222',
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              />
            )}

            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>{item.title}</h3>
              <p style={{ margin: '0 0 6px 0' }}>{item.mallName}</p>
              <p style={{ margin: '0 0 10px 0' }}>{Number(item.price).toLocaleString()}원</p>
              <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#7fb3ff' }}>
                보러가기
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}