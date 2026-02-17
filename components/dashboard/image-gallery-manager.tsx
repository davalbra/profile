"use client";

import {useEffect, useMemo, useState} from "react";
import {
    Check,
    Copy,
    GalleryHorizontal,
    Loader2,
    Pencil,
    RefreshCcw,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import Image from "next/image";
import {useAuth} from "@/components/providers/auth-provider";
import {GalleryPaginationControls} from "@/components/dashboard/gallery-pagination-controls";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useGalleryImages} from "@/hooks/use-gallery-images";
import {Input} from "@/components/ui/input";
import {getImageFormatLabel} from "@/lib/images/image-format-label";
import {isPreviewableImage} from "@/lib/images/is-previewable-image";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

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

export function ImageGalleryManager() {
    const {user, loading, error} = useAuth();
    const userId = user?.uid || null;
    const [files, setFiles] = useState<File[]>([]);
    const [galleryPage, setGalleryPage] = useState(1);
    const [galleryPageSize, setGalleryPageSize] = useState<10 | 25 | 50>(10);
    const [uploading, setUploading] = useState(false);
    const [deletingPath, setDeletingPath] = useState<string | null>(null);
    const [editingPath, setEditingPath] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const {
        images,
        loading: loadingImages,
        error: galleryError,
        refresh: refreshGallery,
    } = useGalleryImages({userId});

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

    const paginatedImages = useMemo(() => {
        const start = (galleryPage - 1) * galleryPageSize;
        return images.slice(start, start + galleryPageSize);
    }, [galleryPage, galleryPageSize, images]);

    const totalGalleryPages = useMemo(
        () => Math.max(1, Math.ceil(images.length / galleryPageSize)),
        [galleryPageSize, images.length],
    );

    useEffect(() => {
        setGalleryPage((currentPage) => Math.min(currentPage, totalGalleryPages));
    }, [totalGalleryPages]);

    useEffect(() => {
        if (!galleryError) {
            return;
        }
        setFailure(galleryError);
    }, [galleryError]);

    async function handleUploadAll() {
        if (!user) {
            setFailure("Debes iniciar sesión para usar la galería.");
            return;
        }

        if (!files.length) {
            setFailure("Selecciona al menos una imagen.");
            return;
        }

        setUploading(true);
        setFailure(null);
        setStatus(null);

        try {
            for (const file of files) {
                if (file.size > MAX_UPLOAD_BYTES) {
                    throw new Error(`El archivo ${file.name} supera el límite de 40MB.`);
                }

                const formData = new FormData();
                formData.append("image", file);

                const response = await fetch("/api/images/gallery", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const payload = (await response.json().catch(() => ({}))) as { error?: string };
                    throw new Error(payload.error || `No se pudo subir ${file.name}.`);
                }
            }

            setStatus(`${files.length} imagen(es) subida(s) a la galería.`);
            setFiles([]);
            await refreshGallery({force: true});
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudieron subir las imágenes.";
            setFailure(message);
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(path: string) {
        if (!user || uploading || deletingPath) {
            return;
        }

        const confirmed = window.confirm("¿Eliminar esta imagen de la galería?");
        if (!confirmed) {
            return;
        }

        setDeletingPath(path);
        setFailure(null);
        try {
            const response = await fetch("/api/images/gallery", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({path}),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(payload.error || "No se pudo eliminar la imagen.");
            }

            setStatus("Imagen eliminada de galería.");
            if (editingPath === path) {
                setEditingPath(null);
                setEditName("");
            }
            await refreshGallery({force: true});
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudo eliminar la imagen.";
            setFailure(message);
        } finally {
            setDeletingPath(null);
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
        if (renamingPath) {
            return;
        }
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
            const response = await fetch("/api/images/gallery", {
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
            await refreshGallery({force: true});
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudo renombrar la imagen.";
            setFailure(message);
        } finally {
            setRenamingPath(null);
        }
    }

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <GalleryHorizontal className="h-5 w-5"/>
                        Galería de Imágenes
                    </CardTitle>
                    <CardDescription>
                        Sube imágenes a una galería central y luego elige si quieres optimizarlas o enviarlas al flujo
                        de copias con n8n.
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{images.length} en galería</Badge>
                    {files.length > 0 ? <Badge>{files.length} pendientes</Badge> : null}
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
                {status ? <p className="text-sm text-emerald-600">{status}</p> : null}

                <section className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">1. Subir nuevas imágenes a galería</p>
                        <Button size="sm" onClick={() => void handleUploadAll()}
                                disabled={uploading || !user || !files.length}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                            Subir a galería
                        </Button>
                    </div>

                    <div className="rounded-lg border border-dashed border-border p-4 text-sm">
                        <input
                            id="images-gallery-upload-input"
                            type="file"
                            multiple
                            accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.svg"
                            disabled={!user || loading || uploading}
                            onChange={(event) => setFiles(Array.from(event.target.files || []))}
                            className="sr-only"
                        />
                        <label
                            htmlFor="images-gallery-upload-input"
                            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                !user || loading || uploading
                                    ? "pointer-events-none cursor-not-allowed opacity-50"
                                    : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                            }`}
                        >
                            <Upload className="h-4 w-4"/>
                            Seleccionar imágenes
                        </label>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : "Ningún archivo seleccionado"}
                        </p>
                    </div>

                    {pendingPreviews.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {pendingPreviews.map((preview) => (
                                <article key={preview.previewUrl} className="overflow-hidden rounded-lg border bg-card">
                                    <div className="relative aspect-[4/3] bg-muted">
                                        <Badge
                                            variant="secondary"
                                            className="pointer-events-none absolute left-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
                                        >
                                            {getImageFormatLabel({fileName: preview.name})}
                                        </Badge>
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
                    ) : null}
                </section>

                <section className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">2. Imágenes guardadas en galería</p>
                        <Button variant="outline" size="sm" onClick={() => void refreshGallery({force: true})}
                                disabled={loadingImages || uploading || !user}>
                            {loadingImages ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                <RefreshCcw className="h-4 w-4"/>}
                            Recargar
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {paginatedImages.map((image) => (
                            <article key={image.path}
                                     className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
                                <div className="relative aspect-[4/3] bg-muted">
                                    <Badge
                                        variant="secondary"
                                        className="pointer-events-none absolute left-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
                                    >
                                        {getImageFormatLabel({contentType: image.contentType, fileName: image.name || image.path})}
                                    </Badge>
                                    {isPreviewableImage(image.contentType, image.name) ? (
                                        <Image
                                            src={image.downloadURL}
                                            alt={image.name}
                                            fill
                                            unoptimized
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                        />
                                    ) : (
                                        <div
                                            className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                                            Vista previa no disponible para {image.contentType || "este formato"}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-1 flex-col gap-3 p-3">
                                    <div className="space-y-1">
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
                                                    placeholder="Nuevo nombre de imagen"
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
                                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                                        ) : (
                                                            <Check className="h-4 w-4"/>
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
                                                        <X className="h-4 w-4"/>
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
                                                    disabled={uploading || !!deletingPath || !!renamingPath}
                                                >
                                                    <Pencil className="h-4 w-4"/>
                                                    <span className="sr-only">Renombrar imagen</span>
                                                </Button>
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">Subida: {formatDate(image.createdAt)}</p>
                                        <p className="text-xs text-muted-foreground">Tamaño: {formatBytes(image.sizeBytes)}</p>
                                    </div>

                                    <div className="mt-auto grid grid-cols-2 gap-2">
                                        <Button size="sm" variant="outline"
                                                onClick={() => void handleCopy(image.downloadURL)}>
                                            <Copy className="h-4 w-4"/>
                                            Copiar URL
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => void handleDelete(image.path)}
                                            disabled={uploading || deletingPath === image.path || renamingPath === image.path}
                                        >
                                            {deletingPath === image.path ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                                <Trash2 className="h-4 w-4"/>}
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                    <GalleryPaginationControls
                        totalItems={images.length}
                        page={galleryPage}
                        pageSize={galleryPageSize}
                        onPageChange={setGalleryPage}
                        onPageSizeChange={(nextSize) => {
                            setGalleryPageSize(nextSize);
                            setGalleryPage(1);
                        }}
                        disabled={uploading || loadingImages || !!renamingPath || !!deletingPath}
                    />

                    {!loadingImages && user && images.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay imágenes en galería todavía.</p>
                    ) : null}
                </section>
            </CardContent>
        </Card>
    );
}
