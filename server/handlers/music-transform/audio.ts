import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { jsonResponse } from "@/server/utils/json-response"
import { ensureSlowReverbTransform } from "@/lib/music-transform"
import { createAudioStreamResponse } from "@/lib/youtube-music-audio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UPLOAD_CACHE_DIR = path.join(
  process.cwd(),
  ".cache",
  "music-transform-uploads",
)
const MAX_UPLOAD_BYTES = 80 * 1024 * 1024
const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  ".aac",
  ".flac",
  ".m4a",
  ".mp3",
  ".mp4",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
])

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File
}

function getSafeExtension(fileName: string, contentType: string) {
  const extension = path.extname(fileName).toLowerCase()
  if (SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    return extension
  }

  if (contentType === "audio/mpeg") {
    return ".mp3"
  }
  if (contentType === "audio/mp4" || contentType === "audio/aac") {
    return ".m4a"
  }
  if (contentType === "audio/wav" || contentType === "audio/x-wav") {
    return ".wav"
  }
  if (contentType === "audio/webm") {
    return ".webm"
  }
  if (contentType === "audio/ogg") {
    return ".ogg"
  }
  if (contentType === "audio/flac" || contentType === "audio/x-flac") {
    return ".flac"
  }

  return ".audio"
}

function isSupportedAudio(fileName: string, contentType: string) {
  const extension = path.extname(fileName).toLowerCase()
  return (
    contentType.startsWith("audio/") ||
    SUPPORTED_AUDIO_EXTENSIONS.has(extension)
  )
}

function parsePreset(formData: FormData) {
  const preset = String(formData.get("preset") || "slow-reverb").trim()
  return preset || "slow-reverb"
}

export async function POST(request: Request) {
  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return jsonResponse(
        { error: "La peticion debe ser multipart/form-data." },
        { status: 400 },
      )
    }

    const file = formData.get("file")
    const preset = parsePreset(formData)

    if (preset !== "slow-reverb") {
      return jsonResponse({ error: "Preset no soportado." }, { status: 400 })
    }

    if (!isUploadFile(file)) {
      return jsonResponse({ error: "Falta archivo de audio." }, { status: 400 })
    }

    const fileName = file.name || "audio"
    const contentType = file.type || ""
    const declaredSize = file.size

    if (declaredSize > MAX_UPLOAD_BYTES) {
      return jsonResponse(
        { error: "El archivo supera el limite de 80 MB." },
        { status: 413 },
      )
    }

    if (!isSupportedAudio(fileName, contentType)) {
      return jsonResponse(
        { error: "Formato de audio no soportado." },
        { status: 415 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!buffer.length) {
      return jsonResponse({ error: "El archivo esta vacio." }, { status: 400 })
    }

    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return jsonResponse(
        { error: "El archivo supera el limite de 80 MB." },
        { status: 413 },
      )
    }

    const sourceKey = createHash("sha256").update(buffer).digest("hex")
    const extension = getSafeExtension(fileName, contentType)
    await mkdir(UPLOAD_CACHE_DIR, { recursive: true })
    const sourceFilePath = path.join(UPLOAD_CACHE_DIR, `${sourceKey}${extension}`)
    await writeFile(sourceFilePath, buffer, { mode: 0o600 })

    const transform = await ensureSlowReverbTransform(sourceFilePath, sourceKey, {
      speed: formData.get("speed")?.toString(),
      reverb: formData.get("reverb")?.toString(),
    })

    return createAudioStreamResponse(request, transform.filePath)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo transformar el archivo."
    return jsonResponse({ error: message }, { status: 500 })
  }
}
