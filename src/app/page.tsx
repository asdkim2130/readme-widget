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
        const res = await fetch(`/api/search?query=${encodeURIComponent(q)}&max=12`, {
          signal: controller.signal,
        });
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

  const canSearch = useMemo(() => debouncedQuery.trim().length > 0, [debouncedQuery]);

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
      // 저장했으면 결과를 비우고 싶다면 아래 주석 해제
      // setQuery("");
      // setItems([]);
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
          placeholder="책 제목을 입력하세요"
          style={styles.input}
          aria-label="book search"
        />

        <div style={styles.metaRow}>
          {loading && <span style={styles.muted}>검색 중…</span>}
          {!loading && canSearch && <span style={styles.muted}>{items.length}건</span>}
          {!canSearch && <span style={styles.muted}>검색어를 입력하면 후보가 나타나요</span>}
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
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "#0b0b0c",
  },
  widget: {
    width: "min(520px, 94vw)",
    borderRadius: 16,
    background: "#141416",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f0f10",
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  muted: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  message: {
    padding: "8px 10px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    marginBottom: 10,
  },
  list: {
    maxHeight: 420, // 위젯 느낌: 스크롤
    overflowY: "auto",
    display: "grid",
    gap: 8,
    paddingRight: 2,
  },
  card: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    gap: 10,
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#101012",
    cursor: "pointer",
    textAlign: "left",
    color: "rgba(255,255,255,0.92)",
  },
  thumb: {
    width: 42,
    height: 56,
    borderRadius: 8,
    objectFit: "cover",
    background: "rgba(255,255,255,0.06)",
  },
  cardText: {
    display: "grid",
    gap: 4,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 650,
    lineHeight: 1.25,
  },
  subText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.25,
  },
  badge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.86)",
  },
};
