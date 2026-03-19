import { LyricsSetStatus, LyricsSource, type Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import type { TimedLyricLine, YouTubeMusicLyricsResult } from "@/lib/youtube-music-lyrics"
import { getYouTubeCaptionLyrics } from "@/lib/youtube-captions"
import { getYouTubeMusicLyrics } from "@/lib/youtube-music-lyrics"

export type SongMetadataInput = {
  videoId: string
  title?: string | null
  artists?: Array<{ name: string; id?: string | null }>
  album?: string | null
  duration?: string | null
  thumbnailUrl?: string | null
}

export type LyricsLineInput = {
  text: string
  startMs?: number | null
  endMs?: number | null
}

export type CandidateLyricsInput = {
  source: "AUTO_ALIGNED" | "EXTERNAL_ALIGNMENT"
  sourceLabel?: string | null
  language?: string | null
  plainText?: string | null
  lines?: LyricsLineInput[]
  analysisMetadata?: Prisma.InputJsonValue
}

type SongWithLyrics = NonNullable<Awaited<ReturnType<typeof getSongWithLyrics>>>
type LyricsSetWithLines = SongWithLyrics["lyricsSets"][number]

function parseDurationToMs(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const parts = value
    .split(":")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part))

  if (!parts.length) {
    return null
  }

  let multiplier = 1
  let total = 0
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    total += parts[index]! * multiplier
    multiplier *= 60
  }

  return total * 1000
}

export function normalizeLyricsText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenizeLyrics(value: string): string[] {
  const normalized = normalizeLyricsText(value)
  return normalized ? normalized.split(" ") : []
}

function linesToPlainText(lines: LyricsLineInput[]): string {
  return lines
    .map((line) => line.text.trim())
    .filter(Boolean)
    .join("\n")
}

function splitPlainTextIntoLines(value: string): LyricsLineInput[] {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text }))
}

function toLineInputsFromYouTube(result: YouTubeMusicLyricsResult): LyricsLineInput[] {
  if (Array.isArray(result.lyrics)) {
    return result.lyrics
      .map((line) => ({
        text: line.text,
        startMs: line.startTime,
        endMs: line.endTime,
      }))
      .filter((line) => line.text.trim())
  }

  if (typeof result.lyrics === "string") {
    return splitPlainTextIntoLines(result.lyrics)
  }

  return []
}

function buildComparison(officialLines: LyricsLineInput[], candidateLines: LyricsLineInput[]) {
  const officialText = linesToPlainText(officialLines)
  const candidateText = linesToPlainText(candidateLines)
  const officialTokens = new Set(tokenizeLyrics(officialText))
  const candidateTokens = new Set(tokenizeLyrics(candidateText))

  const sharedTokens = [...candidateTokens].filter((token) => officialTokens.has(token))
  const tokenCoverage = officialTokens.size > 0 ? sharedTokens.length / officialTokens.size : 0

  const candidateLineScores = candidateLines
    .map((candidateLine) => {
      const candidateNormalized = normalizeLyricsText(candidateLine.text)
      if (!candidateNormalized) {
        return 0
      }

      let best = 0
      for (const officialLine of officialLines) {
        const officialNormalized = normalizeLyricsText(officialLine.text)
        if (!officialNormalized) {
          continue
        }

        if (officialNormalized === candidateNormalized) {
          best = 1
          break
        }

        const officialLineTokens = new Set(tokenizeLyrics(officialLine.text))
        const candidateLineTokens = new Set(tokenizeLyrics(candidateLine.text))
        const overlap = [...candidateLineTokens].filter((token) => officialLineTokens.has(token)).length
        const union = new Set([...officialLineTokens, ...candidateLineTokens]).size
        const lineScore = union > 0 ? overlap / union : 0
        if (lineScore > best) {
          best = lineScore
        }
      }

      return best
    })
    .filter((score) => Number.isFinite(score))

  const averageLineScore = candidateLineScores.length
    ? candidateLineScores.reduce((sum, score) => sum + score, 0) / candidateLineScores.length
    : 0

  return {
    score: Number((averageLineScore * 0.6 + tokenCoverage * 0.4).toFixed(4)),
    coverage: Number(tokenCoverage.toFixed(4)),
  }
}

function mapDbLinesToTimed(lines: Array<{ id: string; text: string; startMs: number | null; endMs: number | null }>): TimedLyricLine[] {
  return lines.map((line, index) => ({
    id: index + 1,
    text: line.text,
    startTime: line.startMs ?? 0,
    endTime: line.endMs ?? 0,
  }))
}

function toApiLyricsPayload(lyricsSet: LyricsSetWithLines) {
  const lyrics = lyricsSet.isSynced
    ? mapDbLinesToTimed(lyricsSet.lineas)
    : lyricsSet.plainText ||
      linesToPlainText(lyricsSet.lineas.map((line: LyricsSetWithLines["lineas"][number]) => ({ text: line.text }))) ||
      null

  return {
    found: Boolean(lyrics),
    hasTimestamps: lyricsSet.isSynced,
    lyrics,
    source: lyricsSet.sourceLabel || null,
    browseId: lyricsSet.browseId || undefined,
    storage: {
      setId: lyricsSet.id,
      source: lyricsSet.source,
      isOfficial: lyricsSet.isOfficial,
      isActive: lyricsSet.isActive,
      status: lyricsSet.status,
      comparisonScore: lyricsSet.comparisonScore,
      comparisonCoverage: lyricsSet.comparisonCoverage,
      updatedAt: lyricsSet.actualizadoEn.toISOString(),
    },
  }
}

async function getSongWithLyrics(videoId: string) {
  return prisma.song.findUnique({
    where: { videoId },
    include: {
      artistas: {
        orderBy: { posicion: "asc" },
      },
      lyricsSets: {
        orderBy: [{ isActive: "desc" }, { creadoEn: "desc" }],
        include: {
          lineas: {
            orderBy: { posicion: "asc" },
          },
        },
      },
    },
  })
}

function pickBestLyricsSet(lyricsSets: LyricsSetWithLines[]): LyricsSetWithLines | null {
  if (!lyricsSets.length) {
    return null
  }

  const active = lyricsSets.find((set) => set.isActive)
  if (active) {
    return active
  }

  return (
    lyricsSets.find((set) => set.isOfficial && set.isSynced) ||
    lyricsSets.find((set) => set.isSynced) ||
    lyricsSets.find((set) => set.isOfficial) ||
    lyricsSets[0] ||
    null
  )
}

async function upsertSongMetadata(
  tx: Prisma.TransactionClient,
  song: SongMetadataInput
) {
  const title = song.title?.trim() || song.videoId
  const record = await tx.song.upsert({
    where: { videoId: song.videoId },
    create: {
      videoId: song.videoId,
      titulo: title,
      album: song.album?.trim() || null,
      duracionTexto: song.duration?.trim() || null,
      duracionMs: parseDurationToMs(song.duration),
      thumbnailUrl: song.thumbnailUrl?.trim() || null,
    },
    update: {
      titulo: song.title?.trim() || undefined,
      album: song.album?.trim() || undefined,
      duracionTexto: song.duration?.trim() || undefined,
      duracionMs: song.duration ? parseDurationToMs(song.duration) : undefined,
      thumbnailUrl: song.thumbnailUrl?.trim() || undefined,
    },
  })

  if (song.artists?.length) {
    await tx.songArtist.deleteMany({
      where: { songId: record.id },
    })

    await tx.songArtist.createMany({
      data: song.artists.map((artist, index) => ({
        songId: record.id,
        nombre: artist.name.trim(),
        browseId: artist.id?.trim() || null,
        posicion: index,
      })),
    })
  }

  return record
}

type PersistLyricsSetInput = {
  song: SongMetadataInput
  source: LyricsSource
  sourceLabel?: string | null
  browseId?: string | null
  language?: string | null
  isOfficial: boolean
  isSynced: boolean
  lines: LyricsLineInput[]
  plainText?: string | null
  status?: LyricsSetStatus
  comparisonScore?: number | null
  comparisonCoverage?: number | null
  comparedAgainstSetId?: string | null
  analysisMetadata?: Prisma.InputJsonValue
}

async function persistLyricsSet(input: PersistLyricsSetInput) {
  return prisma.$transaction(async (tx) => {
    const song = await upsertSongMetadata(tx, input.song)
    const plainText = input.plainText?.trim() || linesToPlainText(input.lines) || null
    const normalizedPlainText = plainText ? normalizeLyricsText(plainText.replace(/\n/g, " ")) : null

    let activateSet = false
    if (input.isOfficial && input.isSynced) {
      activateSet = true
    } else if (input.isSynced) {
      const existingActive = await tx.lyricsSet.findFirst({
        where: { songId: song.id, isActive: true },
        select: { id: true, isOfficial: true, isSynced: true },
      })
      const officialSets = await tx.lyricsSet.findMany({
        where: { songId: song.id, isOfficial: true },
        select: { id: true, isSynced: true },
      })
      const meetsComparisonThreshold = (input.comparisonScore ?? 0) >= 0.72
      const noExistingActive = !existingActive
      const noOfficialLyrics = officialSets.length === 0
      const hasOnlyUnsyncedOfficialLyrics =
        officialSets.length > 0 && officialSets.every((set) => !set.isSynced)

      activateSet =
        (meetsComparisonThreshold && noExistingActive) ||
        ((noOfficialLyrics || hasOnlyUnsyncedOfficialLyrics) && noExistingActive && input.lines.length >= 3)
    }

    if (activateSet) {
      await tx.lyricsSet.updateMany({
        where: { songId: song.id, isActive: true },
        data: { isActive: false },
      })
    }

    const existingOfficialSet =
      input.isOfficial &&
      (await tx.lyricsSet.findFirst({
        where: {
          songId: song.id,
          source: input.source,
          isOfficial: true,
          browseId: input.browseId || null,
        },
        orderBy: { creadoEn: "desc" },
        select: { id: true },
      }))

    const lyricsSet = existingOfficialSet
      ? await tx.lyricsSet.update({
          where: { id: existingOfficialSet.id },
          data: {
            status: input.status || LyricsSetStatus.READY,
            sourceLabel: input.sourceLabel?.trim() || null,
            browseId: input.browseId?.trim() || null,
            language: input.language?.trim() || null,
            isSynced: input.isSynced,
            isActive: activateSet,
            plainText,
            normalizedPlainText,
            comparisonScore: input.comparisonScore ?? null,
            comparisonCoverage: input.comparisonCoverage ?? null,
            comparedAgainstSetId: input.comparedAgainstSetId || null,
            analysisMetadata: input.analysisMetadata,
          },
        })
      : await tx.lyricsSet.create({
          data: {
            songId: song.id,
            source: input.source,
            status: input.status || LyricsSetStatus.READY,
            sourceLabel: input.sourceLabel?.trim() || null,
            browseId: input.browseId?.trim() || null,
            language: input.language?.trim() || null,
            isOfficial: input.isOfficial,
            isSynced: input.isSynced,
            isActive: activateSet,
            plainText,
            normalizedPlainText,
            comparisonScore: input.comparisonScore ?? null,
            comparisonCoverage: input.comparisonCoverage ?? null,
            comparedAgainstSetId: input.comparedAgainstSetId || null,
            analysisMetadata: input.analysisMetadata,
          },
        })

    await tx.lyricsLine.deleteMany({
      where: { lyricsSetId: lyricsSet.id },
    })

    if (input.lines.length) {
      await tx.lyricsLine.createMany({
        data: input.lines.map((line, index) => ({
          lyricsSetId: lyricsSet.id,
          posicion: index,
          text: line.text.trim(),
          normalizedText: normalizeLyricsText(line.text),
          startMs: line.startMs ?? null,
          endMs: line.endMs ?? null,
        })),
      })
    }

    return tx.lyricsSet.findUniqueOrThrow({
      where: { id: lyricsSet.id },
      include: {
        lineas: {
          orderBy: { posicion: "asc" },
        },
      },
    })
  })
}

export async function getStoredLyricsForVideoId(videoId: string) {
  const song = await getSongWithLyrics(videoId)
  if (!song) {
    return null
  }

  const lyricsSet = pickBestLyricsSet(song.lyricsSets)
  if (!lyricsSet) {
    return null
  }

  return {
    song: {
      videoId: song.videoId,
      title: song.titulo,
      album: song.album,
      duration: song.duracionTexto,
      thumbnailUrl: song.thumbnailUrl,
      artists: song.artistas.map((artist) => ({ name: artist.nombre, id: artist.browseId })),
    },
    lyrics: toApiLyricsPayload(lyricsSet),
  }
}

export async function persistYouTubeLyrics(song: SongMetadataInput, lyrics: YouTubeMusicLyricsResult) {
  const source = lyrics.hasTimestamps ? LyricsSource.YOUTUBE_MUSIC_SYNCED : LyricsSource.YOUTUBE_MUSIC_PLAIN
  const lines = toLineInputsFromYouTube(lyrics)

  return persistLyricsSet({
    song,
    source,
    sourceLabel: lyrics.source,
    browseId: lyrics.browseId || null,
    isOfficial: true,
    isSynced: lyrics.hasTimestamps,
    lines,
    plainText: typeof lyrics.lyrics === "string" ? lyrics.lyrics : linesToPlainText(lines),
    status: lyrics.found ? LyricsSetStatus.READY : LyricsSetStatus.REJECTED,
  })
}

export async function persistCandidateLyrics(song: SongMetadataInput, candidate: CandidateLyricsInput) {
  const stored = await getSongWithLyrics(song.videoId)
  const officialSet = stored ? pickBestLyricsSet(stored.lyricsSets.filter((set) => set.isOfficial)) : null
  const lines =
    candidate.lines?.filter((line) => line.text.trim()).map((line) => ({
      text: line.text,
      startMs: line.startMs ?? null,
      endMs: line.endMs ?? null,
    })) || splitPlainTextIntoLines(candidate.plainText || "")

  const comparison = officialSet
    ? buildComparison(
        officialSet.lineas.map((line: LyricsSetWithLines["lineas"][number]) => ({
          text: line.text,
          startMs: line.startMs,
          endMs: line.endMs,
        })),
        lines
      )
    : null

  return persistLyricsSet({
    song,
    source: candidate.source,
    sourceLabel: candidate.sourceLabel || null,
    language: candidate.language || null,
    isOfficial: false,
    isSynced: lines.some((line) => typeof line.startMs === "number"),
    lines,
    plainText: candidate.plainText || linesToPlainText(lines),
    status: lines.length ? LyricsSetStatus.READY : LyricsSetStatus.PENDING,
    comparisonScore: comparison?.score ?? null,
    comparisonCoverage: comparison?.coverage ?? null,
    comparedAgainstSetId: officialSet?.id || null,
    analysisMetadata: candidate.analysisMetadata,
  })
}

export async function synchronizeLyrics(song: SongMetadataInput, options?: { refreshOfficial?: boolean }) {
  let officialSet = null
  let candidateSet = null

  if (options?.refreshOfficial !== false) {
    const officialLyrics = await getYouTubeMusicLyrics(song.videoId)
    if (officialLyrics.found) {
      officialSet = await persistYouTubeLyrics(song, officialLyrics)
    }

    if (!officialLyrics.hasTimestamps) {
      const captionLyrics = await getYouTubeCaptionLyrics(song.videoId).catch(() => null)
      if (captionLyrics?.found) {
        candidateSet = await persistCandidateLyrics(song, {
          source: LyricsSource.EXTERNAL_ALIGNMENT,
          sourceLabel: captionLyrics.sourceLabel,
          language: captionLyrics.language,
          lines: captionLyrics.lines.map((line) => ({
            text: line.text,
            startMs: line.startMs,
            endMs: line.endMs,
          })),
          plainText: captionLyrics.lines.map((line) => line.text).join("\n"),
          analysisMetadata: {
            provider: "youtube_captions",
            trackKind: captionLyrics.trackKind,
            language: captionLyrics.language,
          },
        })
      }
    }
  }

  const summary = await getLyricsSyncSummary(song.videoId)
  return {
    summary,
    persisted: {
      officialSetId: officialSet?.id || null,
      candidateSetId: candidateSet?.id || null,
    },
  }
}

export async function getLyricsSyncSummary(videoId: string) {
  const song = await getSongWithLyrics(videoId)
  if (!song) {
    return null
  }

  const officialSet = pickBestLyricsSet(song.lyricsSets.filter((set) => set.isOfficial))
  const activeSet = pickBestLyricsSet(song.lyricsSets)
  const latestCandidate = song.lyricsSets.find((set) => !set.isOfficial) || null

  return {
    song: {
      videoId: song.videoId,
      title: song.titulo,
      album: song.album,
      duration: song.duracionTexto,
      thumbnailUrl: song.thumbnailUrl,
      artists: song.artistas.map((artist) => ({ name: artist.nombre, id: artist.browseId })),
    },
    activeLyrics: activeSet ? toApiLyricsPayload(activeSet) : null,
    officialLyrics: officialSet ? toApiLyricsPayload(officialSet) : null,
    latestCandidate: latestCandidate ? toApiLyricsPayload(latestCandidate) : null,
  }
}
