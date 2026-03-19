import { NextResponse } from "next/server"
import { getStoredLyricsForVideoId, synchronizeLyrics, type SongMetadataInput } from "@/lib/lyrics-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const videoId = url.searchParams.get("videoId")?.trim() || ""
    if (!videoId) {
      return NextResponse.json({ error: "Falta videoId." }, { status: 400 })
    }

    const refresh = ["1", "true", "yes"].includes((url.searchParams.get("refresh") || "").toLowerCase())
    if (!refresh) {
      const stored = await getStoredLyricsForVideoId(videoId)
      if (stored?.lyrics) {
        return NextResponse.json({ ok: true, data: stored.lyrics }, { headers: { "Cache-Control": "no-store" } })
      }
    }

    const song: SongMetadataInput = {
      videoId,
      title: url.searchParams.get("title")?.trim() || null,
      album: url.searchParams.get("album")?.trim() || null,
      duration: url.searchParams.get("duration")?.trim() || null,
      thumbnailUrl: url.searchParams.get("thumbnailUrl")?.trim() || null,
    }

    const syncResult = await synchronizeLyrics(song)
    const syncedLyrics = syncResult.summary?.activeLyrics || syncResult.summary?.officialLyrics || null
    if (syncedLyrics) {
      return NextResponse.json({ ok: true, data: syncedLyrics }, { headers: { "Cache-Control": "no-store" } })
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          found: false,
          hasTimestamps: false,
          lyrics: null,
          source: null,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener las letras."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
