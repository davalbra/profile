import { NextResponse } from "next/server"
import { createAudioStreamResponse, ensureCachedYouTubeMusicAudio } from "@/lib/youtube-music-audio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseVideoId(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId")?.trim() || ""
  return videoId
}

export async function GET(request: Request) {
  try {
    const videoId = parseVideoId(request)
    if (!videoId) {
      return NextResponse.json({ error: "Falta videoId." }, { status: 400 })
    }

    const filePath = await ensureCachedYouTubeMusicAudio(videoId)
    return createAudioStreamResponse(request, filePath)
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo preparar el audio."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
