import { createReadStream } from "node:fs"
import { mkdir, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { Readable } from "node:stream"
import { getYouTubeMusicEnvConfig } from "@/lib/youtube-music"

const execFileAsync = promisify(execFile)
const AUDIO_CACHE_DIR = path.join(process.cwd(), ".cache", "ytmusic-audio")
const LOCAL_YT_DLP_PYTHON = path.join(process.cwd(), ".venv-ytdlp", "bin", "python")
const downloadLocks = new Map<string, Promise<string>>()

function getAudioContentType(filePath: string) {
  if (filePath.endsWith(".m4a") || filePath.endsWith(".mp4")) {
    return "audio/mp4"
  }
  if (filePath.endsWith(".webm")) {
    return "audio/webm"
  }
  if (filePath.endsWith(".mp3")) {
    return "audio/mpeg"
  }
  if (filePath.endsWith(".opus")) {
    return "audio/ogg"
  }

  return "application/octet-stream"
}

async function ensureCacheDir() {
  await mkdir(AUDIO_CACHE_DIR, { recursive: true })
}

async function findCachedAudioFile(videoId: string) {
  await ensureCacheDir()
  const entries = await readdir(AUDIO_CACHE_DIR)
  const match = entries.find((entry) => entry.startsWith(`${videoId}.`))
  return match ? path.join(AUDIO_CACHE_DIR, match) : null
}

async function runYtDlpDownload(videoId: string) {
  const env = getYouTubeMusicEnvConfig()

  try {
    await execFileAsync(LOCAL_YT_DLP_PYTHON, [
      "-m",
      "yt_dlp",
      "--no-playlist",
      "-f",
      "bestaudio",
      "--add-header",
      `Cookie: ${env.cookie}`,
      "--add-header",
      `User-Agent: ${env.userAgent}`,
      "--paths",
      AUDIO_CACHE_DIR,
      "-o",
      `${videoId}.%(ext)s`,
      `https://music.youtube.com/watch?v=${videoId}`,
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo ejecutar yt-dlp."
    if (message.includes("ENOENT") || message.includes("No module named yt_dlp")) {
      throw new Error("Falta yt-dlp local. Instala con: python3 -m venv .venv-ytdlp && ./.venv-ytdlp/bin/pip install yt-dlp")
    }
    throw new Error(`yt-dlp no pudo descargar el audio: ${message}`)
  }

  const downloadedFile = await findCachedAudioFile(videoId)
  if (!downloadedFile) {
    throw new Error("yt-dlp termino sin dejar un archivo de audio en cache.")
  }

  return downloadedFile
}

export async function ensureCachedYouTubeMusicAudio(videoId: string) {
  const cachedFile = await findCachedAudioFile(videoId)
  if (cachedFile) {
    return cachedFile
  }

  const existingLock = downloadLocks.get(videoId)
  if (existingLock) {
    return existingLock
  }

  const lock = runYtDlpDownload(videoId).finally(() => {
    downloadLocks.delete(videoId)
  })
  downloadLocks.set(videoId, lock)
  return lock
}

export async function createAudioStreamResponse(request: Request, filePath: string) {
  const fileStats = await stat(filePath)
  const totalSize = fileStats.size
  const range = request.headers.get("range")
  const contentType = getAudioContentType(filePath)

  if (!range) {
    const stream = createReadStream(filePath)
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Content-Length": String(totalSize),
        "Content-Type": contentType,
      },
    })
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range)
  if (!match) {
    return new Response("Range invalido.", { status: 416 })
  }

  const start = match[1] ? Number(match[1]) : 0
  const end = match[2] ? Number(match[2]) : totalSize - 1
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= totalSize) {
    return new Response("Range invalido.", { status: 416 })
  }

  const chunkSize = end - start + 1
  const stream = createReadStream(filePath, { start, end })
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      "Content-Type": contentType,
    },
  })
}
