<script setup lang="ts">
import {
  AlertCircle,
  AudioLines,
  FileAudio,
  LoaderCircle,
  RotateCcw,
  Upload,
  WandSparkles,
} from "lucide-vue-next"
import { computed, onBeforeUnmount, ref, watch } from "vue"
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

type TransformStatus = "idle" | "uploading" | "ready" | "error"

const DEFAULT_SPEED = 0.85
const DEFAULT_REVERB = 0.6

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const sourceUrl = ref("")
const outputUrl = ref("")
const status = ref<TransformStatus>("idle")
const errorMessage = ref("")
const speed = ref(DEFAULT_SPEED)
const reverb = ref(DEFAULT_REVERB)

const formattedSpeed = computed(() => `${speed.value.toFixed(2)}x`)
const formattedReverb = computed(() => `${Math.round(reverb.value * 100)}%`)
const fileSizeLabel = computed(() => {
  if (!selectedFile.value) {
    return ""
  }

  const sizeMb = selectedFile.value.size / (1024 * 1024)
  return `${sizeMb.toFixed(sizeMb >= 10 ? 0 : 1)} MB`
})
const outputFileName = computed(() => {
  const original = selectedFile.value?.name.replace(/\.[^.]+$/, "") || "audio"
  return `${original}-slow-reverb.m4a`
})

function revokeObjectUrl(url: string) {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

function resetOutput() {
  revokeObjectUrl(outputUrl.value)
  outputUrl.value = ""
  status.value = "idle"
  errorMessage.value = ""
}

function setSelectedFile(file: File | null) {
  revokeObjectUrl(sourceUrl.value)
  resetOutput()
  selectedFile.value = file
  sourceUrl.value = file ? URL.createObjectURL(file) : ""
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  setSelectedFile(input.files?.[0] || null)
}

function restoreDefaults() {
  speed.value = DEFAULT_SPEED
  reverb.value = DEFAULT_REVERB
}

async function readResponseError(response: Response) {
  try {
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string }
      return payload.error || "No se pudo transformar el archivo."
    }

    const text = await response.text()
    return text.trim() || "No se pudo transformar el archivo."
  } catch {
    return "No se pudo transformar el archivo."
  }
}

async function generateTransform() {
  if (!selectedFile.value) {
    errorMessage.value = "Selecciona un archivo de audio."
    status.value = "error"
    return
  }

  resetOutput()
  status.value = "uploading"

  const formData = new FormData()
  formData.append("file", selectedFile.value)
  formData.append("preset", "slow-reverb")
  formData.append("speed", speed.value.toFixed(2))
  formData.append("reverb", reverb.value.toFixed(2))

  try {
    const response = await fetch("/api/music-transform/audio", {
      method: "POST",
      body: formData,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(await readResponseError(response))
    }

    const blob = await response.blob()
    outputUrl.value = URL.createObjectURL(blob)
    status.value = "ready"
  } catch (error) {
    status.value = "error"
    errorMessage.value =
      error instanceof Error ? error.message : "No se pudo transformar."
  }
}

watch([speed, reverb], resetOutput)

onBeforeUnmount(() => {
  revokeObjectUrl(sourceUrl.value)
  revokeObjectUrl(outputUrl.value)
})
</script>

<template>
  <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
    <CardHeader>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <CardTitle>Transformar archivo</CardTitle>
          <CardDescription>Slow + Reverb desde audio local.</CardDescription>
        </div>
        <Badge variant="secondary">
          <WandSparkles class="size-3" />
          Slow + Reverb
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-6">
      <div class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="space-y-5">
          <div class="rounded-lg border border-dashed p-4">
            <div class="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" @click="fileInput?.click()">
                <Upload class="size-4" />
                Cargar audio
              </Button>
              <input
                ref="fileInput"
                class="hidden"
                type="file"
                accept="audio/*,.aac,.flac,.m4a,.mp3,.mp4,.ogg,.opus,.wav,.webm"
                @change="handleFileChange"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">
                  {{ selectedFile?.name || "Sin archivo" }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ selectedFile ? fileSizeLabel : "Audio de origen" }}
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border p-4">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <AudioLines class="size-4 text-primary" />
                <p class="font-medium">Ajustes</p>
              </div>
              <Badge v-if="status === 'uploading'" variant="secondary">
                <LoaderCircle class="size-3 animate-spin" />
                Procesando
              </Badge>
              <Badge
                v-else-if="status === 'ready'"
                class="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                Lista
              </Badge>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm font-medium" for="milka-upload-speed">
                    Velocidad
                  </label>
                  <span class="text-sm tabular-nums text-muted-foreground">
                    {{ formattedSpeed }}
                  </span>
                </div>
                <input
                  id="milka-upload-speed"
                  v-model.number="speed"
                  type="range"
                  min="0.7"
                  max="0.95"
                  step="0.01"
                  class="h-2 w-full accent-primary"
                />
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm font-medium" for="milka-upload-reverb">
                    Reverb
                  </label>
                  <span class="text-sm tabular-nums text-muted-foreground">
                    {{ formattedReverb }}
                  </span>
                </div>
                <input
                  id="milka-upload-reverb"
                  v-model.number="reverb"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="h-2 w-full accent-primary"
                />
              </div>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                :disabled="status === 'uploading' || !selectedFile"
                @click="generateTransform"
              >
                <LoaderCircle
                  v-if="status === 'uploading'"
                  class="size-4 animate-spin"
                />
                <WandSparkles v-else class="size-4" />
                Generar
              </Button>
              <Button
                type="button"
                variant="outline"
                :disabled="status === 'uploading'"
                @click="restoreDefaults"
              >
                <RotateCcw class="size-4" />
                Restablecer
              </Button>
            </div>
          </div>

          <Alert v-if="errorMessage" variant="destructive">
            <AlertCircle class="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>
        </div>

        <div class="space-y-4">
          <div class="rounded-lg border p-4">
            <div class="mb-3 flex items-center gap-2">
              <FileAudio class="size-4 text-muted-foreground" />
              <p class="font-medium">Original</p>
            </div>
            <audio
              v-if="sourceUrl"
              :key="sourceUrl"
              class="w-full"
              controls
              preload="metadata"
              :src="sourceUrl"
            />
            <div
              v-else
              class="rounded-lg border bg-muted/20 p-5 text-sm text-muted-foreground"
            >
              Sin audio cargado.
            </div>
          </div>

          <div class="rounded-lg border p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <WandSparkles class="size-4 text-primary" />
                <p class="font-medium">Slow + Reverb</p>
              </div>
              <a
                v-if="outputUrl"
                class="text-sm font-medium text-primary underline-offset-4 hover:underline"
                :href="outputUrl"
                :download="outputFileName"
              >
                Descargar
              </a>
            </div>
            <audio
              v-if="outputUrl"
              :key="outputUrl"
              class="w-full"
              controls
              preload="metadata"
              :src="outputUrl"
            />
            <div
              v-else
              class="rounded-lg border bg-muted/20 p-5 text-sm text-muted-foreground"
            >
              {{
                status === "uploading"
                  ? "Procesando audio..."
                  : "Sin version generada."
              }}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
