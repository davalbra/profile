"use client"

import * as React from "react"
import Image from "next/image"
import { AudioLines, LoaderCircle, Music4, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import type { YouTubeMusicSong } from "@/lib/youtube-music"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function renderArtists(artists: Array<{ name: string; id?: string | null }>) {
  if (!artists.length) {
    return "Sin artista"
  }

  return artists.map((artist) => artist.name).join(", ")
}

type TimedLyricLine = {
  text: string
  startTime: number
  endTime: number
  id: number
}

type LyricsPayload = {
  found: boolean
  hasTimestamps: boolean
  lyrics: string | TimedLyricLine[] | null
  source: string | null
}

type QueueFilter = "all" | "synced" | "lyrics" | "no-lyrics"

export function MilkaPlayer(props: { songs: YouTubeMusicSong[] }) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [autoPlay, setAutoPlay] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTimeMs, setCurrentTimeMs] = React.useState(0)
  const [lyricsByVideoId, setLyricsByVideoId] = React.useState<Record<string, LyricsPayload | undefined>>({})
  const [lyricsLoadingVideoId, setLyricsLoadingVideoId] = React.useState<string | null>(null)
  const [lyricsError, setLyricsError] = React.useState<string | null>(null)
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>("all")
  const [isScanningLyrics, setIsScanningLyrics] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const currentSong = props.songs[selectedIndex] || null
  const currentAudioUrl = currentSong
    ? `/api/youtube-music/audio?videoId=${encodeURIComponent(currentSong.videoId)}`
    : ""

  React.useEffect(() => {
    if (selectedIndex >= props.songs.length && props.songs.length > 0) {
      setSelectedIndex(0)
    }
  }, [props.songs.length, selectedIndex])

  React.useEffect(() => {
    if (!currentSong) {
      return
    }

    const cachedLyrics = lyricsByVideoId[currentSong.videoId]
    if (cachedLyrics) {
      return
    }

    const controller = new AbortController()
    setLyricsLoadingVideoId(currentSong.videoId)
    setLyricsError(null)

    fetch(`/api/youtube-music/lyrics?videoId=${encodeURIComponent(currentSong.videoId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { ok?: boolean; data?: LyricsPayload; error?: string }
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "No se pudieron obtener las letras.")
        }
        setLyricsByVideoId((current) => ({
          ...current,
          [currentSong.videoId]: payload.data,
        }))
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        setLyricsError(error instanceof Error ? error.message : "No se pudieron obtener las letras.")
      })
      .finally(() => {
        setLyricsLoadingVideoId((current) => (current === currentSong.videoId ? null : current))
      })

    return () => controller.abort()
  }, [currentSong, lyricsByVideoId])

  React.useEffect(() => {
    let cancelled = false

    async function scanLyricsAvailability() {
      const pendingSongs = props.songs.filter((song) => !lyricsByVideoId[song.videoId])
      if (!pendingSongs.length) {
        return
      }

      setIsScanningLyrics(true)

      for (const song of pendingSongs) {
        if (cancelled) {
          return
        }

        try {
          const response = await fetch(`/api/youtube-music/lyrics?videoId=${encodeURIComponent(song.videoId)}`, {
            cache: "no-store",
          })
          const payload = (await response.json()) as { ok?: boolean; data?: LyricsPayload }
          if (!response.ok || !payload.data) {
            continue
          }

          if (cancelled) {
            return
          }

          setLyricsByVideoId((current) => {
            if (current[song.videoId]) {
              return current
            }

            return {
              ...current,
              [song.videoId]: payload.data,
            }
          })
        } catch {
          continue
        }
      }

      if (!cancelled) {
        setIsScanningLyrics(false)
      }
    }

    void scanLyricsAvailability()

    return () => {
      cancelled = true
    }
  }, [lyricsByVideoId, props.songs])

  if (!currentSong) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Milka / Musica</CardTitle>
          <CardDescription>No hay canciones disponibles para reproducir.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  function goToIndex(nextIndex: number) {
    if (!props.songs.length) {
      return
    }

    const wrappedIndex = (nextIndex + props.songs.length) % props.songs.length
    setSelectedIndex(wrappedIndex)
    setAutoPlay(true)
    setLoadError(null)
  }

  const currentLyrics = lyricsByVideoId[currentSong.videoId]
  const isLyricsLoading = lyricsLoadingVideoId === currentSong.videoId
  const activeTimedLine =
    currentLyrics?.hasTimestamps && Array.isArray(currentLyrics.lyrics)
      ? currentLyrics.lyrics.find(
          (line) => currentTimeMs >= line.startTime && currentTimeMs < (line.endTime || line.startTime + 3000)
        ) || null
      : null
  const filteredSongs = props.songs.filter((song) => {
    const lyricsState = lyricsByVideoId[song.videoId]

    if (queueFilter === "all") {
      return true
    }
    if (!lyricsState) {
      return false
    }
    if (queueFilter === "synced") {
      return lyricsState.hasTimestamps
    }
    if (queueFilter === "lyrics") {
      return lyricsState.found
    }
    return !lyricsState.found
  })

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Milka / Musica</CardTitle>
              <CardDescription>
                Reproduccion local servida por tu backend, con audio cacheado en disco a partir de YouTube Music.
              </CardDescription>
            </div>
            <Badge variant="secondary">{props.songs.length} canciones</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-5 text-white">
            <div className="flex flex-wrap items-center gap-4">
              {currentSong.thumbnailUrl ? (
                <Image
                  src={currentSong.thumbnailUrl}
                  alt={currentSong.title}
                  width={88}
                  height={88}
                  className="rounded-xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Music4 className="size-6 text-white/60" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-semibold">{currentSong.title}</p>
                  {currentLyrics?.found ? (
                    currentLyrics.hasTimestamps ? (
                      <Badge className="border-emerald-400/30 bg-emerald-400/15 text-emerald-100">
                        <AudioLines className="size-3.5" />
                        Letra sincronizada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Con letra</Badge>
                    )
                  ) : null}
                  {isLyricsLoading ? (
                    <Badge variant="secondary">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Buscando letra
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm text-white/70">{renderArtists(currentSong.artists)}</p>
                <p className="truncate text-xs uppercase tracking-[0.18em] text-white/50">
                  {currentSong.album || "Sin album"} {currentSong.duration ? `· ${currentSong.duration}` : ""}
                </p>
              </div>
            </div>

            <audio
              key={currentSong.videoId}
              ref={audioRef}
              className="mt-5 w-full"
              controls
              autoPlay={autoPlay}
              preload="metadata"
              src={currentAudioUrl}
              onEnded={() => goToIndex(selectedIndex + 1)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setCurrentTimeMs(Math.floor(event.currentTarget.currentTime * 1000))}
              onError={() =>
                setLoadError(
                  "No se pudo cargar el audio. Revisa que yt-dlp este instalado y que la cookie siga vigente."
                )
              }
              onLoadedData={() => setLoadError(null)}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => goToIndex(selectedIndex - 1)}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                <SkipBack className="size-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current?.paused) {
                    void audioRef.current.play()
                  } else {
                    audioRef.current?.pause()
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                Play / Pause
              </button>
              <button
                type="button"
                onClick={() => goToIndex(selectedIndex + 1)}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                <SkipForward className="size-4" />
                Siguiente
              </button>
            </div>

            {loadError ? (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                {loadError}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Letras</CardTitle>
              <CardDescription>Se muestran debajo del reproductor y resaltan en tiempo real cuando hay sincronizacion.</CardDescription>
            </div>
            {currentLyrics?.hasTimestamps ? (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <AudioLines className="size-3.5" />
                Sincronizada
              </Badge>
            ) : currentLyrics?.found ? (
              <Badge variant="secondary">No sincronizada</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-muted/20 p-4">
            {isLyricsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Cargando letras...
              </div>
            ) : lyricsError ? (
              <div className="text-sm text-destructive">{lyricsError}</div>
            ) : !currentLyrics?.found ? (
              <div className="text-sm text-muted-foreground">Esta cancion no tiene letras disponibles.</div>
            ) : currentLyrics.hasTimestamps && Array.isArray(currentLyrics.lyrics) ? (
              <div className="space-y-1">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Letra sincronizada
                  </Badge>
                  {currentLyrics.source ? (
                    <span className="text-xs text-muted-foreground">{currentLyrics.source}</span>
                  ) : null}
                </div>
                <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                  {currentLyrics.lyrics.map((line) => {
                    const isActiveLine = activeTimedLine?.id === line.id
                    return (
                      <p
                        key={line.id}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm transition",
                          isActiveLine
                            ? "bg-emerald-500/12 font-medium text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground"
                        )}
                      >
                        {line.text || "♪"}
                      </p>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">Letra no sincronizada</Badge>
                  {currentLyrics.source ? (
                    <span className="text-xs text-muted-foreground">{currentLyrics.source}</span>
                  ) : null}
                </div>
                <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">
                  {typeof currentLyrics.lyrics === "string" ? currentLyrics.lyrics : ""}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Cola</CardTitle>
              <CardDescription>Filtra por canciones con letra sincronizada, letra normal o sin letra.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQueueFilter("all")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  queueFilter === "all" ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent"
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("synced")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  queueFilter === "synced" ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent"
                )}
              >
                Sync
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("lyrics")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  queueFilter === "lyrics" ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent"
                )}
              >
                Con letra
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("no-lyrics")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  queueFilter === "no-lyrics" ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent"
                )}
              >
                Sin letra
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isScanningLyrics ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              Escaneando disponibilidad de letras...
            </div>
          ) : null}

          {!filteredSongs.length ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              No hay canciones que coincidan con el filtro actual.
            </div>
          ) : null}

          {filteredSongs.map((song) => {
            const index = props.songs.findIndex((item) => item.videoId === song.videoId)
            const isActive = index === selectedIndex
            const knownLyrics = lyricsByVideoId[song.videoId]

            return (
              <button
                key={song.videoId}
                type="button"
                onClick={() => goToIndex(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-accent",
                  isActive && "border-primary bg-primary/5"
                )}
              >
                {song.thumbnailUrl ? (
                  <Image
                    src={song.thumbnailUrl}
                    alt={song.title}
                    width={56}
                    height={56}
                    className="rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border bg-muted">
                    <Music4 className="size-4 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{song.title}</p>
                    {knownLyrics?.hasTimestamps ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{renderArtists(song.artists)}</p>
                  <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {song.album || "Sin album"} {song.duration ? `· ${song.duration}` : ""}
                  </p>
                </div>

                <div className="shrink-0">
                  {isActive ? (
                    <Badge>Activa</Badge>
                  ) : knownLyrics?.hasTimestamps ? (
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Sync
                    </Badge>
                  ) : knownLyrics?.found ? (
                    <Badge variant="secondary">Letra</Badge>
                  ) : (
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cargar</span>
                  )}
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
