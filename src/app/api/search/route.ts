// app/api/search/route.ts
import { NextResponse } from "next/server";
import { searchAladinBooks } from "@/lib/aladin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") ?? "").trim();
    const max = Number(searchParams.get("max") ?? "10");

    if (!query) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const items = await searchAladinBooks(query, isFinite(max) ? max : 10);
    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "search failed" },
      { status: 500 },
    );
  }
}
