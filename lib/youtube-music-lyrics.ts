import { sendYouTubeMusicRequest } from "@/lib/youtube-music"

export type TimedLyricLine = {
  text: string
  startTime: number
  endTime: number
  id: number
}

export type YouTubeMusicLyricsResult = {
  found: boolean
  hasTimestamps: boolean
  lyrics: string | TimedLyricLine[] | null
  source: string | null
  browseId?: string
}

const lyricsCache = new Map<string, Promise<YouTubeMusicLyricsResult>>()

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
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

function extractLyricsBrowseId(payload: unknown) {
  const tabs = getNested(payload, [
    "contents",
    "singleColumnMusicWatchNextResultsRenderer",
    "tabbedRenderer",
    "watchNextTabbedResultsRenderer",
    "tabs",
  ])

  if (!Array.isArray(tabs) || tabs.length < 2) {
    return null
  }

  const browseId = getNested(tabs[1], ["tabRenderer", "endpoint", "browseEndpoint", "browseId"])
  return typeof browseId === "string" ? browseId : null
}

function extractTimedLyrics(payload: unknown): YouTubeMusicLyricsResult | null {
  const timedLyricsData = getNested(payload, [
    "contents",
    "elementRenderer",
    "newElement",
    "type",
    "componentType",
    "model",
    "timedLyricsData",
  ])

  if (!Array.isArray(timedLyricsData) || !timedLyricsData.length) {
    return null
  }

  const sourceMessage = getNested(payload, [
    "contents",
    "elementRenderer",
    "newElement",
    "type",
    "componentType",
    "model",
    "sourceMessage",
  ])

  const lyrics = timedLyricsData
    .map((line, index) => {
      const record = asRecord(line)
      const text = typeof record?.lyricLine === "string" ? record.lyricLine : ""
      const cueRange = asRecord(record?.cueRange)
      const startTime = Number(cueRange?.startTimeMilliseconds ?? 0)
      const endTime = Number(cueRange?.endTimeMilliseconds ?? 0)
      return {
        id: index + 1,
        text,
        startTime,
        endTime,
      }
    })
    .filter((line) => line.text || line.startTime || line.endTime)

  return {
    found: lyrics.length > 0,
    hasTimestamps: lyrics.length > 0,
    lyrics,
    source: typeof sourceMessage === "string" ? sourceMessage : null,
  }
}

function extractPlainLyrics(payload: unknown): YouTubeMusicLyricsResult {
  const lyrics = getNested(payload, [
    "contents",
    "sectionListRenderer",
    "contents",
    0,
    "musicDescriptionShelfRenderer",
    "description",
  ])
  const source = getNested(payload, [
    "contents",
    "sectionListRenderer",
    "contents",
    0,
    "musicDescriptionShelfRenderer",
    "footer",
  ])

  const text = textFromRuns(lyrics)
  return {
    found: Boolean(text),
    hasTimestamps: false,
    lyrics: text,
    source: textFromRuns(source),
  }
}

async function resolveLyrics(videoId: string): Promise<YouTubeMusicLyricsResult> {
  const watchPayload = await sendYouTubeMusicRequest("next", {
    enablePersistentPlaylistPanel: true,
    isAudioOnly: true,
    tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
    videoId,
    playlistId: `RDAMVM${videoId}`,
    watchEndpointMusicSupportedConfigs: {
      watchEndpointMusicConfig: {
        hasPersistentPlaylistPanel: true,
        musicVideoType: "MUSIC_VIDEO_TYPE_ATV",
      },
    },
  })

  const browseId = extractLyricsBrowseId(watchPayload)
  if (!browseId) {
    return {
      found: false,
      hasTimestamps: false,
      lyrics: null,
      source: null,
    }
  }

  try {
    const timedPayload = await sendYouTubeMusicRequest("browse", { browseId }, { useMobileClient: true })
    const timedLyrics = extractTimedLyrics(timedPayload)
    if (timedLyrics?.found) {
      return {
        ...timedLyrics,
        browseId,
      }
    }
  } catch {
    // Fall back to plain lyrics below.
  }

  const plainPayload = await sendYouTubeMusicRequest("browse", { browseId })
  return {
    ...extractPlainLyrics(plainPayload),
    browseId,
  }
}

export async function getYouTubeMusicLyrics(videoId: string): Promise<YouTubeMusicLyricsResult> {
  const cached = lyricsCache.get(videoId)
  if (cached) {
    return cached
  }

  const request = resolveLyrics(videoId).finally(() => {
    lyricsCache.delete(videoId)
  })
  lyricsCache.set(videoId, request)
  return request
}
