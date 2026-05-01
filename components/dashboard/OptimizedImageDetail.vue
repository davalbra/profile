<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Star,
  Zap,
} from "lucide-vue-next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getImageFormatLabel } from "@/lib/images/image-format-label"
import { parseOptimizedImageIdFromSlug } from "@/lib/images/optimized-slug"
import { useImagenesRepositorio } from "@/store/repository/imagenes"
import type { DetalleImagenOptimizada } from "@/types/imagenes"
import { formatearBytes } from "@/utils/formatters/archivos"
import { formatearFechaMediaConHora } from "@/utils/formatters/fechas"
import { formatearPorcentaje } from "@/utils/formatters/numeros"

const props = defineProps<{
  slug: string
}>()

function getTransitionSummary(input: {
  fromStep: string
  toStep: string
}): string {
  const fromStep = input.fromStep.trim() || "paso anterior"
  const toStep = input.toStep.trim() || "siguiente paso"
  return `${fromStep} -> ${toStep}`
}

const imagenesRepositorio = useImagenesRepositorio()
const imageId = computed(() => parseOptimizedImageIdFromSlug(props.slug))
const data = ref<DetalleImagenOptimizada | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function loadDetail() {
  if (!imageId.value) {
    error.value = "Slug inválido."
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    const respuesta = await imagenesRepositorio.obtenerDetalleOptimizacion(
      imageId.value,
    )
    data.value = respuesta.data
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "No se pudo cargar el detalle."
  } finally {
    loading.value = false
  }
}

if (import.meta.client) {
  watch(imageId, () => void loadDetail(), { immediate: true })
}
</script>

<template>
  <Card v-if="loading">
    <CardContent
      class="flex items-center gap-2 py-6 text-sm text-muted-foreground"
    >
      <Loader2 class="size-4 animate-spin" />
      Cargando detalle de optimización...
    </CardContent>
  </Card>

  <Card v-else-if="error || !data">
    <CardHeader>
      <CardTitle>Detalle no disponible</CardTitle>
      <CardDescription>{{
        error || "No se pudo cargar la imagen."
      }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button as-child variant="outline" size="sm">
        <NuxtLink to="/dashboard/images/optimize">
          <ArrowLeft class="size-4" />
          Volver a optimizar
        </NuxtLink>
      </Button>
    </CardContent>
  </Card>

  <div v-else class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <Button as-child variant="outline" size="sm">
        <NuxtLink to="/dashboard/images/optimize">
          <ArrowLeft class="size-4" />
          Volver
        </NuxtLink>
      </Button>
      <Badge variant="secondary">
        <Zap class="mr-1 size-3" />
        Optimizada
      </Badge>
      <Badge v-if="data.image.sourceWasN8n" variant="secondary">
        <Star class="mr-1 size-3 fill-current" />
        n8n
      </Badge>
      <Badge variant="outline">{{
        formatearBytes(data.image.sizeBytes)
      }}</Badge>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ data.image.name }}</CardTitle>
        <CardDescription>
          {{ formatearBytes(data.image.originalSizeBytes) }} ->
          {{ formatearBytes(data.image.sizeBytes) }} | ahorro
          {{ formatearBytes(data.image.savedBytes) }} ({{
            formatearPorcentaje(data.image.savedPercent)
          }})
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
          <img
            :src="data.image.downloadURL"
            :alt="data.image.name"
            class="size-full object-contain"
          />
        </div>
        <div class="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <p>Creada: {{ formatearFechaMediaConHora(data.image.createdAt) }}</p>
          <p>
            Actualizada: {{ formatearFechaMediaConHora(data.image.updatedAt) }}
          </p>
          <p>
            Formato original:
            {{
              getImageFormatLabel({
                contentType: data.image.originalContentType,
                fileName: data.image.originalName,
              })
            }}
          </p>
          <p>
            Formato optimizado:
            {{
              getImageFormatLabel({
                contentType: data.image.contentType,
                fileName: data.image.name,
              })
            }}
          </p>
          <p v-if="data.image.optimizationStats" class="md:col-span-2">
            Motor: {{ data.image.optimizationStats.engine || "sharp-avif" }} ·
            q{{ data.image.optimizationStats.quality ?? "-" }} · e{{
              data.image.optimizationStats.effort ?? "-"
            }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Ruta de Transformación</CardTitle>
        <CardDescription
          >Histórico visual del proceso entre colecciones.</CardDescription
        >
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="grid gap-3 md:grid-cols-3">
          <div
            v-for="(node, index) in data.lineage"
            :key="node.path"
            class="space-y-2"
          >
            <article class="overflow-hidden rounded-lg border">
              <div class="relative aspect-[4/3] bg-muted">
                <img
                  v-if="node.downloadURL"
                  :src="node.downloadURL"
                  :alt="node.name"
                  class="size-full object-cover"
                />
                <div
                  v-else
                  class="flex size-full items-center justify-center p-2 text-center text-xs text-muted-foreground"
                >
                  Vista previa no disponible
                </div>
                <Badge
                  variant="outline"
                  class="absolute left-2 top-2 border-white/20 bg-black/65 text-white"
                >
                  {{ node.stepLabel }}
                </Badge>
              </div>
              <div class="space-y-1 p-2">
                <p class="truncate text-xs font-medium">{{ node.name }}</p>
                <div class="flex flex-wrap gap-1">
                  <Badge variant="secondary" class="text-[10px]">
                    {{
                      getImageFormatLabel({
                        contentType: node.contentType,
                        fileName: node.name,
                      })
                    }}
                  </Badge>
                  <Badge variant="outline" class="text-[10px]">{{
                    formatearBytes(node.sizeBytes)
                  }}</Badge>
                  <Badge
                    v-if="node.collection === 'n8n'"
                    variant="secondary"
                    class="text-[10px]"
                  >
                    <Star class="mr-1 size-3 fill-current" />
                    n8n
                  </Badge>
                  <Badge
                    v-if="node.collection === 'optimized'"
                    variant="secondary"
                    class="text-[10px]"
                  >
                    <Sparkles class="mr-1 size-3" />
                    optimizada
                  </Badge>
                </div>
              </div>
            </article>

            <div
              v-if="index < data.transitions.length"
              class="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-700"
            >
              <p class="flex items-center gap-1 font-medium">
                <ArrowRight class="size-3" />
                {{
                  getTransitionSummary({
                    fromStep: node.stepLabel,
                    toStep: data.lineage[index + 1]?.stepLabel || "",
                  })
                }}
              </p>
              <p>
                {{ formatearBytes(data.transitions[index].fromSizeBytes) }} ->
                {{ formatearBytes(data.transitions[index].toSizeBytes) }}
              </p>
              <p>
                Ahorro
                {{ formatearBytes(data.transitions[index].savedBytes) }} ({{
                  formatearPorcentaje(data.transitions[index].savedPercent)
                }})
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
