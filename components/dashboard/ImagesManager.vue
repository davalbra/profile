<script setup lang="ts">
import { ArrowRight, Download, ImagePlus, Images, Loader2, RefreshCcw, Sparkles, Star, Zap } from "lucide-vue-next";
import type { GalleryImage } from "@/lib/images/gallery-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getImageFormatLabel } from "@/lib/images/image-format-label";
import { buildOptimizedImageSlug } from "@/lib/images/optimized-slug";

type QualityMode = "balanced" | "high";
type OptimizeSourceMode = "gallery" | "n8n" | "optimized";

type OptimizedHistoryRecord = {
  id: string;
  path: string;
  name: string;
  downloadURL: string;
  contentType: string | null;
  sizeBytes: number | null;
  originalSizeBytes?: number | null;
  optimizedSizeBytes?: number | null;
  savedBytes?: number | null;
  savedPercent?: number | null;
  optimizationStats?: {
    id: string;
    engine: string;
    quality: number | null;
    effort: number | null;
    createdAt: string;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type HistoryWithStats = OptimizedHistoryRecord & {
  originalBytes: number | null;
  optimizedBytes: number | null;
  savedBytes: number | null;
  savedPercent: number | null;
};

function extensionFromContentType(contentType: string | null): string {
  switch ((contentType || "").toLowerCase().split(";")[0].trim()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "img";
  }
}

function buildDownloadFileName(input: { name: string; contentType: string | null }): string {
  const trimmed = input.name.trim();
  if (!trimmed) return `imagen.${extensionFromContentType(input.contentType)}`;
  if (/\.[a-z0-9]+$/i.test(trimmed)) return trimmed;
  return `${trimmed}.${extensionFromContentType(input.contentType)}`;
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

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function uploadOptimizedImage(input: { galleryPath: string; qualityMode: QualityMode }) {
  const formData = new FormData();
  formData.append("galleryPath", input.galleryPath);
  formData.append("qualityMode", input.qualityMode);

  const response = await fetch("/api/images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "No se pudo optimizar y subir la imagen.");
  }

  const payload = (await response.json().catch(() => null)) as {
    image?: {
      path?: string | null;
      name?: string | null;
      sizeBytes?: number | null;
      originalSizeBytes?: number | null;
      optimizedSizeBytes?: number | null;
      savedBytes?: number | null;
      savedPercent?: number | null;
    };
  } | null;

  const optimizedBytes = Number(payload?.image?.optimizedSizeBytes ?? payload?.image?.sizeBytes ?? 0);
  const originalBytes = Number(payload?.image?.originalSizeBytes ?? 0);
  const savedBytes = Number(payload?.image?.savedBytes ?? Math.max(0, originalBytes - optimizedBytes));
  const savedPercent = Number(payload?.image?.savedPercent ?? (originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0));

  return {
    optimizedBytes,
    originalBytes,
    savedBytes,
    savedPercent,
    optimizedPath: payload?.image?.path || null,
    optimizedName: payload?.image?.name || null,
  };
}

const route = useRoute();
const router = useRouter();
const { user, error } = useAuth();
const userId = computed(() => user.value?.uid || null);
const requestedGalleryPath = computed(() => (typeof route.query.galleryPath === "string" ? route.query.galleryPath : null));
const requestedSourceMode = computed<OptimizeSourceMode>(() =>
  requestedGalleryPath.value?.includes("/n8n/")
    ? "n8n"
    : requestedGalleryPath.value?.includes("/optimizadas/")
      ? "optimized"
      : "gallery",
);

const sourceMode = ref<OptimizeSourceMode>(requestedSourceMode.value);
const galleryPage = ref(1);
const galleryPageSize = ref<10 | 25 | 50>(10);
const qualityByPath = ref<Record<string, QualityMode>>({});
const optimizingPath = ref<string | null>(null);
const downloadingPath = ref<string | null>(null);
const status = ref<string | null>(null);
const failure = ref<string | null>(null);
const historyRecords = ref<OptimizedHistoryRecord[]>([]);
const loadingHistory = ref(false);

watch(requestedGalleryPath, (next) => {
  if (next) sourceMode.value = requestedSourceMode.value;
});

const { images: sourceImages, loading: loadingSource, error: sourceError, refresh: refreshSource } = useGalleryImages({
  userId,
  enabled: true,
  scope: sourceMode,
});

const optimizedAuxEnabled = computed(() => sourceMode.value !== "optimized");
const { images: optimizedAuxImages, loading: loadingOptimizedAux, error: optimizedAuxError, refresh: refreshOptimizedAux } = useGalleryImages({
  userId,
  enabled: optimizedAuxEnabled,
  scope: "optimized",
});

const optimizedCollection = computed(() => (sourceMode.value === "optimized" ? sourceImages.value : optimizedAuxImages.value));
const activeScopeLabel = computed(() => (sourceMode.value === "n8n" ? "n8n" : sourceMode.value === "optimized" ? "Optimizadas" : "Galería"));
const busy = computed(() => optimizingPath.value !== null);
const totalPages = computed(() => Math.max(1, Math.ceil(sourceImages.value.length / galleryPageSize.value)));
const paginatedImages = computed(() => {
  const start = (galleryPage.value - 1) * galleryPageSize.value;
  return sourceImages.value.slice(start, start + galleryPageSize.value);
});

const historyByPath = computed(() => {
  const map = new Map<string, HistoryWithStats>();
  for (const item of historyRecords.value) {
    const originalBytes = item.originalSizeBytes ?? null;
    const optimizedBytes = item.optimizedSizeBytes ?? item.sizeBytes ?? null;
    const savedBytes = item.savedBytes ?? (originalBytes !== null && optimizedBytes !== null ? Math.max(0, originalBytes - optimizedBytes) : null);
    const savedPercent =
      item.savedPercent ??
      (originalBytes !== null && originalBytes > 0 && savedBytes !== null ? Number(((savedBytes / originalBytes) * 100).toFixed(1)) : null);
    map.set(item.path, { ...item, originalBytes, optimizedBytes, savedBytes, savedPercent });
  }
  return map;
});

const optimizedBySourcePath = computed(() => {
  const map = new Map<string, GalleryImage>();
  for (const image of optimizedCollection.value) {
    const sourcePath = image.sourceGalleryPath || null;
    if (!sourcePath || map.has(sourcePath)) continue;
    map.set(sourcePath, image);
  }
  return map;
});

const statsSummary = computed(() => {
  const values = Array.from(historyByPath.value.values());
  const totalOriginalBytes = values.reduce((acc, item) => acc + (item.originalBytes || 0), 0);
  const totalOptimizedBytes = values.reduce((acc, item) => acc + (item.optimizedBytes || 0), 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);
  const totalSavedPercent = totalOriginalBytes > 0 ? (totalSavedBytes / totalOriginalBytes) * 100 : 0;
  return { totalSavedBytes, totalSavedPercent };
});

watch(totalPages, (total) => {
  galleryPage.value = Math.min(galleryPage.value, total);
});

watch(sourceMode, () => {
  galleryPage.value = 1;
});

watch([sourceImages, galleryPageSize, requestedGalleryPath], ([images, pageSize, requestedPath]) => {
  if (!requestedPath) return;
  const index = images.findIndex((item) => item.path === requestedPath);
  if (index >= 0) galleryPage.value = Math.floor(index / pageSize) + 1;
});

watch(sourceError, (next) => {
  if (next) failure.value = next;
});

watch(optimizedAuxError, (next) => {
  if (next) failure.value = next;
});

async function refreshOptimizedCollection() {
  if (sourceMode.value === "optimized") {
    return await refreshSource({ force: true });
  }
  return await refreshOptimizedAux({ force: true });
}

async function loadHistoryRecords() {
  if (!userId.value) {
    historyRecords.value = [];
    return;
  }

  loadingHistory.value = true;
  try {
    const response = await fetch("/api/images", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "No se pudieron cargar las imágenes optimizadas.");
    }

    const payload = (await response.json()) as { images?: OptimizedHistoryRecord[] };
    historyRecords.value = payload.images || [];
  } catch (reason) {
    failure.value = reason instanceof Error ? reason.message : "No se pudieron cargar las imágenes optimizadas.";
  } finally {
    loadingHistory.value = false;
  }
}

watch(userId, () => void loadHistoryRecords(), { immediate: true });

async function handleOptimizeImage(input: { path: string; name: string }) {
  if (!user.value) {
    failure.value = "Debes iniciar sesión para administrar imágenes.";
    return;
  }

  const qualityMode = qualityByPath.value[input.path] || "balanced";
  optimizingPath.value = input.path;
  failure.value = null;
  status.value = null;

  try {
    const result = await uploadOptimizedImage({
      galleryPath: input.path,
      qualityMode,
    });

    await Promise.all([refreshSource({ force: true }), refreshOptimizedCollection(), loadHistoryRecords()]);

    const optimizedLabel = result.optimizedName ? ` (${result.optimizedName})` : "";
    status.value = `${input.name} optimizada${optimizedLabel}: ${formatBytes(result.originalBytes)} -> ${formatBytes(result.optimizedBytes)} (ahorro ${formatBytes(result.savedBytes)} / ${formatPercent(result.savedPercent)}).`;
  } catch (reason) {
    failure.value = reason instanceof Error ? reason.message : "No se pudo optimizar la imagen.";
  } finally {
    optimizingPath.value = null;
  }
}

async function handleDownloadImage(input: { path: string; name: string; contentType: string | null }) {
  failure.value = null;
  downloadingPath.value = input.path;

  try {
    const anchor = document.createElement("a");
    const fileName = buildDownloadFileName({ name: input.name, contentType: input.contentType });
    anchor.href = `/api/images/download?path=${encodeURIComponent(input.path)}&name=${encodeURIComponent(fileName)}`;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    status.value = `Descarga iniciada: ${fileName}`;
  } catch (reason) {
    failure.value = reason instanceof Error ? reason.message : "No se pudo descargar la imagen.";
  } finally {
    downloadingPath.value = null;
  }
}

function setSourceMode(next: OptimizeSourceMode) {
  sourceMode.value = next;
  if (route.query.galleryPath) {
    void router.replace({ query: { ...route.query, galleryPath: undefined } });
  }
}

function setQuality(path: string, quality: QualityMode) {
  qualityByPath.value = { ...qualityByPath.value, [path]: quality };
}

function getImageState(image: GalleryImage) {
  const showN8nBadge = sourceMode.value === "n8n" || image.isN8nGenerated || image.isN8nDerived;
  const isOptimizedCollection = sourceMode.value === "optimized" || image.isOptimized;
  const linkedOptimized =
    optimizedBySourcePath.value.get(image.path) ||
    (image.sourceGalleryPath ? optimizedBySourcePath.value.get(image.sourceGalleryPath) : null) ||
    null;
  const linkedStats = linkedOptimized ? historyByPath.value.get(linkedOptimized.path) || null : null;
  const ownStats = historyByPath.value.get(image.path) || null;
  const currentStats = isOptimizedCollection ? ownStats : linkedStats;
  const isAlreadyOptimized = isOptimizedCollection || Boolean(linkedOptimized);
  const detailId = image.optimizedImageId || ownStats?.id || null;
  const detailName = ownStats?.name || image.name;
  const detailSlug = detailId ? buildOptimizedImageSlug({ id: detailId, name: detailName }) : null;

  return {
    showN8nBadge,
    isOptimizedCollection,
    linkedOptimized,
    currentStats,
    isAlreadyOptimized,
    detailSlug,
    quality: qualityByPath.value[image.path] || "balanced",
  };
}
</script>

<template>
  <Card>
    <CardHeader class="space-y-3">
      <div>
        <CardTitle class="flex items-center gap-2">
          <ImagePlus class="size-5" />
          Gestión de Imágenes Web
        </CardTitle>
        <CardDescription>
          Optimiza por card y usa la colección de optimizadas como histórico con detalle por slug.
        </CardDescription>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{{ sourceImages.length }} en colección</Badge>
        <Badge variant="outline">{{ historyRecords.length }} optimizadas</Badge>
        <Badge variant="outline">
          Ahorro acumulado {{ formatBytes(statsSummary.totalSavedBytes) }} ({{ formatPercent(statsSummary.totalSavedPercent) }})
        </Badge>
        <Badge variant="outline">Colección: {{ activeScopeLabel }}</Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <p v-if="failure" class="text-sm text-destructive">{{ failure }}</p>
      <p v-if="status" class="text-sm text-emerald-600">{{ status }}</p>

      <section class="space-y-4 rounded-lg border p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-2">
            <Button size="sm" :variant="sourceMode === 'gallery' ? 'default' : 'outline'" :disabled="busy" @click="setSourceMode('gallery')">
              <Images class="size-4" />
              Galería
            </Button>
            <Button size="sm" :variant="sourceMode === 'n8n' ? 'default' : 'outline'" :disabled="busy" @click="setSourceMode('n8n')">
              <Sparkles class="size-4" />
              n8n
            </Button>
            <Button size="sm" :variant="sourceMode === 'optimized' ? 'default' : 'outline'" :disabled="busy" @click="setSourceMode('optimized')">
              <Zap class="size-4" />
              Optimizadas
            </Button>
          </div>

          <div class="flex gap-2">
            <Button as-child variant="outline" size="sm" :disabled="busy">
              <NuxtLink to="/dashboard/images/gallery">
                <Images class="size-4" />
                Ir a galería
              </NuxtLink>
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="loadingSource || loadingHistory || loadingOptimizedAux || busy || !user"
              @click="() => { refreshSource({ force: true }); refreshOptimizedCollection(); loadHistoryRecords(); }"
            >
              <Loader2 v-if="loadingSource || loadingHistory || loadingOptimizedAux" class="size-4 animate-spin" />
              <RefreshCcw v-else class="size-4" />
              Recargar
            </Button>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="image in paginatedImages"
            :key="image.path"
            class="overflow-hidden rounded-lg border bg-card"
            :class="requestedGalleryPath === image.path ? 'ring-2 ring-primary/40' : ''"
          >
            <div class="relative aspect-[4/3] bg-muted">
              <Badge variant="secondary" class="pointer-events-none absolute left-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65">
                {{ getImageFormatLabel({ contentType: image.contentType, fileName: image.name || image.path }) }}
              </Badge>
              <Badge v-if="getImageState(image).showN8nBadge" variant="secondary" class="pointer-events-none absolute right-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65">
                <Star class="mr-1 size-3 fill-current" />
                n8n
              </Badge>
              <Badge v-if="getImageState(image).isAlreadyOptimized" variant="secondary" class="pointer-events-none absolute bottom-2 right-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65">
                <Zap class="mr-1 size-3" />
                optimizada
              </Badge>
              <img :src="image.downloadURL" :alt="image.name" class="size-full object-cover">
            </div>

            <div class="space-y-3 p-3">
              <div class="space-y-1">
                <p class="truncate text-sm font-medium">{{ image.name }}</p>
                <p class="text-xs text-muted-foreground">{{ formatBytes(image.sizeBytes) }} · {{ formatDate(image.createdAt) }}</p>
              </div>

              <div v-if="getImageState(image).currentStats" class="rounded-md border bg-muted/30 p-2 text-xs">
                <p>Original: {{ formatBytes(getImageState(image).currentStats?.originalBytes ?? null) }}</p>
                <p>Optimizada: {{ formatBytes(getImageState(image).currentStats?.optimizedBytes ?? null) }}</p>
                <p class="font-medium text-emerald-700 dark:text-emerald-300">
                  Ahorro: {{ formatBytes(getImageState(image).currentStats?.savedBytes ?? null) }}
                  ({{ formatPercent(getImageState(image).currentStats?.savedPercent ?? null) }})
                </p>
              </div>

              <div v-if="sourceMode === 'optimized'" class="space-y-2">
                <p class="text-xs text-muted-foreground">Este item pertenece al histórico de optimización.</p>
                <div class="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    class="w-full"
                    :disabled="downloadingPath === image.path"
                    @click="handleDownloadImage({ path: image.path, name: image.name, contentType: image.contentType })"
                  >
                    <Loader2 v-if="downloadingPath === image.path" class="size-4 animate-spin" />
                    <Download v-else class="size-4" />
                    Descargar
                  </Button>
                  <Button v-if="getImageState(image).detailSlug" as-child size="sm" variant="outline" class="w-full">
                    <NuxtLink :to="`/dashboard/images/optimize/${encodeURIComponent(getImageState(image).detailSlug || '')}`">
                      <ArrowRight class="size-4" />
                      Detalle
                    </NuxtLink>
                  </Button>
                  <Button v-else size="sm" variant="outline" class="w-full" disabled>
                    <ArrowRight class="size-4" />
                    Detalle
                  </Button>
                </div>
              </div>

              <div v-else-if="getImageState(image).isAlreadyOptimized && getImageState(image).linkedOptimized" class="space-y-2">
                <p class="text-xs text-emerald-700 dark:text-emerald-300">
                  Ya está optimizada. Puedes abrirla en la colección de optimizadas.
                </p>
                <Button as-child size="sm" variant="outline" class="w-full">
                  <NuxtLink :to="`/dashboard/images/optimize?galleryPath=${encodeURIComponent(getImageState(image).linkedOptimized?.path || '')}`">
                    <ArrowRight class="size-4" />
                    Ir a optimizadas
                  </NuxtLink>
                </Button>
              </div>

              <div v-else class="space-y-2">
                <select
                  class="h-8 w-full rounded-md border bg-background px-3 text-sm"
                  :value="getImageState(image).quality"
                  :disabled="busy"
                  @change="setQuality(image.path, (($event.target as HTMLSelectElement).value as QualityMode))"
                >
                  <option value="balanced">Balanceado</option>
                  <option value="high">Alta calidad</option>
                </select>

                <Button size="sm" class="w-full" :disabled="busy" @click="handleOptimizeImage({ path: image.path, name: image.name })">
                  <Loader2 v-if="optimizingPath === image.path" class="size-4 animate-spin" />
                  <Zap v-else class="size-4" />
                  Optimizar
                </Button>
              </div>
            </div>
          </article>
        </div>

        <DashboardGalleryPaginationControls
          :total-items="sourceImages.length"
          :page="galleryPage"
          :page-size="galleryPageSize"
          :disabled="busy || loadingSource"
          @page-change="galleryPage = $event"
          @page-size-change="(nextSize) => { galleryPageSize = nextSize; galleryPage = 1; }"
        />

        <p v-if="!loadingSource && sourceImages.length === 0" class="text-sm text-muted-foreground">
          No hay imágenes en esta colección.
        </p>
      </section>

      <p v-if="!user" class="text-sm text-muted-foreground">
        Inicia sesión para administrar imágenes dentro del dashboard.
      </p>
    </CardContent>
  </Card>
</template>
