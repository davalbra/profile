import { NextResponse } from "next/server"
import { getYouTubeMusicLyrics } from "@/lib/youtube-music-lyrics"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const videoId = new URL(request.url).searchParams.get("videoId")?.trim() || ""
    if (!videoId) {
      return NextResponse.json({ error: "Falta videoId." }, { status: 400 })
    }

    const data = await getYouTubeMusicLyrics(videoId)
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener las letras."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
