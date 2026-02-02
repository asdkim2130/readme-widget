// app/api/save/route.ts
import { NextResponse } from "next/server";
import { createNotionBookPage } from "@/lib/notion";
import type { AladinBook } from "@/lib/aladin";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<AladinBook>;

    // 최소 검증
    const isbn13 = String(body.isbn13 ?? "").replace(/-/g, "").trim();
    const title = String(body.title ?? "").trim();

    if (!/^\d{13}$/.test(isbn13)) {
      return NextResponse.json({ error: "isbn13 must be 13 digits" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const page = await createNotionBookPage({
      title,
      author: String(body.author ?? "").trim(),
      publisher: String(body.publisher ?? "").trim(),
      cover: String(body.cover ?? "").trim(),
      isbn13,
    });

    return NextResponse.json({ ok: true, page }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "save failed" },
      { status: 500 }
    );
  }
}

