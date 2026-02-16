"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ImagePlus, Loader2, RefreshCcw, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
type StoredFile = {
  path: string;
  name: string;
  downloadURL: string;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
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

async function uploadOptimizedImage(file: File): Promise<{
  optimizedBytes: number;
  originalBytes: number;
}> {
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
    image?: { sizeBytes?: number | null };
  } | null;
  const optimizedBytes = Number(payload?.image?.sizeBytes || 0);
  const originalBytes = file.size;

  return { optimizedBytes, originalBytes };
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

    try {
      for (const file of files) {
        setCurrentFileName(file.name);
        setProgress(10);
        setStatus(`Optimizando ${file.name}...`);

        const optimized = await uploadOptimizedImage(file);
        const ratio = optimized.originalBytes
          ? Math.max(0, 100 - Math.round((optimized.optimizedBytes / optimized.originalBytes) * 100))
          : 0;

        setStatus(`Procesando ${file.name} (ahorro aproximado ${ratio}%)...`);
        setProgress(100);
      }

      setFiles([]);
      setStatus("Imágenes optimizadas y subidas correctamente.");
      await loadImages();
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

  const totalBytes = useMemo(
    () => images.reduce((acc, image) => acc + (image.sizeBytes || 0), 0),
    [images],
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              Gestión de Imágenes Web
            </CardTitle>
            <CardDescription>
              Guarda originales y versiones WebP optimizadas en `davalbra-imagenes-fix`.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadImages()} disabled={loadingImages || busy || !user}>
              {loadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Recargar
            </Button>
            <Button size="sm" onClick={() => void handleUploadAll()} disabled={busy || !user || !files.length}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Optimizar y subir
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{images.length} imágenes</Badge>
          <Badge variant="outline">{formatBytes(totalBytes)} total</Badge>
          {files.length > 0 ? <Badge>{files.length} pendientes</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <label className="block rounded-lg border border-dashed border-border p-4 text-sm">
          <span className="mb-2 block text-muted-foreground">
            Selecciona imágenes (`png`, `jpg`, `jpeg`, `webp`, `avif`, `heic`, `heif`, `gif`, `tiff`, `bmp`, `svg`).
          </span>
          <input
            type="file"
            multiple
            accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.svg"
            disabled={!user || loading || busy}
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
            className="block w-full text-sm"
          />
        </label>

        {busy && currentFileName ? (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{currentFileName}</p>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">{status || "Procesando..."}</p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
        {status && !busy ? <p className="text-sm text-emerald-600">{status}</p> : null}

        {!user && !loading ? (
          <p className="text-sm text-muted-foreground">
            Inicia sesión para administrar imágenes dentro del dashboard.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <article key={image.path} className="overflow-hidden rounded-lg border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={image.downloadURL} alt={image.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <div className="space-y-3 p-3">
                <div>
                  <p className="truncate text-sm font-medium">{image.name}</p>
                  <p className="text-xs text-muted-foreground">Subida: {formatDate(image.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(image.sizeBytes)}</p>
                </div>
                <div className="flex gap-2">
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
          <p className="text-sm text-muted-foreground">No hay imágenes todavía en tu carpeta optimizada.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
