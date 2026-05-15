import { jsonResponse } from "@/server/utils/json-response"
import {
  getYouTubeMusicLibrarySongs,
  YouTubeMusicConfigError,
} from "@/lib/youtube-music"

function parseLimit(request: Request) {
  const rawLimit = new URL(request.url).searchParams.get("limit")
  const parsedLimit = rawLimit ? Number(rawLimit) : 30

  if (!Number.isFinite(parsedLimit)) {
    return 30
  }

  return Math.min(Math.max(Math.trunc(parsedLimit), 1), 50)
}

export async function GET(request: Request) {
  try {
    const songs = await getYouTubeMusicLibrarySongs(parseLimit(request))
    return jsonResponse({ data: { songs } })
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo consultar la biblioteca de YouTube Music.",
        isConfigError: error instanceof YouTubeMusicConfigError,
      },
      { status: 500 },
    )
  }
}
