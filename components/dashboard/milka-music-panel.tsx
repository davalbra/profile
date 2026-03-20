import { AlertCircle, Cookie } from "lucide-react"
import { getYouTubeMusicLibrarySongs, type YouTubeMusicSong, YouTubeMusicConfigError } from "@/lib/youtube-music"
import { MilkaPlayer } from "@/components/dashboard/milka-player"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getStoredLyricsIndex, persistSongsMetadata, type StoredLyricsPayload } from "@/lib/lyrics-sync"

type LoadResult =
  | {
      songs: YouTubeMusicSong[]
      storedLyricsByVideoId: Record<string, StoredLyricsPayload>
      error: null
    }
  | {
      songs: null
      storedLyricsByVideoId: null
      error: {
        isConfigError: boolean
        message: string
      }
    }

async function loadSongs(): Promise<LoadResult> {
  try {
    const songs = await getYouTubeMusicLibrarySongs(30)
    let storedLyricsByVideoId: Record<string, StoredLyricsPayload> = {}

    try {
      await persistSongsMetadata(songs)
      storedLyricsByVideoId = await getStoredLyricsIndex(songs.map((song) => song.videoId))
    } catch (error) {
      console.error("No se pudo sincronizar la metadata musical con la base.", error)
    }

    return { songs, storedLyricsByVideoId, error: null }
  } catch (error) {
    return {
      songs: null,
      storedLyricsByVideoId: null,
      error: {
        isConfigError: error instanceof YouTubeMusicConfigError,
        message:
          error instanceof Error ? error.message : "No se pudo consultar la biblioteca de YouTube Music.",
      },
    }
  }
}

function MusicPanelError(props: { isConfigError: boolean; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Milka / Musica</CardTitle>
        <CardDescription>
          La base ya esta creada, pero falta terminar la configuracion privada del servidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          {props.isConfigError ? (
            <Cookie className="mt-0.5 size-5 text-amber-700" />
          ) : (
            <AlertCircle className="mt-0.5 size-5 text-amber-700" />
          )}
          <div className="space-y-1 text-sm">
            <p className="font-medium">No se pudo cargar la biblioteca.</p>
            <p className="text-muted-foreground">{props.message}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Variables esperadas</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>YTMUSIC_COOKIE obligatorio</li>
            <li>YTMUSIC_USER_AGENT opcional</li>
            <li>YTMUSIC_ACCOUNT_ID opcional para brand account</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function MusicPanelTable(props: {
  songs: YouTubeMusicSong[]
  storedLyricsByVideoId: Record<string, StoredLyricsPayload>
}) {
  return <MilkaPlayer songs={props.songs} initialLyricsByVideoId={props.storedLyricsByVideoId} />
}

export async function MilkaMusicPanel() {
  const result = await loadSongs()

  if (result.error) {
    return <MusicPanelError isConfigError={result.error.isConfigError} message={result.error.message} />
  }

  return <MusicPanelTable songs={result.songs} storedLyricsByVideoId={result.storedLyricsByVideoId} />
}
