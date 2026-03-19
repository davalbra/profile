import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { YouTubeMusicSong } from "@/lib/youtube-music"
import { getYouTubeMusicLyrics } from "@/lib/youtube-music-lyrics"

const execFileAsync = promisify(execFile)
const LOCAL_YT_MUSIC_PYTHON = path.join(process.cwd(), ".venv-ytdlp", "bin", "python")
const SEARCH_SCRIPT_PATH = path.join(process.cwd(), "scripts", "ytmusic_search.py")

type SearchScriptPayload = {
  ok: boolean
  error?: string
  songs?: YouTubeMusicSong[]
}

export type YouTubeMusicSearchResult = YouTubeMusicSong & {
  lyricsFound?: boolean
  hasSyncedLyrics?: boolean
}

async function runSearchScript(query: string, limit: number) {
  const { stdout } = await execFileAsync(LOCAL_YT_MUSIC_PYTHON, [SEARCH_SCRIPT_PATH, query, String(limit)], {
    env: process.env,
  })

  const payload = JSON.parse(stdout.trim()) as SearchScriptPayload
  if (!payload.ok) {
    throw new Error(payload.error || "No se pudo buscar en YouTube Music.")
  }

  return payload.songs || []
}

export async function searchYouTubeMusicSongs(input: {
  query: string
  limit?: number
  syncedOnly?: boolean
}) {
  const limit = Math.max(1, Math.min(20, input.limit || 12))
  const songs = await runSearchScript(input.query, limit)

  const withLyricsState = await Promise.all(
    songs.map(async (song) => {
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

  if (input.syncedOnly) {
    return withLyricsState.filter((song) => song.hasSyncedLyrics)
  }

  return withLyricsState
}
