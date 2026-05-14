<script setup lang="ts">
import {
  AlertCircle,
  ClipboardCheck,
  Cookie,
  Copy,
  FileText,
} from "lucide-vue-next"
import { computed, ref } from "vue"
import {
  parseYouTubeMusicCookieExport,
  type CookieParseResult,
} from "@/lib/youtube-music-cookie-parser"
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
import { Textarea } from "@/components/ui/textarea"

const rawCookies = ref("")
const result = ref<CookieParseResult | null>(null)
const errorMessage = ref("")
const copied = ref(false)

const envOutput = computed(() => {
  if (!result.value) {
    return ""
  }

  return [result.value.envCookieLine, result.value.envUserAgentLine].join("\n")
})

async function handleCookieFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  rawCookies.value = await file.text()
  processCookies()
}

function processCookies() {
  errorMessage.value = ""
  copied.value = false

  try {
    result.value = parseYouTubeMusicCookieExport(rawCookies.value)
  } catch (error) {
    result.value = null
    errorMessage.value =
      error instanceof Error ? error.message : "No se pudieron procesar cookies."
  }
}

async function copyEnvOutput() {
  if (!envOutput.value) {
    return
  }

  await navigator.clipboard.writeText(envOutput.value)
  copied.value = true
}
</script>

<template>
  <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
    <CardHeader>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <CardTitle>Cookies de YouTube Music</CardTitle>
          <CardDescription>Parser local para YTMUSIC_COOKIE.</CardDescription>
        </div>
        <Badge variant="secondary">
          <Cookie class="size-3" />
          YouTube Music
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Textarea
          v-model="rawCookies"
          class="min-h-72 resize-y font-mono text-xs"
          spellcheck="false"
          placeholder="SID=...; HSID=...; __Secure-3PAPISID=..."
        />

        <div class="space-y-3">
          <label
            class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-sm font-medium hover:border-primary/50 hover:bg-muted/30"
          >
            <FileText class="size-4" />
            Archivo cookies
            <input
              class="hidden"
              type="file"
              accept=".json,.txt,.har"
              @change="handleCookieFile"
            />
          </label>

          <Button type="button" class="w-full" @click="processCookies">
            <Cookie class="size-4" />
            Procesar
          </Button>

          <Button
            type="button"
            variant="outline"
            class="w-full"
            :disabled="!envOutput"
            @click="copyEnvOutput"
          >
            <ClipboardCheck v-if="copied" class="size-4" />
            <Copy v-else class="size-4" />
            {{ copied ? "Copiado" : "Copiar env" }}
          </Button>
        </div>
      </div>

      <Alert v-if="errorMessage" variant="destructive">
        <AlertCircle class="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="result" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border p-4">
            <p class="mb-3 text-sm font-medium">Detectadas</p>
            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="cookieName in result.detectedCookies"
                :key="cookieName"
                variant="outline"
              >
                {{ cookieName }}
              </Badge>
            </div>
          </div>

          <div class="rounded-lg border p-4">
            <p class="mb-3 text-sm font-medium">Faltantes</p>
            <div v-if="result.missingRequiredCookies.length" class="flex flex-wrap gap-2">
              <Badge
                v-for="cookieName in result.missingRequiredCookies"
                :key="cookieName"
                variant="destructive"
              >
                {{ cookieName }}
              </Badge>
            </div>
            <p v-else class="text-sm text-muted-foreground">
              Ninguna cookie requerida pendiente.
            </p>
          </div>
        </div>

        <Textarea
          :model-value="envOutput"
          class="min-h-36 font-mono text-xs"
          readonly
          spellcheck="false"
        />
      </div>
    </CardContent>
  </Card>
</template>
