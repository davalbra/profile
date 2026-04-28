import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { getYouTubeMusicEnvConfig } from "@/lib/youtube-music"

const execFileAsync = promisify(execFile)
const LOCAL_YT_DLP_PYTHON = ".venv-ytdlp/bin/python"
const captionsCache = new Map<string, Promise<YouTubeCaptionLyricsResult>>()

export type CaptionLyricLine = {
  text: string
  startMs: number
  endMs: number
}

export type YouTubeCaptionLyricsResult = {
  found: boolean
  language: string | null
  trackKind: "subtitles" | "automatic_captions" | null
  sourceLabel: string | null
  lines: CaptionLyricLine[]
}

type YtDlpTrack = {
  ext?: string
  url?: string
  name?: string
}

function normalizeCaptionText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

function cleanupCaptionLine(value: string) {
  const cleaned = normalizeCaptionText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")

  if (!cleaned) {
    return ""
  }

  if (/^\[[^\]]+\]$/.test(cleaned) || /^♪+$/.test(cleaned)) {
    return ""
  }

  return cleaned
}

function parseJson3Captions(raw: string): CaptionLyricLine[] {
  const parsed = JSON.parse(raw) as {
    events?: Array<{
      tStartMs?: number
      dDurationMs?: number
      segs?: Array<{ utf8?: string }>
    }>
  }

  const events = Array.isArray(parsed.events) ? parsed.events : []

  return events
    .map((event) => {
      const startMs = Number(event.tStartMs ?? 0)
      const durationMs = Number(event.dDurationMs ?? 0)
      const text = cleanupCaptionLine(
        Array.isArray(event.segs) ? event.segs.map((segment) => segment.utf8 || "").join("") : ""
      )

      if (!text || !Number.isFinite(startMs)) {
        return null
      }

      return {
        text,
        startMs,
        endMs: startMs + Math.max(durationMs, 0),
      }
    })
    .filter((line): line is CaptionLyricLine => line !== null)
}

function parseTimestampToMs(value: string) {
  const match = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/.exec(value.trim())
  if (!match) {
    return null
  }

  const [, hours, minutes, seconds, milliseconds] = match
  return (
    Number(hours) * 60 * 60 * 1000 +
    Number(minutes) * 60 * 1000 +
    Number(seconds) * 1000 +
    Number(milliseconds)
  )
}

function parseVttCaptions(raw: string): CaptionLyricLine[] {
  const normalized = raw.replace(/\r/g, "").replace(/^WEBVTT\s*\n+/i, "")
  const blocks = normalized.split(/\n{2,}/g)

  return blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)

      const timingLineIndex = lines.findIndex((line) => line.includes("-->"))
      if (timingLineIndex < 0) {
        return null
      }

      const timingLine = lines[timingLineIndex]
      const [rawStart, rawEnd] = timingLine.split("-->").map((part) => part.trim().split(" ")[0] || "")
      const startMs = parseTimestampToMs(rawStart)
      const endMs = parseTimestampToMs(rawEnd)
      const text = cleanupCaptionLine(lines.slice(timingLineIndex + 1).join("\n"))

      if (!text || startMs === null) {
        return null
      }

      return {
        text,
        startMs,
        endMs: endMs ?? startMs,
      }
    })
    .filter((line): line is CaptionLyricLine => line !== null)
}

function dedupeCaptionLines(lines: CaptionLyricLine[]) {
  const result: CaptionLyricLine[] = []

  for (const line of lines) {
    const previous = result[result.length - 1]
    if (previous && previous.text === line.text && Math.abs(previous.startMs - line.startMs) < 300) {
      previous.endMs = Math.max(previous.endMs, line.endMs)
      continue
    }

    result.push({ ...line })
  }

  return result
}

function pickTrack(
  groups: Record<string, unknown> | null | undefined
): { language: string; track: YtDlpTrack; trackKind: "subtitles" | "automatic_captions" } | null {
  if (!groups) {
    return null
  }

  const languagePriority = ["es", "es-419", "en", "en-US", "en-GB"]
  const languages = Object.keys(groups)
  if (!languages.length) {
    return null
  }

  const orderedLanguages = [
    ...languagePriority.filter((language) => languages.includes(language)),
    ...languages.filter((language) => !languagePriority.includes(language)).sort(),
  ]

  for (const language of orderedLanguages) {
    const tracks = Array.isArray(groups[language]) ? (groups[language] as YtDlpTrack[]) : []
    const preferredTrack =
      tracks.find((track) => track.ext === "json3" && typeof track.url === "string") ||
      tracks.find((track) => track.ext === "vtt" && typeof track.url === "string") ||
      tracks.find((track) => typeof track.url === "string")

    if (preferredTrack) {
      return {
        language,
        track: preferredTrack,
        trackKind: "subtitles",
      }
    }
  }

  return null
}

function pickBestCaptionTrack(payload: Record<string, unknown>) {
  const subtitles = (payload.subtitles as Record<string, unknown> | undefined) || null
  const automaticCaptions = (payload.automatic_captions as Record<string, unknown> | undefined) || null

  const manualTrack = pickTrack(subtitles)
  if (manualTrack) {
    return manualTrack
  }

  const automaticTrack = pickTrack(automaticCaptions)
  if (!automaticTrack) {
    return null
  }

  return {
    ...automaticTrack,
    trackKind: "automatic_captions" as const,
  }
}

async function fetchCaptionTrack(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": getYouTubeMusicEnvConfig().userAgent,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`No se pudo descargar la pista de captions (${response.status}).`)
  }

  return response.text()
}

async function resolveYouTubeCaptionLyrics(videoId: string): Promise<YouTubeCaptionLyricsResult> {
  const env = getYouTubeMusicEnvConfig()
  const { stdout } = await execFileAsync(LOCAL_YT_DLP_PYTHON, [
    "-m",
    "yt_dlp",
    "--dump-single-json",
    "--skip-download",
    "--no-playlist",
    "--add-header",
    `Cookie: ${env.cookie}`,
    "--add-header",
    `User-Agent: ${env.userAgent}`,
    `https://www.youtube.com/watch?v=${videoId}`,
  ])

  const payload = JSON.parse(stdout) as Record<string, unknown>
  const selectedTrack = pickBestCaptionTrack(payload)
  if (!selectedTrack?.track.url) {
    return {
      found: false,
      language: null,
      trackKind: null,
      sourceLabel: null,
      lines: [],
    }
  }

  const rawTrack = await fetchCaptionTrack(selectedTrack.track.url)
  const lines = dedupeCaptionLines(
    selectedTrack.track.ext === "json3" ? parseJson3Captions(rawTrack) : parseVttCaptions(rawTrack)
  )

  return {
    found: lines.length > 0,
    language: selectedTrack.language,
    trackKind: selectedTrack.trackKind,
    sourceLabel:
      selectedTrack.trackKind === "subtitles"
        ? `YouTube captions (${selectedTrack.language})`
        : `YouTube auto-captions (${selectedTrack.language})`,
    lines,
  }
}

export async function getYouTubeCaptionLyrics(videoId: string): Promise<YouTubeCaptionLyricsResult> {
  const cached = captionsCache.get(videoId)
  if (cached) {
    return cached
  }

  const request = resolveYouTubeCaptionLyrics(videoId).finally(() => {
    captionsCache.delete(videoId)
  })
  captionsCache.set(videoId, request)
  return request
}
