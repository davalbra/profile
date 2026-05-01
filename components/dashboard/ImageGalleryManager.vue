<script setup lang="ts">
import {
  Check,
  Copy,
  GalleryHorizontal,
  Loader2,
  Pencil,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-vue-next"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getImageFormatLabel } from "@/lib/images/image-format-label"
import { isPreviewableImage } from "@/lib/images/is-previewable-image"
import { useImagenesRepositorio } from "@/store/repository/imagenes"
import {
  abrirAlertaProceso,
  cerrarAlertaProceso,
} from "@/utils/alertas/proceso"
import { bytesMaximosCargaImagen } from "@/utils/constants/imagenes"
import { formatearBytes } from "@/utils/formatters/archivos"
import { formatearFechaMediaConHora } from "@/utils/formatters/fechas"
import { TamanoPaginaGaleria } from "@/utils/enums/anums"

/** Services, Components */
const { user, loading, error } = useAuth()
const imagenesRepositorio = useImagenesRepositorio()

/** DefineModel, Ref, Computed */
interface VistaPreviaPendiente {
  name: string
  size: number
  previewUrl: string
}

const userId = computed(() => user.value?.uid || null)
const files = ref<File[]>([])
const galleryPage = ref(1)
const galleryPageSize = ref<TamanoPaginaGaleria>(TamanoPaginaGaleria.DIEZ)
const uploading = ref(false)
const deletingPath = ref<string | null>(null)
const editingPath = ref<string | null>(null)
const editName = ref("")
const renamingPath = ref<string | null>(null)
const status = ref<string | null>(null)
const failure = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const {
  images,
  loading: loadingImages,
  error: galleryError,
  refresh: refreshGallery,
} = useGalleryImages({
  userId,
})

const pendingPreviews = ref<VistaPreviaPendiente[]>([])

const totalGalleryPages = computed(() =>
  Math.max(1, Math.ceil(images.value.length / galleryPageSize.value)),
)
const paginatedImages = computed(() => {
  const start = (galleryPage.value - 1) * galleryPageSize.value
  return images.value.slice(start, start + galleryPageSize.value)
})

/** Functions */
function handleFileChange() {
  files.value = Array.from(fileInput.value?.files || [])
}

async function handleUploadAll() {
  if (!user.value) {
    failure.value = "Debes iniciar sesión para usar la galería."
    return
  }

  if (!files.value.length) {
    failure.value = "Selecciona al menos una imagen."
    return
  }

  uploading.value = true
  failure.value = null
  status.value = null
  abrirAlertaProceso("Subiendo imágenes")

  try {
    for (const file of files.value) {
      if (file.size > bytesMaximosCargaImagen) {
        throw new Error(`El archivo ${file.name} supera el límite de 40MB.`)
      }

      await imagenesRepositorio.subirImagenGaleria({ imagen: file })
    }

    status.value = `${files.value.length} imagen(es) subida(s) a la galería.`
    toast.success("Imágenes subidas a la galería.")
    files.value = []
    if (fileInput.value) fileInput.value.value = ""
    await refreshGallery({ force: true })
  } catch (reason) {
    failure.value =
      reason instanceof Error
        ? reason.message
        : "No se pudieron subir las imágenes."
  } finally {
    cerrarAlertaProceso()
    uploading.value = false
  }
}

async function handleDelete(path: string) {
  if (!user.value || uploading.value || deletingPath.value) return
  if (!window.confirm("¿Eliminar esta imagen de la galería?")) return

  deletingPath.value = path
  failure.value = null
  try {
    await imagenesRepositorio.eliminarImagenGaleria({ path })

    status.value = "Imagen eliminada de galería."
    if (editingPath.value === path) {
      editingPath.value = null
      editName.value = ""
    }
    await refreshGallery({ force: true })
  } catch (reason) {
    failure.value =
      reason instanceof Error
        ? reason.message
        : "No se pudo eliminar la imagen."
  } finally {
    deletingPath.value = null
  }
}

async function handleCopy(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    status.value = "URL copiada al portapapeles."
  } catch {
    failure.value = "No se pudo copiar la URL."
  }
}

function startRename(path: string, currentName: string) {
  editingPath.value = path
  editName.value = currentName
  failure.value = null
}

function cancelRename() {
  if (renamingPath.value) return
  editingPath.value = null
  editName.value = ""
}

async function handleRename(path: string) {
  const normalizedName = editName.value.trim()
  if (!normalizedName) {
    failure.value = "El nombre no puede estar vacío."
    return
  }

  renamingPath.value = path
  failure.value = null
  try {
    await imagenesRepositorio.renombrarImagenGaleria({
      path,
      name: normalizedName,
    })

    status.value = "Nombre de imagen actualizado."
    editingPath.value = null
    editName.value = ""
    await refreshGallery({ force: true })
  } catch (reason) {
    failure.value =
      reason instanceof Error
        ? reason.message
        : "No se pudo renombrar la imagen."
  } finally {
    renamingPath.value = null
  }
}

function handleGalleryPageSizeChange(nextSize: TamanoPaginaGaleria) {
  galleryPageSize.value = nextSize
  galleryPage.value = 1
}

/** Vue */
watch(
  files,
  (next, _previous, onCleanup) => {
    const previews = next.map((file) => ({
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }))
    pendingPreviews.value = previews
    onCleanup(() => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl))
    })
  },
  { immediate: true },
)

watch(totalGalleryPages, (total) => {
  galleryPage.value = Math.min(galleryPage.value, total)
})

watch(galleryError, (next) => {
  if (next) failure.value = next
})
</script>

<template>
  <Card>
    <CardHeader class="space-y-3">
      <div>
        <CardTitle class="flex items-center gap-2">
          <GalleryHorizontal class="size-5" />
          Galería de Imágenes
        </CardTitle>
        <CardDescription>
          Sube imágenes a una galería central y envíalas directo al filtro n8n o
          a optimización web.
        </CardDescription>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{{ images.length }} en galería</Badge>
        <Badge v-if="files.length > 0">{{ files.length }} pendientes</Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <p v-if="failure" class="text-sm text-destructive">{{ failure }}</p>
      <p v-if="status" class="text-sm text-emerald-600">{{ status }}</p>

      <section class="space-y-4 rounded-lg border p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-medium">1. Subir nuevas imágenes a galería</p>
          <Button
            size="sm"
            :disabled="uploading || !user || !files.length"
            @click="handleUploadAll"
          >
            <Loader2 v-if="uploading" class="size-4 animate-spin" />
            <Upload v-else class="size-4" />
            Subir a galería
          </Button>
        </div>

        <div class="rounded-lg border border-dashed border-border p-4 text-sm">
          <input
            id="images-gallery-upload-input"
            ref="fileInput"
            type="file"
            multiple
            accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.svg"
            class="sr-only"
            :disabled="!user || loading || uploading"
            @change="handleFileChange"
          />
          <label
            for="images-gallery-upload-input"
            class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
            :class="
              !user || loading || uploading
                ? 'pointer-events-none cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'
            "
          >
            <Upload class="size-4" />
            Seleccionar imágenes
          </label>
          <p class="mt-2 text-xs text-muted-foreground">
            {{
              files.length > 0
                ? `${files.length} archivo(s) seleccionado(s)`
                : "Ningún archivo seleccionado"
            }}
          </p>
        </div>

        <div
          v-if="pendingPreviews.length > 0"
          class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <article
            v-for="preview in pendingPreviews"
            :key="preview.previewUrl"
            class="overflow-hidden rounded-lg border bg-card"
          >
            <div class="relative aspect-[4/3] bg-muted">
              <Badge
                variant="secondary"
                class="pointer-events-none absolute left-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
              >
                {{ getImageFormatLabel({ fileName: preview.name }) }}
              </Badge>
              <img
                :src="preview.previewUrl"
                :alt="`Previsualización de ${preview.name}`"
                class="size-full object-cover"
              />
            </div>
            <div class="space-y-1 p-2">
              <p class="truncate text-xs font-medium">{{ preview.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatearBytes(preview.size) }}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="space-y-4 rounded-lg border p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-medium">2. Imágenes guardadas en galería</p>
          <Button
            variant="outline"
            size="sm"
            :disabled="loadingImages || uploading || !user"
            @click="refreshGallery({ force: true })"
          >
            <Loader2 v-if="loadingImages" class="size-4 animate-spin" />
            <RefreshCcw v-else class="size-4" />
            Recargar
          </Button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="image in paginatedImages"
            :key="image.path"
            class="flex h-full flex-col overflow-hidden rounded-lg border bg-card"
          >
            <div class="relative aspect-[4/3] bg-muted">
              <Badge
                variant="secondary"
                class="pointer-events-none absolute left-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
              >
                {{
                  getImageFormatLabel({
                    contentType: image.contentType,
                    fileName: image.name || image.path,
                  })
                }}
              </Badge>
              <img
                v-if="isPreviewableImage(image.contentType, image.name)"
                :src="image.downloadURL"
                :alt="image.name"
                class="size-full object-cover"
              />
              <div
                v-else
                class="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground"
              >
                Vista previa no disponible para
                {{ image.contentType || "este formato" }}
              </div>
            </div>

            <div class="flex flex-1 flex-col gap-3 p-3">
              <div class="space-y-1">
                <div v-if="editingPath === image.path" class="space-y-2">
                  <Input
                    v-model="editName"
                    maxlength="120"
                    placeholder="Nuevo nombre de imagen"
                    class="h-8"
                    :disabled="renamingPath === image.path"
                    @keydown.enter.prevent="
                      renamingPath !== image.path && handleRename(image.path)
                    "
                  />
                  <div class="flex gap-2">
                    <Button
                      size="sm"
                      class="h-8"
                      :disabled="renamingPath === image.path"
                      @click="handleRename(image.path)"
                    >
                      <Loader2
                        v-if="renamingPath === image.path"
                        class="size-4 animate-spin"
                      />
                      <Check v-else class="size-4" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      class="h-8"
                      :disabled="renamingPath === image.path"
                      @click="cancelRename"
                    >
                      <X class="size-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
                <div v-else class="flex items-start justify-between gap-2">
                  <p class="truncate text-sm font-medium">{{ image.name }}</p>
                  <Button
                    size="icon"
                    variant="ghost"
                    class="size-7"
                    :disabled="
                      uploading ||
                      Boolean(deletingPath) ||
                      Boolean(renamingPath)
                    "
                    @click="startRename(image.path, image.name)"
                  >
                    <Pencil class="size-4" />
                    <span class="sr-only">Renombrar imagen</span>
                  </Button>
                </div>
                <p class="text-xs text-muted-foreground">
                  Subida: {{ formatearFechaMediaConHora(image.createdAt) }}
                </p>
                <p class="text-xs text-muted-foreground">
                  Tamaño: {{ formatearBytes(image.sizeBytes) }}
                </p>
              </div>

              <div class="mt-auto grid grid-cols-2 gap-2">
                <Button as-child size="sm">
                  <NuxtLink
                    :to="`/dashboard/images/copies?galleryPath=${encodeURIComponent(image.path)}`"
                  >
                    <Sparkles class="size-4" />
                    Filtrar n8n
                  </NuxtLink>
                </Button>
                <Button as-child size="sm" variant="outline">
                  <NuxtLink
                    :to="`/dashboard/images/optimize?galleryPath=${encodeURIComponent(image.path)}`"
                  >
                    <Zap class="size-4" />
                    Optimizar
                  </NuxtLink>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  @click="handleCopy(image.downloadURL)"
                >
                  <Copy class="size-4" />
                  Copiar URL
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  :disabled="
                    uploading ||
                    deletingPath === image.path ||
                    renamingPath === image.path
                  "
                  @click="handleDelete(image.path)"
                >
                  <Loader2
                    v-if="deletingPath === image.path"
                    class="size-4 animate-spin"
                  />
                  <Trash2 v-else class="size-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          </article>
        </div>

        <DashboardGalleryPaginationControls
          :total-items="images.length"
          :page="galleryPage"
          :page-size="galleryPageSize"
          :disabled="
            uploading ||
            loadingImages ||
            Boolean(renamingPath) ||
            Boolean(deletingPath)
          "
          @page-change="galleryPage = $event"
          @page-size-change="handleGalleryPageSizeChange"
        />

        <p
          v-if="!loadingImages && user && images.length === 0"
          class="text-sm text-muted-foreground"
        >
          No hay imágenes en galería todavía.
        </p>
      </section>
    </CardContent>
  </Card>
</template>
