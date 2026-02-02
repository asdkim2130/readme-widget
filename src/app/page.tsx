"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Book = {
  title: string;
  author: string;
  publisher: string;
  cover: string;
  isbn13: string;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function Page() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIsbn, setSavingIsbn] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessage(null);
    const q = debouncedQuery.trim();

    // empty state
    if (!q) {
      setItems([]);
      setLoading(false);
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    // cancel previous
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/search?query=${encodeURIComponent(q)}&max=12`,
          {
            signal: controller.signal,
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "검색 실패");
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setMessage(e?.message ?? "검색 실패");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  const canSearch = useMemo(
    () => debouncedQuery.trim().length > 0,
    [debouncedQuery],
  );

  async function saveToNotion(book: Book) {
    try {
      setMessage(null);
      setSavingIsbn(book.isbn13);

      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "저장 실패");

      setMessage("✅ 노션 DB에 저장 완료");

      // 🔽 여기 두 줄이 핵심
      setItems([]); // 검색 결과(카드 + 스크롤) 제거
      setQuery(""); // 검색어도 같이 비우면 UX 더 깔끔
    } catch (e: any) {
      setMessage(`❌ ${e?.message ?? "저장 실패"}`);
    } finally {
      setSavingIsbn(null);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.widget}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="책 제목/저자를 입력하세요"
          style={styles.input}
          aria-label="book search"
        />

        <div style={styles.metaRow}>
          {loading && <span style={styles.muted}>검색 중…</span>}
          {!loading && canSearch && (
            <span style={styles.muted}>{items.length}건</span>
          )}
          {!canSearch && (
            <span style={styles.muted}>
              책 제목/저자를 입력하면 결과가 표시돼요
            </span>
          )}
        </div>

        {message && <div style={styles.message}>{message}</div>}

        <div style={styles.list}>
          {items.map((b) => {
            const isSaving = savingIsbn === b.isbn13;
            return (
              <button
                key={b.isbn13}
                style={styles.card}
                onClick={() => saveToNotion(b)}
                disabled={!!savingIsbn}
                title="클릭하면 노션 DB에 바로 저장"
              >
                <img
                  src={b.cover || "/favicon.ico"}
                  alt=""
                  style={styles.thumb}
                  loading="lazy"
                />
                <div style={styles.cardText}>
                  <div style={styles.titleRow}>
                    <span style={styles.titleText}>{b.title}</span>
                    {isSaving && <span style={styles.badge}>저장 중…</span>}
                  </div>
                  <div style={styles.subText}>
                    {/* MVP에선 제목+표지면 충분. 필요하면 저자/출판사 표시 */}
                    <span>{b.author}</span>
                    {b.publisher ? <span> · {b.publisher}</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    placeItems: "center",
    padding: 16,
    background: "#ffffff", // 노션 느낌: 아주 옅은 회색
    color: "#37352f",

    // ✅ 가운데 정렬 제거
    display: "flex",
    justifyContent: "center",

    // ✅ 화면 상단에서 시작 (스크롤 생겨도 위젯 위치가 덜 흔들림)
    alignItems: "flex-start",
  },

  widget: {
    width: "min(450px, 94vw)",
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #e6e6e6",
    padding: 12,
    boxShadow: "0 6px 18px rgba(15, 15, 15, 0.06)",

    // ✅ 화면 위쪽에 고정
    position: "sticky",
    top: 16,

    // maxHeight: "min(300px, calc(100vh - 32px))",
    // overflow: "hidden",
  },

  input: {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 10,
    outline: "none",
    border: "1px solid #d9d9d9",
    background: "#ffffff",
    color: "#37352f",
    fontSize: 14,
  },

  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },

  muted: {
    fontSize: 12,
    color: "#6b6b6b", // 노션의 muted 톤
  },

  message: {
    padding: "8px 10px",
    borderRadius: 10,
    background: "#f5f5f5",
    color: "#37352f",
    fontSize: 13,
    marginBottom: 10,
    border: "1px solid #e6e6e6",
  },

  list: {
    maxHeight: "200px",
    overflowY: "auto",
    display: "grid",
    gap: 6, // ✅ 더 촘촘
    paddingRight: 2,

    scrollbarWidth: "auto",
  },

  card: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "32px 1fr", // ✅ 썸네일 폭 줄임
    gap: 10,
    alignItems: "center",

    padding: "8px 10px", // ✅ 높이 줄임 (기존 10 -> 8/10)
    borderRadius: 10,
    border: "1px solid #e6e6e6",
    background: "#ffffff",
    cursor: "pointer",
    textAlign: "left",
    color: "#37352f",

    // 버튼 기본 스타일 제거(브라우저마다 다르게 보이는 거 방지)
    appearance: "none",
  },

  thumb: {
    width: 32, // ✅ 42 -> 32
    height: 44, // ✅ 56 -> 44
    borderRadius: 6,
    objectFit: "cover",
    background: "#f2f2f2",
    border: "1px solid #ededed",
  },

  cardText: {
    display: "grid",
    gap: 2, // ✅ 더 촘촘
    minWidth: 0, // 긴 제목 ellipsis 대비
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0, // ellipsis 대비
  },

  titleText: {
    fontSize: 13, // ✅ 14 -> 13
    fontWeight: 600, // 노션 느낌: 너무 두껍지 않게
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap", // ✅ 한 줄로 깔끔하게
    minWidth: 0,
    flex: 1,
  },

  subText: {
    fontSize: 12,
    color: "#7a7a7a",
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap", // ✅ 촘촘하게 한 줄
    minWidth: 0,
  },

  badge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f0f0f0",
    color: "#4a4a4a",
    border: "1px solid #e6e6e6",
    flexShrink: 0,
  },
};
