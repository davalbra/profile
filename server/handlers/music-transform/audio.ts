import { jsonResponse } from "@/server/utils/json-response"
import {
  ensureSlowReverbTransform,
  isSafeMusicVideoId,
  normalizeSlowReverbOptions,
} from "@/lib/music-transform"
import { createAudioStreamResponse } from "@/lib/youtube-music-audio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseRequest(request: Request) {
  const params = new URL(request.url).searchParams
  const videoId = params.get("videoId")?.trim() || ""
  const preset = params.get("preset")?.trim() || "slow-reverb"

  return {
    videoId,
    preset,
    options: normalizeSlowReverbOptions({
      speed: params.get("speed"),
      reverb: params.get("reverb"),
    }),
  }
}

export async function GET(request: Request) {
  try {
    const parsed = parseRequest(request)

    if (!parsed.videoId) {
      return jsonResponse({ error: "Falta videoId." }, { status: 400 })
    }

    if (!isSafeMusicVideoId(parsed.videoId)) {
      return jsonResponse({ error: "videoId invalido." }, { status: 400 })
    }

    if (parsed.preset !== "slow-reverb") {
      return jsonResponse({ error: "Preset no soportado." }, { status: 400 })
    }

    const transform = await ensureSlowReverbTransform(
      parsed.videoId,
      parsed.options,
    )
    return createAudioStreamResponse(request, transform.filePath)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo preparar la version transformada."
    return jsonResponse({ error: message }, { status: 500 })
  }
}
