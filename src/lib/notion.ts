// lib/notion.ts
import type { AladinBook } from "./aladin";

type NotionCreateResponse = {
  id: string;
  url: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const NOTION_VERSION = "2022-06-28";

function propsConfig() {
  return {
    TITLE: process.env.NOTION_PROP_TITLE ?? "제목",
    AUTHOR: process.env.NOTION_PROP_AUTHOR ?? "저자",
    PUBLISHER: process.env.NOTION_PROP_PUBLISHER ?? "출판사",
    ISBN: process.env.NOTION_PROP_ISBN ?? "ISBN",
    COVER: process.env.NOTION_PROP_COVER ?? "표지",
  };
}

export async function createNotionBookPage(book: AladinBook): Promise<NotionCreateResponse> {
  const token = requireEnv("NOTION_TOKEN");
  const databaseId = requireEnv("NOTION_DATABASE_ID");
  const P = propsConfig();

  const url = "https://api.notion.com/v1/pages";

  // Minimal properties. If your DB doesn't have some fields, remove them here.
  const properties: any = {
    [P.TITLE]: {
      title: [{ text: { content: book.title || "(제목 없음)" } }],
    },
    [P.AUTHOR]: {
      rich_text: [{ text: { content: book.author ?? "" } }],
    },
    [P.PUBLISHER]: {
      rich_text: [{ text: { content: book.publisher ?? "" } }],
    },
    [P.ISBN]: {
      rich_text: [{ text: { content: book.isbn13 ?? "" } }],
    },
  };

  // Files & media property is optional. If you didn't create "표지" field, delete this block.
  if (book.cover) {
    properties[P.COVER] = {
      files: [
        {
          name: "cover",
          type: "external",
          external: { url: book.cover },
        },
      ],
    };
  }

  const payload: any = {
    parent: { database_id: databaseId },
    properties,
  };

  // Also set page cover for nicer page view (optional).
  if (book.cover) {
    payload.cover = { type: "external", external: { url: book.cover } };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Notion create failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  return { id: data.id, url: data.url };
}
