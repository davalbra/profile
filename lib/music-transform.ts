import { execFile } from "node:child_process"
import { mkdir, rename, rm, stat } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { ensureCachedYouTubeMusicAudio } from "@/lib/youtube-music-audio"

const execFileAsync = promisify(execFile)
const TRANSFORM_CACHE_DIR = path.join(
  process.cwd(),
  ".cache",
  "music-transforms",
)
const SLOW_REVERB_PRESET = "slow-reverb"
const SAMPLE_RATE = 44100

const transformLocks = new Map<string, Promise<MusicTransformResult>>()

export type MusicTransformPreset = typeof SLOW_REVERB_PRESET

export type SlowReverbOptions = {
  speed: number
  reverb: number
}

export type SlowReverbInput = {
  speed?: number | string | null
  reverb?: number | string | null
}

export type MusicTransformResult = {
  filePath: string
  preset: MusicTransformPreset
  videoId: string
  speed: number
  reverb: number
}

export const slowReverbDefaults = {
  speed: 0.85,
  reverb: 0.6,
}

export const slowReverbLimits = {
  speed: {
    min: 0.7,
    max: 0.95,
  },
  reverb: {
    min: 0,
    max: 1,
  },
}

export function isSafeMusicVideoId(videoId: string) {
  return /^[A-Za-z0-9_-]{6,64}$/.test(videoId)
}

function parseNumber(
  value: number | string | null | undefined,
  fallback: number,
) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toTwoDecimals(value: number) {
  return Math.round(value * 100) / 100
}

export function normalizeSlowReverbOptions(
  input: SlowReverbInput = {},
): SlowReverbOptions {
  return {
    speed: toTwoDecimals(
      clamp(
        parseNumber(input.speed, slowReverbDefaults.speed),
        slowReverbLimits.speed.min,
        slowReverbLimits.speed.max,
      ),
    ),
    reverb: toTwoDecimals(
      clamp(
        parseNumber(input.reverb, slowReverbDefaults.reverb),
        slowReverbLimits.reverb.min,
        slowReverbLimits.reverb.max,
      ),
    ),
  }
}

function getTransformKey(videoId: string, options: SlowReverbOptions) {
  return `${videoId}:${SLOW_REVERB_PRESET}:${options.speed.toFixed(2)}:${options.reverb.toFixed(2)}`
}

function getOutputFileName(options: SlowReverbOptions) {
  const speedKey = String(Math.round(options.speed * 100)).padStart(3, "0")
  const reverbKey = String(Math.round(options.reverb * 100)).padStart(3, "0")
  return `${SLOW_REVERB_PRESET}-speed-${speedKey}-reverb-${reverbKey}.m4a`
}

async function ensureTransformDir(videoId: string) {
  const transformDir = path.join(TRANSFORM_CACHE_DIR, videoId)
  await mkdir(transformDir, { recursive: true })
  return transformDir
}

async function fileExists(filePath: string) {
  try {
    const fileStats = await stat(filePath)
    return fileStats.isFile() && fileStats.size > 0
  } catch {
    return false
  }
}

function getTempOutputPath(outputFilePath: string) {
  const extension = path.extname(outputFilePath)
  const basename = path.basename(outputFilePath, extension)
  return path.join(
    path.dirname(outputFilePath),
    `.${basename}-${process.pid}-${Date.now()}.tmp${extension}`,
  )
}

function getFfmpegCommand() {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg"
}

function buildReverbFilter(reverb: number) {
  if (reverb <= 0) {
    return null
  }

  const delayA = Math.round(70 + reverb * 120)
  const delayB = Math.round(130 + reverb * 210)
  const delayC = Math.round(230 + reverb * 320)
  const decayA = (0.12 + reverb * 0.36).toFixed(2)
  const decayB = (0.08 + reverb * 0.26).toFixed(2)
  const decayC = (0.05 + reverb * 0.18).toFixed(2)

  return `aecho=0.8:0.88:${delayA}|${delayB}|${delayC}:${decayA}|${decayB}|${decayC}`
}

function buildSlowReverbFilter(options: SlowReverbOptions) {
  const slowedSampleRate = Math.max(
    8000,
    Math.round(SAMPLE_RATE * options.speed),
  )
  const filters = [
    `aresample=${SAMPLE_RATE}`,
    `asetrate=${slowedSampleRate}`,
    `aresample=${SAMPLE_RATE}`,
    buildReverbFilter(options.reverb),
    "volume=0.95",
  ]

  return filters.filter(Boolean).join(",")
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === "string" ? code : null
  }

  return null
}

function getProcessErrorDetail(error: unknown) {
  if (typeof error === "object" && error !== null && "stderr" in error) {
    const stderr = (error as { stderr?: unknown }).stderr
    if (typeof stderr === "string" && stderr.trim()) {
      return stderr.trim()
    }
  }

  return error instanceof Error ? error.message : "Error desconocido."
}

async function runSlowReverbTransform(
  videoId: string,
  options: SlowReverbOptions,
  outputFilePath: string,
) {
  const sourceFilePath = await ensureCachedYouTubeMusicAudio(videoId)
  const tempOutputPath = getTempOutputPath(outputFilePath)
  const ffmpegCommand = getFfmpegCommand()
  await rm(tempOutputPath, { force: true })

  try {
    await execFileAsync(
      ffmpegCommand,
      [
        "-hide_banner",
        "-y",
        "-i",
        sourceFilePath,
        "-vn",
        "-filter:a",
        buildSlowReverbFilter(options),
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        tempOutputPath,
      ],
      { maxBuffer: 1024 * 1024 * 8 },
    )

    await rename(tempOutputPath, outputFilePath)
  } catch (error) {
    await rm(tempOutputPath, { force: true }).catch(() => undefined)

    if (getErrorCode(error) === "ENOENT") {
      throw new Error(
        "Falta ffmpeg en el entorno. Instala ffmpeg del sistema o define FFMPEG_PATH.",
      )
    }

    throw new Error(
      `ffmpeg no pudo transformar el audio: ${getProcessErrorDetail(error).slice(0, 600)}`,
    )
  }
}

export async function ensureSlowReverbTransform(
  videoId: string,
  input: SlowReverbInput = {},
) {
  const trimmedVideoId = videoId.trim()
  if (!isSafeMusicVideoId(trimmedVideoId)) {
    throw new Error("videoId invalido.")
  }

  const options = normalizeSlowReverbOptions(input)
  const transformDir = await ensureTransformDir(trimmedVideoId)
  const outputFilePath = path.join(transformDir, getOutputFileName(options))

  const result: MusicTransformResult = {
    filePath: outputFilePath,
    preset: SLOW_REVERB_PRESET,
    videoId: trimmedVideoId,
    speed: options.speed,
    reverb: options.reverb,
  }

  if (await fileExists(outputFilePath)) {
    return result
  }

  const transformKey = getTransformKey(trimmedVideoId, options)
  const existingLock = transformLocks.get(transformKey)
  if (existingLock) {
    return existingLock
  }

  const lock = runSlowReverbTransform(trimmedVideoId, options, outputFilePath)
    .then(() => result)
    .finally(() => {
      transformLocks.delete(transformKey)
    })

  transformLocks.set(transformKey, lock)
  return lock
}
