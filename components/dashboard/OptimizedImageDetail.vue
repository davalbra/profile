<script setup lang="ts">
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Star, Zap } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getImageFormatLabel } from "@/lib/images/image-format-label";
import { parseOptimizedImageIdFromSlug } from "@/lib/images/optimized-slug";

type DetailPayload = {
  image: {
    id: string;
    slug: string;
    name: string;
    originalName: string;
    path: string;
    downloadURL: string;
    originalPath: string;
    contentType: string | null;
    originalContentType: string | null;
    sizeBytes: number | null;
    originalSizeBytes: number | null;
    savedBytes: number | null;
    savedPercent: number | null;
    sourceCollection: "gallery" | "n8n" | "optimized" | "local" | null;
    sourceStoragePath: string | null;
    sourceWasN8n: boolean;
    createdAt: string;
    updatedAt: string;
    optimizationStats: {
      id: string;
      engine: string | null;
      quality: number | null;
      effort: number | null;
      createdAt: string;
    } | null;
  };
  lineage: Array<{
    path: string;
    name: string;
    contentType: string | null;
    sizeBytes: number | null;
    downloadURL: string | null;
    collection: "gallery" | "n8n" | "optimized" | "original" | "unknown";
    stepLabel: string;
    isCurrent: boolean;
  }>;
  transitions: Array<{
    fromPath: string;
    toPath: string;
    fromCollection: string;
    toCollection: string;
    fromContentType: string | null;
    toContentType: string | null;
    fromSizeBytes: number | null;
    toSizeBytes: number | null;
    savedBytes: number | null;
    savedPercent: number | null;
  }>;
};

const props = defineProps<{
  slug: string;
}>();

function getTransitionSummary(input: { fromStep: string; toStep: string }): string {
  const fromStep = input.fromStep.trim() || "paso anterior";
  const toStep = input.toStep.trim() || "siguiente paso";
  return `${fromStep} -> ${toStep}`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPercent(percent: number | null): string {
  if (percent === null || Number.isNaN(percent)) return "-";
  return `${percent.toFixed(1)}%`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const imageId = computed(() => parseOptimizedImageIdFromSlug(props.slug));
const data = ref<DetailPayload | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function loadDetail() {
  if (!imageId.value) {
    error.value = "Slug inválido.";
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`/api/images/optimize/${encodeURIComponent(imageId.value)}`, {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as DetailPayload & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "No se pudo cargar el detalle.");
    }
    data.value = payload;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "No se pudo cargar el detalle.";
  } finally {
    loading.value = false;
  }
}

if (import.meta.client) {
  watch(imageId, () => void loadDetail(), { immediate: true });
}
</script>

<template>
  <Card v-if="loading">
    <CardContent class="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 class="size-4 animate-spin" />
      Cargando detalle de optimización...
    </CardContent>
  </Card>

  <Card v-else-if="error || !data">
    <CardHeader>
      <CardTitle>Detalle no disponible</CardTitle>
      <CardDescription>{{ error || "No se pudo cargar la imagen." }}</CardDescription>
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
      <Badge variant="outline">{{ formatBytes(data.image.sizeBytes) }}</Badge>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ data.image.name }}</CardTitle>
        <CardDescription>
          {{ formatBytes(data.image.originalSizeBytes) }} -> {{ formatBytes(data.image.sizeBytes) }} |
          ahorro {{ formatBytes(data.image.savedBytes) }} ({{ formatPercent(data.image.savedPercent) }})
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
          <img :src="data.image.downloadURL" :alt="data.image.name" class="size-full object-contain">
        </div>
        <div class="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <p>Creada: {{ formatDate(data.image.createdAt) }}</p>
          <p>Actualizada: {{ formatDate(data.image.updatedAt) }}</p>
          <p>
            Formato original:
            {{ getImageFormatLabel({ contentType: data.image.originalContentType, fileName: data.image.originalName }) }}
          </p>
          <p>
            Formato optimizado:
            {{ getImageFormatLabel({ contentType: data.image.contentType, fileName: data.image.name }) }}
          </p>
          <p v-if="data.image.optimizationStats" class="md:col-span-2">
            Motor: {{ data.image.optimizationStats.engine || "sharp-avif" }} ·
            q{{ data.image.optimizationStats.quality ?? "-" }} ·
            e{{ data.image.optimizationStats.effort ?? "-" }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Ruta de Transformación</CardTitle>
        <CardDescription>Histórico visual del proceso entre colecciones.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="grid gap-3 md:grid-cols-3">
          <div v-for="(node, index) in data.lineage" :key="node.path" class="space-y-2">
            <article class="overflow-hidden rounded-lg border">
              <div class="relative aspect-[4/3] bg-muted">
                <img v-if="node.downloadURL" :src="node.downloadURL" :alt="node.name" class="size-full object-cover">
                <div v-else class="flex size-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                  Vista previa no disponible
                </div>
                <Badge variant="outline" class="absolute left-2 top-2 border-white/20 bg-black/65 text-white">
                  {{ node.stepLabel }}
                </Badge>
              </div>
              <div class="space-y-1 p-2">
                <p class="truncate text-xs font-medium">{{ node.name }}</p>
                <div class="flex flex-wrap gap-1">
                  <Badge variant="secondary" class="text-[10px]">
                    {{ getImageFormatLabel({ contentType: node.contentType, fileName: node.name }) }}
                  </Badge>
                  <Badge variant="outline" class="text-[10px]">{{ formatBytes(node.sizeBytes) }}</Badge>
                  <Badge v-if="node.collection === 'n8n'" variant="secondary" class="text-[10px]">
                    <Star class="mr-1 size-3 fill-current" />
                    n8n
                  </Badge>
                  <Badge v-if="node.collection === 'optimized'" variant="secondary" class="text-[10px]">
                    <Sparkles class="mr-1 size-3" />
                    optimizada
                  </Badge>
                </div>
              </div>
            </article>

            <div v-if="index < data.transitions.length" class="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-700">
              <p class="flex items-center gap-1 font-medium">
                <ArrowRight class="size-3" />
                {{ getTransitionSummary({ fromStep: node.stepLabel, toStep: data.lineage[index + 1]?.stepLabel || "" }) }}
              </p>
              <p>
                {{ formatBytes(data.transitions[index].fromSizeBytes) }} -> {{ formatBytes(data.transitions[index].toSizeBytes) }}
              </p>
              <p>
                Ahorro {{ formatBytes(data.transitions[index].savedBytes) }} ({{ formatPercent(data.transitions[index].savedPercent) }})
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
