<script setup lang="ts">
import { Images, Loader2, RefreshCcw, Sparkles, Star } from "lucide-vue-next";
import type { GalleryImage } from "@/lib/images/gallery-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getImageFormatLabel } from "@/lib/images/image-format-label";
import { isPreviewableImage } from "@/lib/images/is-previewable-image";
import { isN8nSupportedImageFormat } from "@/lib/images/n8n-supported-format";

type N8nImagePreview = {
  dataUrl: string;
  contentType: string;
  sizeBytes: number;
  fileName: string;
};

type StoredN8nImage = {
  path: string;
  name: string;
  downloadURL: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

function formatBytes(bytes: number | null): string {
  if (!bytes || Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const route = useRoute();
const { user, error } = useAuth();
const userId = computed(() => user.value?.uid || null);
const requestedGalleryPath = computed(() => (typeof route.query.galleryPath === "string" ? route.query.galleryPath : null));

const selectedGalleryPath = ref<string | null>(requestedGalleryPath.value);
const galleryPage = ref(1);
const galleryPageSize = ref<10 | 25 | 50>(10);
const sending = ref(false);
const preparingGallery = ref(false);
const status = ref<string | null>(null);
const failure = ref<string | null>(null);
const responsePayload = ref<unknown>(null);
const responseImage = ref<N8nImagePreview | null>(null);

const { images: galleryImages, loading: loadingGallery, error: galleryError, refresh: refreshGallery } = useGalleryImages({
  userId,
  enabled: true,
  scope: "n8n",
});

const selectedGalleryImage = computed<GalleryImage | null>(
  () => galleryImages.value.find((image) => image.path === selectedGalleryPath.value) || null,
);

const selectedGalleryNeedsJpegWizard = computed(() => {
  if (!selectedGalleryImage.value) return false;
  return !isN8nSupportedImageFormat({
    contentType: selectedGalleryImage.value.contentType,
    fileName: selectedGalleryImage.value.name || selectedGalleryImage.value.path,
  });
});

const busy = computed(() => sending.value || preparingGallery.value);
const totalGalleryPages = computed(() => Math.max(1, Math.ceil(galleryImages.value.length / galleryPageSize.value)));
const paginatedGalleryImages = computed(() => {
  const start = (galleryPage.value - 1) * galleryPageSize.value;
  return galleryImages.value.slice(start, start + galleryPageSize.value);
});

watch(requestedGalleryPath, (next) => {
  if (next) selectedGalleryPath.value = next;
});

watch(totalGalleryPages, (total) => {
  galleryPage.value = Math.min(galleryPage.value, total);
});

watch(galleryError, (next) => {
  if (next) failure.value = next;
});

watch(galleryImages, (nextImages) => {
  if (selectedGalleryPath.value && !nextImages.some((image) => image.path === selectedGalleryPath.value)) {
    selectedGalleryPath.value = nextImages.find((image) => image.sourceGalleryPath === selectedGalleryPath.value)?.path || null;
  }

  if (!selectedGalleryPath.value) return;
  const index = nextImages.findIndex((image) => image.path === selectedGalleryPath.value);
  if (index >= 0) galleryPage.value = Math.floor(index / galleryPageSize.value) + 1;
});

async function handlePrepareGalleryForN8n() {
  if (!user.value) {
    failure.value = "Debes iniciar sesión para preparar imágenes para n8n.";
    return;
  }

  if (!selectedGalleryPath.value) {
    failure.value = "Selecciona una imagen de la galería.";
    return;
  }

  if (!selectedGalleryNeedsJpegWizard.value) {
    status.value = "Esta imagen ya está en formato compatible con n8n.";
    return;
  }

  preparingGallery.value = true;
  failure.value = null;
  status.value = null;
  responsePayload.value = null;
  responseImage.value = null;

  try {
    const formData = new FormData();
    formData.append("galleryPath", selectedGalleryPath.value);
    formData.append("forceJpegConversion", "true");
    formData.append("prepareOnly", "true");

    const response = await fetch("/api/images/copies", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      wasConvertedToJpeg?: boolean;
      n8nCompatibleImage?: StoredN8nImage | null;
    };

    if (!response.ok) {
      throw new Error(payload.error || "No se pudo convertir la imagen a JPG para n8n.");
    }

    if (payload.n8nCompatibleImage) {
      await refreshGallery({ force: true });
      selectedGalleryPath.value = payload.n8nCompatibleImage.path;
      status.value = `Paso 1 completado: ${payload.n8nCompatibleImage.name} lista para enviar a n8n.`;
    } else if (payload.wasConvertedToJpeg) {
      await refreshGallery({ force: true });
      status.value = "Paso 1 completado: imagen convertida a JPG para n8n.";
    } else {
      status.value = "Esta imagen ya estaba en formato compatible con n8n.";
    }
  } catch (reason) {
    failure.value = reason instanceof Error ? reason.message : "No se pudo preparar la imagen para n8n.";
  } finally {
    preparingGallery.value = false;
  }
}

async function handleSendToN8n() {
  if (!user.value) {
    failure.value = "Debes iniciar sesión para enviar imágenes a n8n.";
    return;
  }

  if (selectedGalleryNeedsJpegWizard.value) {
    failure.value = "Primero convierte la imagen a JPG en el Paso 1.";
    return;
  }

  if (!selectedGalleryPath.value) {
    failure.value = "Selecciona una imagen de la galería.";
    return;
  }

  failure.value = null;
  status.value = null;
  responsePayload.value = null;
  responseImage.value = null;

  const formData = new FormData();
  formData.append("galleryPath", selectedGalleryPath.value);

  sending.value = true;
  try {
    const response = await fetch("/api/images/copies", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      n8n?: unknown;
      n8nImage?: N8nImagePreview | null;
      n8nStoredImage?: StoredN8nImage | null;
      n8nCompatibleImage?: StoredN8nImage | null;
      source?: string;
      fileName?: string;
      wasConvertedToJpeg?: boolean;
    };

    if (!response.ok) {
      throw new Error(payload.error || "No se pudo completar el envío a n8n.");
    }

    const sourceLabel = payload.source === "gallery" ? "galería" : payload.source === "n8n" ? "galería n8n" : "galería";
    const convertedLabel = payload.wasConvertedToJpeg ? " (convertida a JPG)" : "";
    const storedLabel = payload.n8nStoredImage ? " Resultado n8n guardado y reemplazado en galería n8n." : "";
    const compatibleLabel = payload.n8nCompatibleImage ? " Galería n8n actualizada con versión JPG." : "";
    status.value = `Imagen enviada a n8n desde ${sourceLabel}: ${payload.fileName || "archivo"}${convertedLabel}.${storedLabel}${compatibleLabel}`;

    responseImage.value = payload.n8nImage || null;
    responsePayload.value = responseImage.value
      ? {
          n8nResponseType: "image",
          contentType: responseImage.value.contentType,
          fileName: responseImage.value.fileName,
          sizeBytes: responseImage.value.sizeBytes,
          n8nStoredImage: payload.n8nStoredImage || null,
        }
      : payload.n8n ?? payload;

    if (payload.n8nStoredImage || payload.n8nCompatibleImage) {
      await refreshGallery({ force: true });
      selectedGalleryPath.value = payload.n8nStoredImage?.path || payload.n8nCompatibleImage?.path || null;
    }
  } catch (reason) {
    failure.value = reason instanceof Error ? reason.message : "No se pudo enviar la imagen a n8n.";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <Card>
    <CardHeader class="space-y-3">
      <div>
        <CardTitle class="flex items-center gap-2">
          <Sparkles class="size-5" />
          Copias de Imágenes con n8n
        </CardTitle>
        <CardDescription>
          Elige una imagen desde galería y envíala al webhook para crear copias con tu flujo de n8n.
        </CardDescription>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Fuente: Galería</Badge>
        <Badge variant="outline">{{ galleryImages.length }} en galería</Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <p v-if="failure" class="text-sm text-destructive">{{ failure }}</p>
      <p v-if="status" class="text-sm text-emerald-600">{{ status }}</p>

      <div class="space-y-3 rounded-lg border p-4">
        <div class="flex justify-between gap-2">
          <Button as-child variant="outline" size="sm" :disabled="busy">
            <NuxtLink to="/dashboard/images/gallery">
              <Images class="size-4" />
              Ir a galería
            </NuxtLink>
          </Button>
          <Button variant="outline" size="sm" :disabled="loadingGallery || busy || !user" @click="refreshGallery({ force: true })">
            <Loader2 v-if="loadingGallery" class="size-4 animate-spin" />
            <RefreshCcw v-else class="size-4" />
            Recargar galería
          </Button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="image in paginatedGalleryImages"
            :key="image.path"
            type="button"
            class="overflow-hidden rounded-lg border text-left transition"
            :class="image.path === selectedGalleryPath ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40'"
            :disabled="busy"
            @click="selectedGalleryPath = image.path"
          >
            <div class="relative aspect-[4/3] bg-muted">
              <Badge variant="secondary" class="pointer-events-none absolute left-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65">
                {{ getImageFormatLabel({ contentType: image.contentType, fileName: image.name || image.path }) }}
              </Badge>
              <Badge v-if="image.isN8nGenerated" variant="secondary" class="pointer-events-none absolute right-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65">
                <Star class="mr-1 size-3 fill-current" />
                n8n
              </Badge>
              <img v-if="isPreviewableImage(image.contentType, image.name)" :src="image.downloadURL" :alt="image.name" class="size-full object-cover">
              <div v-else class="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                Vista previa no disponible para {{ image.contentType || "este formato" }}
              </div>
            </div>
            <div class="space-y-1 p-2">
              <p class="truncate text-xs font-medium">{{ image.name }}</p>
              <p class="text-xs text-muted-foreground">{{ formatBytes(image.sizeBytes) }}</p>
            </div>
          </button>
        </div>

        <DashboardGalleryPaginationControls
          :total-items="galleryImages.length"
          :page="galleryPage"
          :page-size="galleryPageSize"
          :disabled="busy || loadingGallery"
          @page-change="galleryPage = $event"
          @page-size-change="(nextSize) => { galleryPageSize = nextSize; galleryPage = 1; }"
        />

        <div v-if="selectedGalleryImage" class="space-y-1">
          <p class="text-xs text-muted-foreground">Seleccionada: {{ selectedGalleryImage.name }}</p>
          <p v-if="selectedGalleryNeedsJpegWizard" class="text-xs text-amber-700">
            Esta imagen no es compatible con n8n. Debes convertir a JPG y luego copiar.
          </p>
          <p v-else class="text-xs text-muted-foreground">Formato compatible con n8n, envío directo.</p>
        </div>
        <p v-else class="text-xs text-muted-foreground">Selecciona una imagen de la galería.</p>
      </div>

      <div class="flex justify-end gap-2">
        <Button
          v-if="selectedGalleryNeedsJpegWizard"
          size="sm"
          variant="outline"
          :disabled="busy || !user || !selectedGalleryPath"
          @click="handlePrepareGalleryForN8n"
        >
          <Loader2 v-if="preparingGallery" class="size-4 animate-spin" />
          <Sparkles v-else class="size-4" />
          Paso 1: Convertir a JPG
        </Button>
        <Button size="sm" :disabled="busy || !user || !selectedGalleryPath || selectedGalleryNeedsJpegWizard" @click="handleSendToN8n">
          <Loader2 v-if="sending" class="size-4 animate-spin" />
          <Sparkles v-else class="size-4" />
          Enviar a n8n
        </Button>
      </div>

      <section v-if="responsePayload" class="space-y-2 rounded-lg border p-4">
        <p class="text-sm font-medium">Respuesta de n8n</p>
        <pre class="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{{ JSON.stringify(responsePayload, null, 2) }}</pre>
      </section>

      <section v-if="responseImage" class="space-y-2 rounded-lg border p-4">
        <p class="text-sm font-medium">Imagen devuelta por n8n</p>
        <p class="text-xs text-muted-foreground">
          {{ responseImage.fileName }} · {{ responseImage.contentType }} · {{ formatBytes(responseImage.sizeBytes) }}
        </p>
        <div class="aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-lg border bg-muted">
          <img :src="responseImage.dataUrl" :alt="responseImage.fileName || 'Imagen generada por n8n'" class="size-full object-contain">
        </div>
      </section>
    </CardContent>
  </Card>
</template>
