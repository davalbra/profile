"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {useSearchParams} from "next/navigation";
import {CopyPlus, GalleryHorizontal, Loader2, RefreshCcw, Upload} from "lucide-react";
import Image from "next/image";
import {useAuth} from "@/components/providers/auth-provider";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

type SourceMode = "local" | "gallery";

type GalleryImage = {
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

export function ImageCopiesManager() {
    const {user, loading, error} = useAuth();
    const userId = user?.uid || null;
    const searchParams = useSearchParams();
    const requestedGalleryPath = searchParams.get("galleryPath");

    const [sourceMode, setSourceMode] = useState<SourceMode>(requestedGalleryPath ? "gallery" : "local");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [selectedGalleryPath, setSelectedGalleryPath] = useState<string | null>(requestedGalleryPath);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [responsePayload, setResponsePayload] = useState<unknown>(null);

    useEffect(() => {
        if (!requestedGalleryPath) {
            return;
        }

        setSourceMode("gallery");
        setSelectedGalleryPath(requestedGalleryPath);
    }, [requestedGalleryPath]);

    const localPreviewUrl = useMemo(() => {
        if (!selectedFile) {
            return null;
        }

        return URL.createObjectURL(selectedFile);
    }, [selectedFile]);

    useEffect(() => {
        return () => {
            if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
            }
        };
    }, [localPreviewUrl]);

    const selectedGalleryImage = useMemo(
        () => galleryImages.find((image) => image.path === selectedGalleryPath) || null,
        [galleryImages, selectedGalleryPath],
    );

    const loadGallery = useCallback(async () => {
        if (!userId) {
            setGalleryImages([]);
            return;
        }

        setLoadingGallery(true);
        setFailure(null);
        try {
            const response = await fetch("/api/images/gallery", {
                method: "GET",
                cache: "no-store",
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(payload.error || "No se pudo cargar la galería.");
            }

            const payload = (await response.json()) as { images?: GalleryImage[] };
            const items = payload.images || [];
            setGalleryImages(items);

            setSelectedGalleryPath((currentPath) =>
                currentPath && !items.some((image) => image.path === currentPath) ? null : currentPath,
            );
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudo cargar la galería.";
            setFailure(message);
        } finally {
            setLoadingGallery(false);
        }
    }, [userId]);

    useEffect(() => {
        if (sourceMode === "gallery" || requestedGalleryPath) {
            void loadGallery();
        }
    }, [loadGallery, requestedGalleryPath, sourceMode]);

    async function handleSendToN8n() {
        if (!user) {
            setFailure("Debes iniciar sesión para enviar imágenes a n8n.");
            return;
        }

        setFailure(null);
        setStatus(null);
        setResponsePayload(null);

        const formData = new FormData();

        if (sourceMode === "local") {
            if (!selectedFile) {
                setFailure("Selecciona una imagen local.");
                return;
            }

            if (selectedFile.size > MAX_UPLOAD_BYTES) {
                setFailure("La imagen local supera el límite de 40MB.");
                return;
            }

            formData.append("image", selectedFile);
        } else {
            if (!selectedGalleryPath) {
                setFailure("Selecciona una imagen de la galería.");
                return;
            }

            formData.append("galleryPath", selectedGalleryPath);
        }

        setSending(true);
        try {
            const response = await fetch("/api/images/copies", {
                method: "POST",
                body: formData,
            });

            const payload = (await response.json().catch(() => ({}))) as {
                ok?: boolean;
                error?: string;
                n8n?: unknown;
                source?: string;
                fileName?: string;
            };

            if (!response.ok) {
                throw new Error(payload.error || "No se pudo completar el envío a n8n.");
            }

            setStatus(
                `Imagen enviada a n8n desde ${payload.source === "gallery" ? "galería" : "computadora"}: ${payload.fileName || "archivo"}.`,
            );
            setResponsePayload(payload.n8n ?? payload);
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudo enviar la imagen a n8n.";
            setFailure(message);
        } finally {
            setSending(false);
        }
    }

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <CopyPlus className="h-5 w-5"/>
                        Copias de Imágenes con n8n
                    </CardTitle>
                    <CardDescription>
                        Elige una imagen desde tu computadora o desde la galería y envíala al webhook para crear copias
                        con tu flujo de n8n.
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Fuente: {sourceMode === "local" ? "Computadora" : "Galería"}</Badge>
                    {sourceMode === "gallery" ?
                        <Badge variant="outline">{galleryImages.length} en galería</Badge> : null}
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
                {status ? <p className="text-sm text-emerald-600">{status}</p> : null}

                <section className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant={sourceMode === "local" ? "default" : "outline"}
                            onClick={() => setSourceMode("local")}
                            disabled={sending}
                        >
                            <Upload className="h-4 w-4"/>
                            Desde computadora
                        </Button>
                        <Button
                            size="sm"
                            variant={sourceMode === "gallery" ? "default" : "outline"}
                            onClick={() => setSourceMode("gallery")}
                            disabled={sending}
                        >
                            <GalleryHorizontal className="h-4 w-4"/>
                            Desde galería
                        </Button>
                    </div>

                    {sourceMode === "local" ? (
                        <div className="space-y-3 rounded-lg border border-dashed p-4 text-sm">
                            <input
                                id="images-copies-local-input"
                                type="file"
                                accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.svg"
                                disabled={!user || loading || sending}
                                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                                className="sr-only"
                            />
                            <label
                                htmlFor="images-copies-local-input"
                                className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                    !user || loading || sending
                                        ? "pointer-events-none cursor-not-allowed opacity-50"
                                        : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                }`}
                            >
                                <Upload className="h-4 w-4"/>
                                Seleccionar imagen
                            </label>

                            <p className="text-xs text-muted-foreground">
                                {selectedFile ? `${selectedFile.name} (${formatBytes(selectedFile.size)})` : "Ningún archivo seleccionado"}
                            </p>

                            {localPreviewUrl ? (
                                <div
                                    className="relative aspect-[4/3] max-w-xl overflow-hidden rounded-lg border bg-muted">
                                    <Image
                                        src={localPreviewUrl}
                                        alt={selectedFile?.name || "Previsualización local"}
                                        fill
                                        unoptimized
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => void loadGallery()}
                                        disabled={loadingGallery || sending || !user}>
                                    {loadingGallery ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                        <RefreshCcw className="h-4 w-4"/>}
                                    Recargar galería
                                </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {galleryImages.map((image) => {
                                    const active = image.path === selectedGalleryPath;
                                    return (
                                        <button
                                            key={image.path}
                                            type="button"
                                            className={`overflow-hidden rounded-lg border text-left transition ${
                                                active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                                            }`}
                                            onClick={() => setSelectedGalleryPath(image.path)}
                                            disabled={sending}
                                        >
                                            <div className="relative aspect-[4/3] bg-muted">
                                                <Image src={image.downloadURL} alt={image.name} fill
                                                       className="object-cover" sizes="(max-width: 768px) 100vw, 33vw"/>
                                            </div>
                                            <div className="space-y-1 p-2">
                                                <p className="truncate text-xs font-medium">{image.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatBytes(image.sizeBytes)}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedGalleryImage ? (
                                <p className="text-xs text-muted-foreground">Seleccionada: {selectedGalleryImage.name}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">Selecciona una imagen de la galería.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => void handleSendToN8n()} disabled={sending || !user}>
                            {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <CopyPlus className="h-4 w-4"/>}
                            Enviar a n8n
                        </Button>
                    </div>
                </section>

                {responsePayload ? (
                    <section className="space-y-2 rounded-lg border p-4">
                        <p className="text-sm font-medium">Respuesta de n8n</p>
                        <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(responsePayload, null, 2)}
            </pre>
                    </section>
                ) : null}
            </CardContent>
        </Card>
    );
}
