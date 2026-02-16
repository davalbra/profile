"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Pencil,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StoredFile = {
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

type UploadResult = {
  optimizedBytes: number;
  originalBytes: number;
  savedBytes: number;
  savedPercent: number;
};

function formatBytes(bytes: number | null): string {
  if (!bytes || Number.isNaN(bytes)) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPercent(percent: number | null): string {
  if (percent === null || Number.isNaN(percent)) {
    return "-";
  }

  return `${percent.toFixed(1)}%`;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) {
    return "-";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function uploadOptimizedImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("image", file);

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
      sizeBytes?: number | null;
      originalSizeBytes?: number | null;
      optimizedSizeBytes?: number | null;
      savedBytes?: number | null;
      savedPercent?: number | null;
    };
  } | null;

  const optimizedBytes = Number(payload?.image?.optimizedSizeBytes ?? payload?.image?.sizeBytes ?? 0);
  const originalBytes = Number(payload?.image?.originalSizeBytes ?? file.size ?? 0);
  const savedBytes = Number(payload?.image?.savedBytes ?? Math.max(0, originalBytes - optimizedBytes));
  const savedPercent = Number(
    payload?.image?.savedPercent ?? (originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0),
  );

  return { optimizedBytes, originalBytes, savedBytes, savedPercent };
}

export function ImagesManager() {
  const { user, loading, error } = useAuth();
  const userId = user?.uid || null;
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [lastBatchStats, setLastBatchStats] = useState<{
    filesCount: number;
    originalBytes: number;
    optimizedBytes: number;
    savedBytes: number;
    savedPercent: number;
  } | null>(null);

  const pendingPreviews = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.previewUrl);
      });
    };
  }, [pendingPreviews]);

  const loadImages = useCallback(async () => {
    if (!userId) {
      setImages([]);
      return;
    }

    setLoadingImages(true);
    setFailure(null);
    try {
      const response = await fetch("/api/images", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudieron cargar las imágenes.");
      }

      const payload = (await response.json()) as { images?: StoredFile[] };
      setImages(payload.images || []);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No se pudieron cargar las imágenes.";
      setFailure(message);
    } finally {
      setLoadingImages(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  async function handleUploadAll() {
    if (!user) {
      setFailure("Debes iniciar sesión para administrar imágenes.");
      return;
    }

    if (!files.length) {
      setFailure("Selecciona al menos una imagen.");
      return;
    }

    setBusy(true);
    setFailure(null);
    setStatus(null);
    setLastBatchStats(null);

    try {
      let batchOriginalBytes = 0;
      let batchOptimizedBytes = 0;
      let batchSavedBytes = 0;

      for (const [index, file] of files.entries()) {
        setCurrentFileName(file.name);
        const baseProgress = Math.round((index / files.length) * 100);
        setProgress(baseProgress);
        setStatus(`Optimizando ${file.name}...`);

        const optimized = await uploadOptimizedImage(file);
        batchOriginalBytes += optimized.originalBytes;
        batchOptimizedBytes += optimized.optimizedBytes;
        batchSavedBytes += optimized.savedBytes;

        const fileProgress = Math.round(((index + 1) / files.length) * 100);
        setProgress(fileProgress);
        setStatus(
          `${file.name}: ${formatBytes(optimized.originalBytes)} -> ${formatBytes(
            optimized.optimizedBytes,
          )} (ahorro ${formatBytes(optimized.savedBytes)} / ${formatPercent(optimized.savedPercent)})`,
        );
      }

      const batchSavedPercent = batchOriginalBytes > 0 ? (batchSavedBytes / batchOriginalBytes) * 100 : 0;
      setLastBatchStats({
        filesCount: files.length,
        originalBytes: batchOriginalBytes,
        optimizedBytes: batchOptimizedBytes,
        savedBytes: batchSavedBytes,
        savedPercent: batchSavedPercent,
      });
      setFiles([]);
      setStatus(
        `Imágenes optimizadas: ${formatBytes(batchOriginalBytes)} -> ${formatBytes(batchOptimizedBytes)} (ahorro ${formatBytes(batchSavedBytes)} / ${formatPercent(batchSavedPercent)}).`,
      );
      await loadImages();
      setActiveTab("history");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No se pudo completar el proceso.";
      setFailure(message);
    } finally {
      setBusy(false);
      setCurrentFileName(null);
      setProgress(0);
    }
  }

  async function handleDelete(path: string) {
    if (!user || busy) {
      return;
    }

    const confirmed = window.confirm("¿Eliminar esta imagen del storage?");
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch("/api/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudo eliminar la imagen.");
      }

      if (editingPath === path) {
        setEditingPath(null);
        setEditName("");
      }

      await loadImages();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No se pudo eliminar la imagen.";
      setFailure(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("URL copiada al portapapeles.");
    } catch {
      setFailure("No se pudo copiar la URL.");
    }
  }

  function startRename(path: string, currentName: string) {
    setEditingPath(path);
    setEditName(currentName);
    setFailure(null);
  }

  function cancelRename() {
    setEditingPath(null);
    setEditName("");
  }

  async function handleRename(path: string) {
    const normalizedName = editName.trim();

    if (!normalizedName) {
      setFailure("El nombre no puede estar vacío.");
      return;
    }

    setRenamingPath(path);
    setFailure(null);
    try {
      const response = await fetch("/api/images", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          name: normalizedName,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "No se pudo renombrar la imagen.");
      }

      setStatus("Nombre de imagen actualizado.");
      setEditingPath(null);
      setEditName("");
      await loadImages();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No se pudo renombrar la imagen.";
      setFailure(message);
    } finally {
      setRenamingPath(null);
    }
  }

  const imagesWithStats = useMemo(
    () =>
      images.map((image) => {
        const originalBytes = image.originalSizeBytes ?? null;
        const optimizedBytes = image.optimizedSizeBytes ?? image.sizeBytes ?? null;
        const savedBytes =
          image.savedBytes ??
          (originalBytes !== null && optimizedBytes !== null ? Math.max(0, originalBytes - optimizedBytes) : null);
        const savedPercent =
          image.savedPercent ??
          (originalBytes !== null && originalBytes > 0 && savedBytes !== null
            ? Number(((savedBytes / originalBytes) * 100).toFixed(1))
            : null);

        return {
          ...image,
          originalBytes,
          optimizedBytes,
          savedBytes,
          savedPercent,
        };
      }),
    [images],
  );

  const optimizationStats = useMemo(() => {
    const withComparableSizes = imagesWithStats.filter(
      (image) => typeof image.originalBytes === "number" && typeof image.optimizedBytes === "number",
    );
    const totalOriginalBytes = withComparableSizes.reduce((acc, image) => acc + (image.originalBytes || 0), 0);
    const totalOptimizedBytes = withComparableSizes.reduce((acc, image) => acc + (image.optimizedBytes || 0), 0);
    const totalSavedBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);
    const totalSavedPercent = totalOriginalBytes > 0 ? (totalSavedBytes / totalOriginalBytes) * 100 : 0;

    return {
      imagesTracked: withComparableSizes.length,
      totalOriginalBytes,
      totalOptimizedBytes,
      totalSavedBytes,
      totalSavedPercent,
    };
  }, [imagesWithStats]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Gestión de Imágenes Web
          </CardTitle>
          <CardDescription>
            Flujo separado para optimizar nuevas imágenes, renombrarlas y revisar histórico con métricas reales.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{images.length} imágenes</Badge>
          <Badge variant="outline">{formatBytes(optimizationStats.totalOptimizedBytes)} optimizadas</Badge>
          <Badge variant="outline">
            Ahorro acumulado {formatBytes(optimizationStats.totalSavedBytes)} ({formatPercent(optimizationStats.totalSavedPercent)})
          </Badge>
          {files.length > 0 ? <Badge>{files.length} pendientes</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
        {status ? <p className="text-sm text-emerald-600">{status}</p> : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "new" | "history")} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Nueva optimización</TabsTrigger>
            <TabsTrigger value="history">Histórico y métricas</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            <section className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">1. Selecciona imágenes para optimizar</p>
                <Button size="sm" onClick={() => void handleUploadAll()} disabled={busy || !user || !files.length}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Optimizar y subir
                </Button>
              </div>

              <div className="rounded-lg border border-dashed border-border p-4 text-sm">
                <p className="mb-2 text-muted-foreground">
                  Formatos soportados: `png`, `jpg`, `jpeg`, `webp`, `avif`, `heic`, `heif`, `gif`, `tiff`, `bmp`, `svg`.
                </p>
                <input
                  id="images-upload-input"
                  type="file"
                  multiple
                  accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.svg"
                  disabled={!user || loading || busy}
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                  className="sr-only"
                />
                <label
                  htmlFor="images-upload-input"
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    !user || loading || busy
                      ? "pointer-events-none cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar imágenes
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  {files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : "Ningún archivo seleccionado"}
                </p>
              </div>

              {pendingPreviews.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    2. Previsualización ({pendingPreviews.length} seleccionada{pendingPreviews.length > 1 ? "s" : ""})
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {pendingPreviews.map((preview) => (
                      <article key={preview.previewUrl} className="overflow-hidden rounded-lg border bg-card">
                        <div className="relative aspect-[4/3] bg-muted">
                          <Image
                            src={preview.previewUrl}
                            alt={`Previsualización de ${preview.name}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 25vw"
                          />
                        </div>
                        <div className="space-y-1 p-2">
                          <p className="truncate text-xs font-medium">{preview.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(preview.size)}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {busy && currentFileName ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">Optimizando: {currentFileName}</p>
                  <Progress value={progress} />
                </div>
              ) : null}
            </section>

            {lastBatchStats ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Última carga: {lastBatchStats.filesCount} archivo(s)
                </p>
                <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90">
                  {formatBytes(lastBatchStats.originalBytes)} {"->"} {formatBytes(lastBatchStats.optimizedBytes)} | ahorro{" "}
                  {formatBytes(lastBatchStats.savedBytes)} ({formatPercent(lastBatchStats.savedPercent)})
                </p>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => void loadImages()} disabled={loadingImages || busy || !user}>
                {loadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Recargar
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Original acumulado</p>
                <p className="mt-1 text-lg font-semibold">{formatBytes(optimizationStats.totalOriginalBytes)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Optimizado acumulado</p>
                <p className="mt-1 text-lg font-semibold">{formatBytes(optimizationStats.totalOptimizedBytes)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Ahorro acumulado</p>
                <p className="mt-1 text-lg font-semibold">{formatBytes(optimizationStats.totalSavedBytes)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Reducción promedio</p>
                <p className="mt-1 text-lg font-semibold">{formatPercent(optimizationStats.totalSavedPercent)}</p>
                <p className="text-xs text-muted-foreground">{optimizationStats.imagesTracked} imágenes con comparación</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {imagesWithStats.map((image) => (
                <article key={image.path} className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image src={image.downloadURL} alt={image.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-3">
                    <div className="space-y-2">
                      {editingPath === image.path ? (
                        <div className="space-y-2">
                          <Input
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && renamingPath !== image.path) {
                                event.preventDefault();
                                void handleRename(image.path);
                              }
                            }}
                            maxLength={120}
                            placeholder="Nuevo nombre (.avif opcional)"
                            className="h-8"
                            disabled={renamingPath === image.path}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => void handleRename(image.path)}
                              disabled={renamingPath === image.path}
                            >
                              {renamingPath === image.path ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={cancelRename}
                              disabled={renamingPath === image.path}
                            >
                              <X className="h-4 w-4" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium">{image.name}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startRename(image.path, image.name)}
                            disabled={busy}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Renombrar imagen</span>
                          </Button>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">Subida: {formatDate(image.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">Original: {formatBytes(image.originalBytes)}</p>
                      <p className="text-xs text-muted-foreground">Optimizada: {formatBytes(image.optimizedBytes)}</p>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Ahorro: {formatBytes(image.savedBytes)} ({formatPercent(image.savedPercent)})
                      </p>
                      {image.optimizationStats ? (
                        <p className="text-[11px] text-muted-foreground">
                          {image.optimizationStats.engine} · q{image.optimizationStats.quality ?? "-"} · e{image.optimizationStats.effort ?? "-"}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void handleCopy(image.downloadURL)} className="flex-1">
                        <Copy className="h-4 w-4" />
                        Copiar URL
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDelete(image.path)}
                        disabled={busy}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!loadingImages && user && images.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay imágenes todavía en tu histórico optimizado.</p>
            ) : null}
          </TabsContent>
        </Tabs>

        {!user && !loading ? (
          <p className="text-sm text-muted-foreground">Inicia sesión para administrar imágenes dentro del dashboard.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
