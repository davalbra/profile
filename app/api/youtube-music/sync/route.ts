import {NextResponse} from "next/server"
import {LyricsSource} from "@prisma/client"
import {z} from "zod"
import {
    getLyricsSyncSummary,
    persistCandidateLyrics,
    synchronizeLyrics,
    type CandidateLyricsInput,
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

const candidateLineSchema = z.object({
    text: z.string().trim().min(1),
    startMs: z.number().int().nonnegative().optional().nullable(),
    endMs: z.number().int().nonnegative().optional().nullable(),
})

const requestSchema = z.object({
    song: songSchema,
    refreshOfficial: z.boolean().optional(),
    candidateLyrics: z
        .object({
            source: z.enum([LyricsSource.AUTO_ALIGNED, LyricsSource.EXTERNAL_ALIGNMENT]),
            sourceLabel: z.string().trim().optional().nullable(),
            language: z.string().trim().optional().nullable(),
            plainText: z.string().trim().optional().nullable(),
            lines: z.array(candidateLineSchema).optional(),
            analysisMetadata: z.record(z.string(), z.unknown()).optional(),
        })
        .optional(),
})

export async function GET(request: Request) {
    try {
        const videoId = new URL(request.url).searchParams.get("videoId")?.trim() || ""
        if (!videoId) {
            return NextResponse.json({error: "Falta videoId."}, {status: 400})
        }

        const summary = await getLyricsSyncSummary(videoId)
        return NextResponse.json(
            {
                ok: true,
                data: summary,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo obtener el resumen de sincronizacion."
        return NextResponse.json({error: message}, {status: 500})
    }
}

export async function POST(request: Request) {
    try {
        const rawPayload = await request.json().catch(() => ({}))
        const payload = requestSchema.parse(rawPayload)
        const song = payload.song as SongMetadataInput

        let syncResult = null
        if (payload.refreshOfficial !== false) {
            syncResult = await synchronizeLyrics(song, {refreshOfficial: true})
        }

        let candidateSet = null
        if (payload.candidateLyrics) {
            candidateSet = await persistCandidateLyrics(song, payload.candidateLyrics as CandidateLyricsInput)
        }

        const summary = await getLyricsSyncSummary(song.videoId)
        return NextResponse.json(
            {
                ok: true,
                data: {
                    summary,
                    persisted: {
                        officialSetId: syncResult?.persisted.officialSetId || null,
                        candidateSetId: candidateSet?.id || syncResult?.persisted.candidateSetId || null,
                    },
                },
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        )
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: "Payload invalido.",
                    details: error.flatten(),
                },
                {status: 400}
            )
        }

        const message = error instanceof Error ? error.message : "No se pudo sincronizar la cancion."
        return NextResponse.json({error: message}, {status: 500})
    }
}
