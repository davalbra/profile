<script setup lang="ts">
import type { YouTubeMusicSong } from "@/lib/youtube-music"
import {
  AlertCircle,
  AudioLines,
  Cookie,
  LoaderCircle,
  Music4,
  RotateCcw,
  SlidersHorizontal,
  WandSparkles,
} from "lucide-vue-next"
import { computed, onMounted, ref, watch } from "vue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

type GenerationStatus = "idle" | "generating" | "ready" | "error"

type SongsResponse = {
  data?: {
    songs: YouTubeMusicSong[]
  }
  error?: string
  isConfigError?: boolean
}

const DEFAULT_SPEED = 0.85
const DEFAULT_REVERB = 0.6

const songs = ref<YouTubeMusicSong[]>([])
const selectedVideoId = ref("")
const speed = ref(DEFAULT_SPEED)
const reverb = ref(DEFAULT_REVERB)
const loadingSongs = ref(true)
const songsError = ref("")
const isConfigError = ref(false)
const status = ref<GenerationStatus>("idle")
const outputUrl = ref("")
const generationError = ref("")
const requestSequence = ref(0)

const currentSong = computed(() => {
  return (
    songs.value.find((song) => song.videoId === selectedVideoId.value) ||
    songs.value[0] ||
    null
  )
})

const originalAudioUrl = computed(() => {
  if (!currentSong.value) {
    return ""
  }

  return `/api/youtube-music/audio?videoId=${encodeURIComponent(currentSong.value.videoId)}`
})

const transformAudioUrl = computed(() => {
  if (!currentSong.value) {
    return ""
  }

  const params = new URLSearchParams({
    videoId: currentSong.value.videoId,
    preset: "slow-reverb",
    speed: speed.value.toFixed(2),
    reverb: reverb.value.toFixed(2),
  })

  return `/api/music-transform/audio?${params.toString()}`
})

const formattedSpeed = computed(() => `${speed.value.toFixed(2)}x`)
const formattedReverb = computed(() => `${Math.round(reverb.value * 100)}%`)

function renderArtists(artists: Array<{ name: string; id?: string | null }>) {
  if (!artists.length) {
    return "Sin artista"
  }

  return artists.map((artist) => artist.name).join(", ")
}

async function readResponseError(response: Response) {
  try {
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as SongsResponse
      return payload.error || "No se pudo completar la operacion."
    }

    const text = await response.text()
    return text.trim() || "No se pudo completar la operacion."
  } catch {
    return "No se pudo completar la operacion."
  }
}

async function loadSongs() {
  loadingSongs.value = true
  songsError.value = ""
  isConfigError.value = false

  try {
    const response = await fetch("/api/youtube-music/songs?limit=30", {
      cache: "no-store",
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as SongsResponse
      isConfigError.value = Boolean(payload.isConfigError)
      throw new Error(payload.error || "No se pudo cargar la biblioteca.")
    }

    const payload = (await response.json()) as SongsResponse
    songs.value = payload.data?.songs || []
    selectedVideoId.value = songs.value[0]?.videoId || ""
  } catch (error) {
    songsError.value =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la biblioteca."
  } finally {
    loadingSongs.value = false
  }
}

async function generateTransform() {
  if (!currentSong.value || !transformAudioUrl.value) {
    return
  }

  const sequence = requestSequence.value + 1
  requestSequence.value = sequence
  status.value = "generating"
  outputUrl.value = ""
  generationError.value = ""

  try {
    const response = await fetch(transformAudioUrl.value, {
      cache: "no-store",
      headers: {
        Range: "bytes=0-0",
      },
    })

    if (!response.ok) {
      throw new Error(await readResponseError(response))
    }

    await response.arrayBuffer()

    if (sequence !== requestSequence.value) {
      return
    }

    outputUrl.value = `${transformAudioUrl.value}&v=${Date.now()}`
    status.value = "ready"
  } catch (error) {
    if (sequence !== requestSequence.value) {
      return
    }

    status.value = "error"
    generationError.value =
      error instanceof Error ? error.message : "No se pudo generar la version."
  }
}

function restoreDefaults() {
  speed.value = DEFAULT_SPEED
  reverb.value = DEFAULT_REVERB
}

function handleOutputAudioError() {
  status.value = "error"
  generationError.value =
    "La version se genero, pero el navegador no pudo cargar el audio."
}

watch([selectedVideoId, speed, reverb], () => {
  requestSequence.value += 1
  status.value = "idle"
  outputUrl.value = ""
  generationError.value = ""
})

onMounted(() => {
  void loadSongs()
})
</script>

<template>
  <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
    <CardHeader>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <CardTitle>Transformar musica</CardTitle>
          <CardDescription>
            Primera opcion disponible: Slow + Reverb.
          </CardDescription>
        </div>
        <Badge variant="secondary">{{ songs.length }} canciones</Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <Alert v-if="loadingSongs">
        <LoaderCircle class="size-4 animate-spin" />
        <AlertTitle>Cargando biblioteca</AlertTitle>
        <AlertDescription>
          Consultando tus canciones de YouTube Music.
        </AlertDescription>
      </Alert>

      <Alert v-else-if="songsError" variant="destructive">
        <Cookie v-if="isConfigError" class="size-4" />
        <AlertCircle v-else class="size-4" />
        <AlertTitle>No se pudo cargar la biblioteca</AlertTitle>
        <AlertDescription>{{ songsError }}</AlertDescription>
      </Alert>

      <Alert v-else-if="!songs.length">
        <Music4 class="size-4" />
        <AlertTitle>Sin canciones</AlertTitle>
        <AlertDescription>
          No hay canciones disponibles para transformar.
        </AlertDescription>
      </Alert>

      <div
        v-else-if="currentSong"
        class="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]"
      >
        <div class="space-y-5">
          <div class="grid gap-4 md:grid-cols-[112px_1fr]">
            <img
              v-if="currentSong.thumbnailUrl"
              :src="currentSong.thumbnailUrl"
              :alt="currentSong.title"
              class="aspect-square h-28 w-28 rounded-lg border object-cover"
            />
            <div
              v-else
              class="flex aspect-square w-28 items-center justify-center rounded-lg border bg-muted"
            >
              <Music4 class="size-7 text-muted-foreground" />
            </div>

            <div class="min-w-0 space-y-3">
              <div class="space-y-2">
                <label class="text-sm font-medium" for="milka-song-select">
                  Cancion
                </label>
                <NativeSelect
                  id="milka-song-select"
                  v-model="selectedVideoId"
                  class="w-full"
                >
                  <NativeSelectOption
                    v-for="song in songs"
                    :key="song.videoId"
                    :value="song.videoId"
                  >
                    {{ song.title }}
                  </NativeSelectOption>
                </NativeSelect>
              </div>

              <div class="min-w-0">
                <p class="truncate font-medium">{{ currentSong.title }}</p>
                <p class="truncate text-sm text-muted-foreground">
                  {{ renderArtists(currentSong.artists) }}
                </p>
                <p
                  class="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {{ currentSong.album || "Sin album" }}
                  {{ currentSong.duration ? `- ${currentSong.duration}` : "" }}
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-xl border p-4">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <WandSparkles class="size-4 text-primary" />
                <p class="font-medium">Slow + Reverb</p>
              </div>

              <Badge v-if="status === 'generating'" variant="secondary">
                <LoaderCircle class="size-3 animate-spin" />
                Generando
              </Badge>
              <Badge
                v-else-if="status === 'ready'"
                class="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                <AudioLines class="size-3" />
                Lista
              </Badge>
              <Badge v-else variant="outline">
                <SlidersHorizontal class="size-3" />
                Preset
              </Badge>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm font-medium" for="milka-speed-range">
                    Velocidad
                  </label>
                  <span class="text-sm tabular-nums text-muted-foreground">
                    {{ formattedSpeed }}
                  </span>
                </div>
                <input
                  id="milka-speed-range"
                  v-model.number="speed"
                  type="range"
                  min="0.7"
                  max="0.95"
                  step="0.01"
                  class="h-2 w-full accent-primary"
                />
                <div class="flex justify-between text-xs text-muted-foreground">
                  <span>0.70x</span>
                  <span>0.95x</span>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm font-medium" for="milka-reverb-range">
                    Reverb
                  </label>
                  <span class="text-sm tabular-nums text-muted-foreground">
                    {{ formattedReverb }}
                  </span>
                </div>
                <input
                  id="milka-reverb-range"
                  v-model.number="reverb"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="h-2 w-full accent-primary"
                />
                <div class="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                :disabled="status === 'generating'"
                @click="generateTransform"
              >
                <LoaderCircle
                  v-if="status === 'generating'"
                  class="size-4 animate-spin"
                />
                <WandSparkles v-else class="size-4" />
                Generar version
              </Button>
              <Button
                type="button"
                variant="outline"
                :disabled="status === 'generating'"
                @click="restoreDefaults"
              >
                <RotateCcw class="size-4" />
                Restablecer
              </Button>
            </div>

            <Alert v-if="generationError" variant="destructive" class="mt-4">
              <AlertCircle class="size-4" />
              <AlertTitle>Error al transformar</AlertTitle>
              <AlertDescription>{{ generationError }}</AlertDescription>
            </Alert>
          </div>
        </div>

        <div class="space-y-4">
          <Card class="border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle>Original</CardTitle>
              <CardDescription>{{ currentSong.title }}</CardDescription>
            </CardHeader>
            <CardContent>
              <audio
                :key="currentSong.videoId"
                class="w-full"
                controls
                preload="metadata"
                :src="originalAudioUrl"
              />
            </CardContent>
          </Card>

          <Card class="border-white/10 bg-background/40">
            <CardHeader>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1">
                  <CardTitle>Slow + Reverb</CardTitle>
                  <CardDescription>
                    {{ formattedSpeed }} - reverb {{ formattedReverb }}
                  </CardDescription>
                </div>
                <Badge v-if="outputUrl" variant="secondary">Cache local</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <audio
                v-if="outputUrl"
                :key="outputUrl"
                class="w-full"
                controls
                preload="metadata"
                :src="outputUrl"
                @error="handleOutputAudioError"
              />
              <div
                v-else
                class="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground"
              >
                {{
                  status === "generating"
                    ? "Generando version..."
                    : "Genera una version para escucharla aqui."
                }}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
