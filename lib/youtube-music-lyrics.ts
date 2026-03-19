import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const LOCAL_YT_MUSIC_PYTHON = path.join(process.cwd(), ".venv-ytdlp", "bin", "python")
const LYRICS_SCRIPT_PATH = path.join(process.cwd(), "scripts", "ytmusic_lyrics.py")
const lyricsCache = new Map<string, Promise<YouTubeMusicLyricsResult>>()

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

type ScriptSuccessPayload = {
  ok: true
  found: boolean
  hasTimestamps: boolean
  lyrics: string | TimedLyricLine[] | null
  source: string | null
  browseId?: string
}

type ScriptErrorPayload = {
  ok: false
  error: string
}

function parseLyricsPayload(stdout: string): ScriptSuccessPayload | ScriptErrorPayload {
  const trimmed = stdout.trim()
  if (!trimmed) {
    throw new Error("El script de letras no devolvio salida.")
  }

  return JSON.parse(trimmed) as ScriptSuccessPayload | ScriptErrorPayload
}

async function resolveLyrics(videoId: string): Promise<YouTubeMusicLyricsResult> {
  try {
    const { stdout } = await execFileAsync(LOCAL_YT_MUSIC_PYTHON, [LYRICS_SCRIPT_PATH, videoId], {
      env: process.env,
    })

    const payload = parseLyricsPayload(stdout)
    if (!payload.ok) {
      throw new Error(payload.error)
    }

    return {
      found: payload.found,
      hasTimestamps: payload.hasTimestamps,
      lyrics: payload.lyrics,
      source: payload.source,
      browseId: payload.browseId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener las letras."
    if (message.includes("ENOENT")) {
      throw new Error("Falta la venv local de YouTube Music. Verifica .venv-ytdlp.")
    }
    throw new Error(message)
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
