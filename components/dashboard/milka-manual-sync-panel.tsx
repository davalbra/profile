"use client"

import * as React from "react"
import { Check, LoaderCircle, RotateCcw, Save } from "lucide-react"
import type { YouTubeMusicSong } from "@/lib/youtube-music"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
  storage?: {
    setId: string
    source: string
    isOfficial: boolean
    isActive: boolean
    status: string
    updatedAt: string
  }
}

type ManualSegment = {
  text: string
  startMs: number
  endMs: number
  clickMs: number | null
}

function formatMs(ms: number | null | undefined) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return "--:--.---"
  }

  const totalMs = Math.max(0, Math.floor(ms))
  const minutes = Math.floor(totalMs / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const millis = totalMs % 1000

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

function parseSegmentsFromText(value: string) {
  return value
    .split(/\n\s*\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function buildDraftFromLyrics(lyrics?: LyricsPayload) {
  if (!lyrics?.found) {
    return {
      draftText: "",
      songStartMs: null as number | null,
      syncedSegments: [] as ManualSegment[],
    }
  }

  if (lyrics.hasTimestamps && Array.isArray(lyrics.lyrics)) {
    return {
      draftText: lyrics.lyrics.map((line) => line.text.trim()).filter(Boolean).join("\n\n"),
      songStartMs: lyrics.lyrics[0]?.startTime ?? null,
      syncedSegments: lyrics.lyrics
        .map((line) => ({
          text: line.text.trim(),
          startMs: line.startTime,
          endMs: line.endTime,
          clickMs: line.endTime,
        }))
        .filter((segment) => segment.text),
    }
  }

  if (typeof lyrics.lyrics === "string") {
    return {
      draftText: lyrics.lyrics.trim(),
      songStartMs: null as number | null,
      syncedSegments: [] as ManualSegment[],
    }
  }

  return {
    draftText: "",
    songStartMs: null as number | null,
    syncedSegments: [] as ManualSegment[],
  }
}

export function MilkaManualSyncPanel(props: {
  song: YouTubeMusicSong
  lyrics?: LyricsPayload
  currentTimeMs: number
  onSeek: (ms: number) => void
  onSaved: (lyrics: LyricsPayload) => void
}) {
  const latestLyricsRef = React.useRef(props.lyrics)
  const [draftText, setDraftText] = React.useState("")
  const [songStartMs, setSongStartMs] = React.useState<number | null>(null)
  const [syncedSegments, setSyncedSegments] = React.useState<ManualSegment[]>([])
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasLocalChanges, setHasLocalChanges] = React.useState(false)

  latestLyricsRef.current = props.lyrics

  React.useEffect(() => {
    const initialState = buildDraftFromLyrics(latestLyricsRef.current)
    setDraftText(initialState.draftText)
    setSongStartMs(initialState.songStartMs)
    setSyncedSegments(initialState.syncedSegments)
    setSaveError(null)
    setSaveSuccess(null)
    setHasLocalChanges(false)
  }, [props.song.videoId])

  React.useEffect(() => {
    if (hasLocalChanges) {
      return
    }

    const initialState = buildDraftFromLyrics(props.lyrics)
    if (initialState.draftText && !draftText.trim()) {
      setDraftText(initialState.draftText)
    }
    if (initialState.songStartMs !== null && songStartMs === null) {
      setSongStartMs(initialState.songStartMs)
    }
    if (initialState.syncedSegments.length && !syncedSegments.length) {
      setSyncedSegments(initialState.syncedSegments)
    }
  }, [props.lyrics, hasLocalChanges, draftText, songStartMs, syncedSegments.length])

  const parsedSegments = parseSegmentsFromText(draftText)
  const nextSegmentIndex = syncedSegments.length
  const nextSegmentText = parsedSegments[nextSegmentIndex] || null
  const canMarkStart = parsedSegments.length > 0
  const canMarkNext = songStartMs !== null && nextSegmentIndex < parsedSegments.length
  const isReadyToSave = songStartMs !== null && parsedSegments.length > 0 && syncedSegments.length === parsedSegments.length

  async function handleSaveManualSync() {
    if (!isReadyToSave) {
      setSaveError("Completa el inicio y marca el final de todas las estrofas antes de guardar.")
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const response = await fetch("/api/youtube-music/lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          song: props.song,
          manualSync: {
            songStartMs,
            songEndMs: syncedSegments[syncedSegments.length - 1]?.endMs ?? songStartMs,
            plainText: draftText,
            segments: syncedSegments,
          },
        }),
      })

      const payload = (await response.json()) as { ok?: boolean; data?: LyricsPayload; error?: string }
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "No se pudo guardar la sincronizacion manual.")
      }

      props.onSaved(payload.data)

      const savedState = buildDraftFromLyrics(payload.data)
      setDraftText(savedState.draftText)
      setSongStartMs(savedState.songStartMs)
      setSyncedSegments(savedState.syncedSegments)
      setHasLocalChanges(false)
      setSaveSuccess("Sincronizacion manual guardada en base.")
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la sincronizacion manual.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleDraftChange(value: string) {
    const nextSegments = parseSegmentsFromText(value)

    setDraftText(value)
    setSaveError(null)
    setSaveSuccess(null)
    setHasLocalChanges(true)
    setSyncedSegments((current) =>
      current.filter((segment, index) => nextSegments[index] && nextSegments[index] === segment.text)
    )
  }

  function handleMarkSongStart() {
    if (!canMarkStart) {
      setSaveError("Escribe o carga la letra antes de marcar el inicio.")
      return
    }

    setSongStartMs(props.currentTimeMs)
    setSyncedSegments([])
    setSaveError(null)
    setSaveSuccess(null)
    setHasLocalChanges(true)
  }

  function handleMarkCurrentSegmentEnd() {
    if (!nextSegmentText) {
      setSaveError("No quedan estrofas por marcar.")
      return
    }

    const startMs = nextSegmentIndex === 0 ? songStartMs : syncedSegments[nextSegmentIndex - 1]?.endMs ?? null
    if (startMs === null) {
      setSaveError("Marca primero el inicio de la cancion.")
      return
    }

    if (props.currentTimeMs <= startMs) {
      setSaveError("El final de la estrofa debe ser mayor al inicio.")
      return
    }

    setSyncedSegments((current) => [
      ...current,
      {
        text: nextSegmentText,
        startMs,
        endMs: props.currentTimeMs,
        clickMs: props.currentTimeMs,
      },
    ])
    setSaveError(null)
    setSaveSuccess(null)
    setHasLocalChanges(true)
  }

  function handleUndoLastMark() {
    setSyncedSegments((current) => current.slice(0, -1))
    setSaveError(null)
    setSaveSuccess(null)
    setHasLocalChanges(true)
  }

  function handleResetTimeline() {
    setSongStartMs(null)
    setSyncedSegments([])
    setSaveError(null)
    setSaveSuccess(null)
    setHasLocalChanges(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Karaoke Manual</CardTitle>
            <CardDescription>
              Define el inicio de la cancion y luego marca con clic el final de cada estrofa para guardar tu propia sincronizacion.
            </CardDescription>
          </div>
          <Badge variant="secondary">{parsedSegments.length} estrofas</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Tiempo actual: {formatMs(props.currentTimeMs)}</span>
            {songStartMs !== null ? <span>Inicio marcado: {formatMs(songStartMs)}</span> : null}
          </div>
          <textarea
            value={draftText}
            onChange={(event) => handleDraftChange(event.target.value)}
            placeholder="Pega o edita la letra. Separa cada estrofa con una linea en blanco."
            className="min-h-40 w-full rounded-xl border bg-background px-3 py-2 text-sm leading-6 outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          <p className="text-xs text-muted-foreground">
            Cada bloque separado por una linea vacia se toma como una estrofa sincronizable.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleMarkSongStart} disabled={!canMarkStart}>
            Marcar inicio
          </Button>
          <Button type="button" onClick={handleMarkCurrentSegmentEnd} disabled={!canMarkNext}>
            {nextSegmentIndex + 1 >= parsedSegments.length ? "Marcar fin de cancion" : `Marcar fin estrofa ${nextSegmentIndex + 1}`}
          </Button>
          <Button type="button" variant="outline" onClick={handleUndoLastMark} disabled={!syncedSegments.length}>
            Deshacer ultimo click
          </Button>
          <Button type="button" variant="outline" onClick={handleResetTimeline} disabled={songStartMs === null && !syncedSegments.length}>
            <RotateCcw />
            Reiniciar
          </Button>
          <Button type="button" onClick={handleSaveManualSync} disabled={!isReadyToSave || isSaving}>
            {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar karaoke
          </Button>
        </div>

        {saveError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </div>
        ) : null}

        {saveSuccess ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {saveSuccess}
          </div>
        ) : null}

        <div className="space-y-2">
          {parsedSegments.length ? (
            parsedSegments.map((segment, index) => {
              const syncedSegment = syncedSegments[index]
              const isCurrent = index === nextSegmentIndex

              return (
                <div
                  key={`${props.song.videoId}-${index}`}
                  className="rounded-xl border px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant={syncedSegment ? "default" : isCurrent ? "secondary" : "outline"}>
                          {syncedSegment ? <Check /> : null}
                          Estrofa {index + 1}
                        </Badge>
                        {syncedSegment ? (
                          <button
                            type="button"
                            onClick={() => props.onSeek(syncedSegment.startMs)}
                            className="text-xs text-muted-foreground underline underline-offset-4"
                          >
                            {formatMs(syncedSegment.startMs)} a {formatMs(syncedSegment.endMs)}
                          </button>
                        ) : isCurrent ? (
                          <span className="text-xs text-muted-foreground">Pendiente de clic</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin marcar</span>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{segment}</pre>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-xl border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              Carga o pega una letra para empezar a marcar la sincronizacion.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
