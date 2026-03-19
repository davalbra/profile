import { createReadStream } from "node:fs"
import { mkdir, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
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

function createSafeWebStream(filePath: string, options?: { start?: number; end?: number }) {
  const source = createReadStream(filePath, options)
  let closed = false

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        source.off("data", onData)
        source.off("end", onEnd)
        source.off("error", onError)
        source.off("close", onClose)
      }

      const closeController = () => {
        if (closed) {
          return
        }
        closed = true
        cleanup()
        try {
          controller.close()
        } catch (error) {
          if (!(error instanceof TypeError && error.message.includes("Controller is already closed"))) {
            throw error
          }
        }
      }

      const onData = (chunk: string | Buffer) => {
        if (closed) {
          return
        }

        try {
          const data =
            chunk instanceof Uint8Array ? chunk : new Uint8Array(Buffer.from(chunk))
          controller.enqueue(data)
        } catch (error) {
          if (error instanceof TypeError && error.message.includes("Controller is already closed")) {
            closed = true
            cleanup()
            source.destroy()
            return
          }

          throw error
        }
      }

      const onEnd = () => {
        closeController()
      }

      const onClose = () => {
        if (!closed) {
          closeController()
        }
      }

      const onError = (error: Error) => {
        if (closed) {
          return
        }
        closed = true
        cleanup()
        controller.error(error)
      }

      source.on("data", onData)
      source.on("end", onEnd)
      source.on("error", onError)
      source.on("close", onClose)
    },
    cancel() {
      if (closed) {
        return
      }
      closed = true
      source.destroy()
    },
  })
}

export async function createAudioStreamResponse(request: Request, filePath: string) {
  const fileStats = await stat(filePath)
  const totalSize = fileStats.size
  const range = request.headers.get("range")
  const contentType = getAudioContentType(filePath)

  if (!range) {
    return new Response(createSafeWebStream(filePath), {
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
  return new Response(createSafeWebStream(filePath, { start, end }), {
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
