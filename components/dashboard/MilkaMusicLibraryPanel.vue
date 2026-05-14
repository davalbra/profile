<script setup lang="ts">
import type { YouTubeMusicSong } from "@/lib/youtube-music"
import {
  AlertCircle,
  Cookie,
  LoaderCircle,
  Music4,
  Play,
} from "lucide-vue-next"
import { computed, onMounted, ref } from "vue"
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

type SongsResponse = {
  data?: {
    songs: YouTubeMusicSong[]
  }
  error?: string
  isConfigError?: boolean
}

const songs = ref<YouTubeMusicSong[]>([])
const selectedVideoId = ref("")
const loading = ref(true)
const errorMessage = ref("")
const isConfigError = ref(false)

const currentSong = computed(() => {
  return (
    songs.value.find((song) => song.videoId === selectedVideoId.value) ||
    songs.value[0] ||
    null
  )
})

const audioUrl = computed(() => {
  if (!currentSong.value) {
    return ""
  }

  return `/api/youtube-music/audio?videoId=${encodeURIComponent(
    currentSong.value.videoId,
  )}`
})

function renderArtists(artists: Array<{ name: string; id?: string | null }>) {
  if (!artists.length) {
    return "Sin artista"
  }

  return artists.map((artist) => artist.name).join(", ")
}

function selectSong(videoId: string) {
  selectedVideoId.value = videoId
}

async function loadSongs() {
  loading.value = true
  errorMessage.value = ""
  isConfigError.value = false

  try {
    const response = await fetch("/api/youtube-music/songs?limit=40", {
      cache: "no-store",
    })
    const payload = (await response.json().catch(() => ({}))) as SongsResponse

    if (!response.ok) {
      isConfigError.value = Boolean(payload.isConfigError)
      throw new Error(payload.error || "No se pudo cargar la biblioteca.")
    }

    songs.value = payload.data?.songs || []
    selectedVideoId.value = songs.value[0]?.videoId || ""
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la biblioteca."
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadSongs()
})
</script>

<template>
  <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
    <CardHeader>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <CardTitle>Canciones</CardTitle>
          <CardDescription>Biblioteca de YouTube Music.</CardDescription>
        </div>
        <Badge variant="secondary">
          <Music4 class="size-3" />
          {{ songs.length }}
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <Alert v-if="loading">
        <LoaderCircle class="size-4 animate-spin" />
        <AlertTitle>Cargando biblioteca</AlertTitle>
        <AlertDescription>Consultando YouTube Music.</AlertDescription>
      </Alert>

      <Alert v-else-if="errorMessage" variant="destructive">
        <Cookie v-if="isConfigError" class="size-4" />
        <AlertCircle v-else class="size-4" />
        <AlertTitle>No se pudo cargar la biblioteca</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <Alert v-else-if="!songs.length">
        <Music4 class="size-4" />
        <AlertTitle>Sin canciones</AlertTitle>
        <AlertDescription>No hay canciones disponibles.</AlertDescription>
      </Alert>

      <div
        v-else-if="currentSong"
        class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      >
        <div class="max-h-[640px] space-y-2 overflow-y-auto pr-1">
          <button
            v-for="song in songs"
            :key="song.videoId"
            type="button"
            class="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-2 text-left transition hover:border-primary/45 hover:bg-muted/40"
            :class="
              selectedVideoId === song.videoId
                ? 'border-primary/60 bg-primary/5'
                : 'border-border'
            "
            @click="selectSong(song.videoId)"
          >
            <img
              v-if="song.thumbnailUrl"
              :src="song.thumbnailUrl"
              :alt="song.title"
              class="aspect-square size-14 rounded-md object-cover"
            />
            <span
              v-else
              class="flex aspect-square size-14 items-center justify-center rounded-md bg-muted"
            >
              <Music4 class="size-5 text-muted-foreground" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium">
                {{ song.title }}
              </span>
              <span class="block truncate text-xs text-muted-foreground">
                {{ renderArtists(song.artists) }}
              </span>
            </span>
            <span class="text-xs tabular-nums text-muted-foreground">
              {{ song.duration || "--:--" }}
            </span>
          </button>
        </div>

        <div class="rounded-lg border p-4">
          <div class="grid gap-4 sm:grid-cols-[128px_minmax(0,1fr)]">
            <img
              v-if="currentSong.thumbnailUrl"
              :src="currentSong.thumbnailUrl"
              :alt="currentSong.title"
              class="aspect-square size-32 rounded-lg object-cover"
            />
            <div
              v-else
              class="flex aspect-square size-32 items-center justify-center rounded-lg bg-muted"
            >
              <Music4 class="size-8 text-muted-foreground" />
            </div>

            <div class="min-w-0 space-y-3">
              <div class="space-y-1">
                <p class="truncate text-xl font-semibold">
                  {{ currentSong.title }}
                </p>
                <p class="truncate text-sm text-muted-foreground">
                  {{ renderArtists(currentSong.artists) }}
                </p>
                <p class="truncate text-xs uppercase text-muted-foreground">
                  {{ currentSong.album || "Sin album" }}
                </p>
              </div>
              <Button type="button" variant="outline" @click="loadSongs">
                <LoaderCircle v-if="loading" class="size-4 animate-spin" />
                <Play v-else class="size-4" />
                Actualizar
              </Button>
            </div>
          </div>

          <div class="mt-5 rounded-lg border bg-muted/20 p-4">
            <audio
              :key="audioUrl"
              class="w-full"
              controls
              preload="metadata"
              :src="audioUrl"
            />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
