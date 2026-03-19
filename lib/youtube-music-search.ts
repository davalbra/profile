import type { YouTubeMusicSong } from "@/lib/youtube-music"
import { getYouTubeMusicLyrics } from "@/lib/youtube-music-lyrics"
import { sendYouTubeMusicRequest } from "@/lib/youtube-music"

export type YouTubeMusicSearchResult = YouTubeMusicSong & {
  lyricsFound?: boolean
  hasSyncedLyrics?: boolean
}

function getSearchParams(filter: "songs", ignoreSpelling: boolean) {
  const param1 = "EgWKAQ"
  const param2 = "II"
  const param3 = ignoreSpelling
    ? "AUICCAFqDBAOEAoQAxAEEAkQBQ%3D%3D"
    : "AWoMEA4QChADEAQQCRAF"
  return `${param1}${param2}${param3}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function textFromRuns(value: unknown): string | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  if (typeof record.simpleText === "string") {
    return record.simpleText
  }

  const runs = Array.isArray(record.runs) ? record.runs : []
  const text = runs
    .map((run) => {
      const currentRun = asRecord(run)
      return typeof currentRun?.text === "string" ? currentRun.text : ""
    })
    .join("")
    .trim()

  return text || null
}

function getNested(value: unknown, path: Array<string | number>): unknown {
  let current: unknown = value
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return null
      }
      current = current[segment]
      continue
    }

    const record = asRecord(current)
    if (!record) {
      return null
    }
    current = record[segment]
  }

  return current
}

function parseArtistsFromRuns(value: unknown) {
  const record = asRecord(value)
  const runs = Array.isArray(record?.runs) ? record.runs : []
  const artists: Array<{ name: string; id?: string | null }> = []

  for (const run of runs) {
    const currentRun = asRecord(run)
    const text = typeof currentRun?.text === "string" ? currentRun.text.trim() : ""
    if (!text || text === " • ") {
      continue
    }

    const browseId = getNested(currentRun, ["navigationEndpoint", "browseEndpoint", "browseId"])
    const pageType = getNested(currentRun, [
      "navigationEndpoint",
      "browseEndpoint",
      "browseEndpointContextSupportedConfigs",
      "browseEndpointContextMusicConfig",
      "pageType",
    ])

    if (
      pageType === "MUSIC_PAGE_TYPE_ARTIST" ||
      pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL" ||
      pageType === "MUSIC_PAGE_TYPE_UNKNOWN"
    ) {
      artists.push({ name: text, id: typeof browseId === "string" ? browseId : null })
    }
  }

  return artists
}

function parseSongRenderer(renderer: Record<string, unknown>): YouTubeMusicSong | null {
  const flexColumns = Array.isArray(renderer.flexColumns) ? renderer.flexColumns : []
  const titleColumn = getNested(flexColumns[0], ["musicResponsiveListItemFlexColumnRenderer", "text"])
  const detailsColumn = getNested(flexColumns[1], ["musicResponsiveListItemFlexColumnRenderer", "text"])
  const extraColumn = getNested(flexColumns[2], ["musicResponsiveListItemFlexColumnRenderer", "text"])
  const fixedColumns = Array.isArray(renderer.fixedColumns) ? renderer.fixedColumns : []
  const durationColumn = getNested(fixedColumns[0], ["musicResponsiveListItemFixedColumnRenderer", "text"])
  const thumbnailUrl = getNested(renderer, [
    "thumbnail",
    "musicThumbnailRenderer",
    "thumbnail",
    "thumbnails",
    0,
    "url",
  ])

  const title = textFromRuns(titleColumn)
  const videoId = getNested(renderer, [
    "overlay",
    "musicItemThumbnailOverlayRenderer",
    "content",
    "musicPlayButtonRenderer",
    "playNavigationEndpoint",
    "watchEndpoint",
    "videoId",
  ])

  if (!title || typeof videoId !== "string") {
    return null
  }

  return {
    videoId,
    title,
    artists: parseArtistsFromRuns(detailsColumn),
    album: textFromRuns(extraColumn),
    duration: textFromRuns(durationColumn),
    thumbnailUrl: typeof thumbnailUrl === "string" ? thumbnailUrl : null,
  }
}

function collectSearchSongRenderers(payload: unknown) {
  const results: Record<string, unknown>[] = []

  function walk(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    const record = asRecord(value)
    if (!record) {
      return
    }

    const renderer = record.musicResponsiveListItemRenderer
    if (asRecord(renderer)) {
      results.push(renderer as Record<string, unknown>)
    }

    Object.values(record).forEach(walk)
  }

  walk(payload)
  return results
}

export async function searchYouTubeMusicSongs(input: {
  query: string
  limit?: number
  syncedOnly?: boolean
}) {
  const limit = Math.max(1, Math.min(20, input.limit || 12))
  const payload = await sendYouTubeMusicRequest("search", {
    query: input.query,
    params: getSearchParams("songs", true),
  })

  const songs = collectSearchSongRenderers(payload)
    .map(parseSongRenderer)
    .filter((song): song is YouTubeMusicSong => song !== null)

  const uniqueSongs = Array.from(new Map(songs.map((song) => [song.videoId, song])).values()).slice(0, limit)

  const withLyricsState = await Promise.all(
    uniqueSongs.map(async (song) => {
      try {
        const lyrics = await getYouTubeMusicLyrics(song.videoId)
        return {
          ...song,
          lyricsFound: lyrics.found,
          hasSyncedLyrics: lyrics.hasTimestamps,
        }
      } catch {
        return {
          ...song,
          lyricsFound: false,
          hasSyncedLyrics: false,
        }
      }
    })
  )

  return input.syncedOnly ? withLyricsState.filter((song) => song.hasSyncedLyrics) : withLyricsState
}
