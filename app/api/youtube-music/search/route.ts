import { NextResponse } from "next/server"
import { searchYouTubeMusicSongs } from "@/lib/youtube-music-search"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get("query")?.trim() || ""
    const limit = Number(url.searchParams.get("limit") || "12")
    const syncedOnly = url.searchParams.get("syncedOnly") === "1"

    if (!query) {
      return NextResponse.json({ error: "Falta query." }, { status: 400 })
    }

    const data = await searchYouTubeMusicSongs({ query, limit, syncedOnly })
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo buscar en YouTube Music."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
