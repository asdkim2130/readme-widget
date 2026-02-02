// lib/aladin.ts
export type AladinBook = {
  title: string;
  author: string;
  publisher: string;
  cover: string; // image url
  isbn13: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Aladin ItemSearch (title keyword)
 * We keep it minimal: title/cover/isbn13 + author/publisher.
 */
export async function searchAladinBooks(
  query: string,
  maxResults = 10,
): Promise<AladinBook[]> {
  const ttbKey = requireEnv("ALADIN_TTBKEY");
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://www.aladin.co.kr/ttb/api/ItemSearch.aspx");
  url.searchParams.set("ttbkey", ttbKey);
  url.searchParams.set("Query", q);
  url.searchParams.set("QueryType", "Title");
  url.searchParams.set(
    "MaxResults",
    String(Math.max(1, Math.min(maxResults, 50))),
  );
  url.searchParams.set("start", "1");
  url.searchParams.set("SearchTarget", "Book");
  url.searchParams.set("output", "js");
  url.searchParams.set("Version", "20131101");

  const res = await fetch(url.toString(), { cache: "no-store" });

  const rawText = await res.text(); // ✅ body는 딱 1번만 읽는다

  console.log("status", res.status);
  console.log("content-type", res.headers.get("content-type"));
  console.log("raw", rawText);

  if (!res.ok) {
    throw new Error(`Aladin search failed: ${res.status} ${rawText}`);
  }

  // Aladin output=js sometimes returns JSON or JSONP. Remove callback if present.
  const jsonText = rawText
    .replace(/^\s*\w+\s*\(\s*/s, "")
    .replace(/\s*\)\s*;?\s*$/s, "");

  let data: any;
  try {
    data = jsonText ? JSON.parse(jsonText) : null;
  } catch (e) {
    throw new Error(
      `Aladin search JSON parse failed: ${String(e)}\nraw: ${rawText.slice(0, 300)}`,
    );
  }

  const items: any[] = Array.isArray(data?.item) ? data.item : [];
  return items
    .map((it) => ({
      title: String(it?.title ?? "").trim(),
      author: String(it?.author ?? "").trim(),
      publisher: String(it?.publisher ?? "").trim(),
      cover: String(it?.cover ?? "").trim(),
      isbn13: String(it?.isbn13 ?? "").trim(),
    }))
    .filter((b) => b.title && b.isbn13);
}

export async function lookupAladinByIsbn13(
  isbn13: string,
): Promise<AladinBook | null> {
  const ttbKey = requireEnv("ALADIN_TTBKEY");
  const id = isbn13.replace(/-/g, "").trim();
  if (!/^\d{13}$/.test(id)) return null;

  const url = new URL("https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx");
  url.searchParams.set("ttbkey", ttbKey);
  url.searchParams.set("itemIdType", "ISBN13");
  url.searchParams.set("ItemId", id);
  url.searchParams.set("output", "js");
  url.searchParams.set("Version", "20131101");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Aladin lookup failed: ${res.status} ${text}`);
  }

  const rawText = await res.text();
  const jsonText = rawText
    .replace(/^\s*\w+\s*\(\s*/s, "")
    .replace(/\s*\)\s*;?\s*$/s, "");
  const data = JSON.parse(jsonText);
  const item = Array.isArray(data?.item) ? data.item[0] : null;
  if (!item) return null;

  return {
    title: String(item?.title ?? "").trim(),
    author: String(item?.author ?? "").trim(),
    publisher: String(item?.publisher ?? "").trim(),
    cover: String(item?.cover ?? "").trim(),
    isbn13: String(item?.isbn13 ?? id).trim(),
  };
}
