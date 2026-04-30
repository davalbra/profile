import { jsonResponse } from "@/server/compat/json-response";
import { z } from "zod"
import {
  getStoredLyricsForVideoId,
  persistManualKaraokeLyrics,
  synchronizeLyrics,
  type SongMetadataInput,
} from "@/lib/lyrics-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const artistSchema = z.object({
  name: z.string().trim().min(1),
  id: z.string().trim().optional().nullable(),
})

const songSchema = z.object({
  videoId: z.string().trim().min(1),
  title: z.string().trim().optional().nullable(),
  artists: z.array(artistSchema).optional(),
  album: z.string().trim().optional().nullable(),
  duration: z.string().trim().optional().nullable(),
  thumbnailUrl: z.string().trim().optional().nullable(),
})

const manualSegmentSchema = z.object({
  text: z.string().trim().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  clickMs: z.number().int().nonnegative().optional().nullable(),
})

const manualSyncSchema = z.object({
  song: songSchema,
  manualSync: z.object({
    songStartMs: z.number().int().nonnegative(),
    songEndMs: z.number().int().nonnegative(),
    plainText: z.string().optional().nullable(),
    segments: z.array(manualSegmentSchema).min(1),
  }),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const videoId = url.searchParams.get("videoId")?.trim() || ""
    if (!videoId) {
      return jsonResponse({ error: "Falta videoId." }, { status: 400 })
    }

    const refresh = ["1", "true", "yes"].includes((url.searchParams.get("refresh") || "").toLowerCase())
    if (!refresh) {
      const stored = await getStoredLyricsForVideoId(videoId)
      if (stored?.lyrics) {
        return jsonResponse({ ok: true, data: stored.lyrics }, { headers: { "Cache-Control": "no-store" } })
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
      return jsonResponse({ ok: true, data: syncedLyrics }, { headers: { "Cache-Control": "no-store" } })
    }

    return jsonResponse(
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
    return jsonResponse({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const rawPayload = await request.json().catch(() => ({}))
    const payload = manualSyncSchema.parse(rawPayload)
    const song = payload.song as SongMetadataInput

    const data = await persistManualKaraokeLyrics(song, {
      songStartMs: payload.manualSync.songStartMs,
      songEndMs: payload.manualSync.songEndMs,
      plainText: payload.manualSync.plainText || null,
      segments: payload.manualSync.segments.map((segment) => ({
        text: segment.text,
        startMs: segment.startMs,
        endMs: segment.endMs,
        clickMs: segment.clickMs ?? null,
      })),
    })

    return jsonResponse({ ok: true, data }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        {
          error: "Payload invalido.",
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : "No se pudo guardar la sincronizacion manual."
    return jsonResponse({ error: message }, { status: 500 })
  }
}
