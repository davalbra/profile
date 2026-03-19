"use client"

import * as React from "react"
import { LoaderCircle, Search } from "lucide-react"
import type { YouTubeMusicSong } from "@/lib/youtube-music"
import type { YouTubeMusicSearchResult } from "@/lib/youtube-music-search"
import { MilkaPlayer } from "@/components/dashboard/milka-player"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type SearchState = {
  loading: boolean
  error: string | null
  results: YouTubeMusicSearchResult[]
}

export function MilkaSearchPanel() {
  const [query, setQuery] = React.useState("")
  const [syncedOnly, setSyncedOnly] = React.useState(true)
  const [state, setState] = React.useState<SearchState>({
    loading: false,
    error: null,
    results: [],
  })

  async function handleSearch(event?: React.FormEvent) {
    event?.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const url = new URL("/api/youtube-music/search", window.location.origin)
      url.searchParams.set("query", trimmedQuery)
      url.searchParams.set("limit", "10")
      if (syncedOnly) {
        url.searchParams.set("syncedOnly", "1")
      }

      const response = await fetch(url.toString(), { cache: "no-store" })
      const payload = (await response.json()) as {
        ok?: boolean
        data?: YouTubeMusicSearchResult[]
        error?: string
      }

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "No se pudo completar la busqueda.")
      }

      setState({
        loading: false,
        error: null,
        results: payload.data,
      })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo completar la busqueda.",
        results: [],
      })
    }
  }

  const playerSongs: YouTubeMusicSong[] = state.results.map((song) => ({
    videoId: song.videoId,
    title: song.title,
    artists: song.artists,
    album: song.album,
    duration: song.duration,
    thumbnailUrl: song.thumbnailUrl,
  }))

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Buscar Sync</CardTitle>
            <CardDescription>
              Busca en todo YouTube Music y filtra canciones con letra sincronizada, fuera de tus likes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca por cancion, artista o frase..."
              />
              <Button type="submit" disabled={state.loading || !query.trim()}>
                {state.loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                Buscar
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={syncedOnly ? "default" : "outline"}
                onClick={() => setSyncedOnly(true)}
              >
                Solo sincronizadas
              </Button>
              <Button
                type="button"
                variant={!syncedOnly ? "default" : "outline"}
                onClick={() => setSyncedOnly(false)}
              >
                Todas las encontradas
              </Button>
            </div>

            {state.error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {state.error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {state.results.length ? (
        <>
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Resultados</CardTitle>
                <CardDescription>
                  {state.results.length} canciones encontradas en el catalogo global.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.results.map((song) => (
                  <div
                    key={song.videoId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{song.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {song.artists.map((artist) => artist.name).join(", ") || "Sin artista"}
                      </p>
                      <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {song.album || "Sin album"} {song.duration ? `· ${song.duration}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {song.hasSyncedLyrics ? (
                        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Sync
                        </Badge>
                      ) : song.lyricsFound ? (
                        <Badge variant="secondary">Letra</Badge>
                      ) : (
                        <Badge variant="outline">Sin letra</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="px-4 lg:px-6">
            <MilkaPlayer songs={playerSongs} />
          </div>
        </>
      ) : query.trim() && !state.loading && !state.error ? (
        <div className="px-4 lg:px-6">
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No hubo resultados para ese criterio.
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
