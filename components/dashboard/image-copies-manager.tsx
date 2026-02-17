"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {useSearchParams} from "next/navigation";
import {CopyPlus, GalleryHorizontal, Loader2, RefreshCcw, Sparkles, Upload} from "lucide-react";
import Image from "next/image";
import {useAuth} from "@/components/providers/auth-provider";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {isPreviewableImage} from "@/lib/images/is-previewable-image";
import {isN8nSupportedImageFormat} from "@/lib/images/n8n-supported-format";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

type SourceMode = "local" | "gallery" | "optimized";

type SelectableImage = {
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
    const requestedOptimizedPath = searchParams.get("optimizedPath");

    const [sourceMode, setSourceMode] = useState<SourceMode>(
        requestedOptimizedPath ? "optimized" : requestedGalleryPath ? "gallery" : "local",
    );
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [galleryImages, setGalleryImages] = useState<SelectableImage[]>([]);
    const [optimizedImages, setOptimizedImages] = useState<SelectableImage[]>([]);
    const [selectedGalleryPath, setSelectedGalleryPath] = useState<string | null>(requestedGalleryPath);
    const [selectedOptimizedPath, setSelectedOptimizedPath] = useState<string | null>(requestedOptimizedPath);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [loadingOptimized, setLoadingOptimized] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [responsePayload, setResponsePayload] = useState<unknown>(null);
    const [galleryWizardStep, setGalleryWizardStep] = useState<1 | 2>(1);

    useEffect(() => {
        if (!requestedGalleryPath) {
            return;
        }

        setSourceMode("gallery");
        setSelectedGalleryPath(requestedGalleryPath);
    }, [requestedGalleryPath]);

    useEffect(() => {
        if (!requestedOptimizedPath) {
            return;
        }

        setSourceMode("optimized");
        setSelectedOptimizedPath(requestedOptimizedPath);
    }, [requestedOptimizedPath]);

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

    const selectedOptimizedImage = useMemo(
        () => optimizedImages.find((image) => image.path === selectedOptimizedPath) || null,
        [optimizedImages, selectedOptimizedPath],
    );

    const selectedGalleryNeedsJpegWizard = useMemo(() => {
        if (!selectedGalleryImage) {
            return false;
        }

        return !isN8nSupportedImageFormat({
            contentType: selectedGalleryImage.contentType,
            fileName: selectedGalleryImage.name || selectedGalleryImage.path,
        });
    }, [selectedGalleryImage]);

    useEffect(() => {
        setGalleryWizardStep(1);
    }, [selectedGalleryPath, sourceMode]);

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

            const payload = (await response.json()) as { images?: SelectableImage[] };
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

    const loadOptimized = useCallback(async () => {
        if (!userId) {
            setOptimizedImages([]);
            return;
        }

        setLoadingOptimized(true);
        setFailure(null);
        try {
            const response = await fetch("/api/images", {
                method: "GET",
                cache: "no-store",
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(payload.error || "No se pudieron cargar las optimizadas.");
            }

            const payload = (await response.json()) as { images?: SelectableImage[] };
            const items = payload.images || [];
            setOptimizedImages(items);

            setSelectedOptimizedPath((currentPath) =>
                currentPath && !items.some((image) => image.path === currentPath) ? null : currentPath,
            );
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudieron cargar las optimizadas.";
            setFailure(message);
        } finally {
            setLoadingOptimized(false);
        }
    }, [userId]);

    useEffect(() => {
        if (sourceMode === "gallery" || requestedGalleryPath) {
            void loadGallery();
        }
    }, [loadGallery, requestedGalleryPath, sourceMode]);

    useEffect(() => {
        if (sourceMode === "optimized" || requestedOptimizedPath) {
            void loadOptimized();
        }
    }, [loadOptimized, requestedOptimizedPath, sourceMode]);

    async function handleSendToN8n() {
        if (!user) {
            setFailure("Debes iniciar sesión para enviar imágenes a n8n.");
            return;
        }

        if (sourceMode === "gallery" && selectedGalleryNeedsJpegWizard && galleryWizardStep === 1) {
            setFailure(null);
            setResponsePayload(null);
            setStatus("Paso 1/2 listo: conversión a JPG activada. Presiona de nuevo para copiar a n8n.");
            setGalleryWizardStep(2);
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
        } else if (sourceMode === "gallery") {
            if (!selectedGalleryPath) {
                setFailure("Selecciona una imagen de la galería.");
                return;
            }

            formData.append("galleryPath", selectedGalleryPath);
            if (selectedGalleryNeedsJpegWizard) {
                formData.append("forceJpegConversion", "true");
            }
        } else {
            if (!selectedOptimizedPath) {
                setFailure("Selecciona una imagen optimizada.");
                return;
            }

            formData.append("optimizedPath", selectedOptimizedPath);
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
                wasConvertedToJpeg?: boolean;
            };

            if (!response.ok) {
                throw new Error(payload.error || "No se pudo completar el envío a n8n.");
            }

            const sourceLabel =
                payload.source === "gallery"
                    ? "galería"
                    : payload.source === "optimized"
                        ? "optimizadas"
                        : "computadora";
            const convertedLabel = payload.wasConvertedToJpeg ? " (convertida a JPG)" : "";
            setStatus(`Imagen enviada a n8n desde ${sourceLabel}: ${payload.fileName || "archivo"}${convertedLabel}.`);
            setResponsePayload(payload.n8n ?? payload);
            setGalleryWizardStep(1);
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
                        Elige una imagen desde tu computadora, galería o histórico optimizado y envíala al webhook para
                        crear copias con tu flujo de n8n.
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                        Fuente: {sourceMode === "local" ? "Computadora" : sourceMode === "gallery" ? "Galería" : "Optimizadas"}
                    </Badge>
                    {sourceMode === "gallery" ?
                        <Badge variant="outline">{galleryImages.length} en galería</Badge> : null}
                    {sourceMode === "optimized" ?
                        <Badge variant="outline">{optimizedImages.length} optimizadas</Badge> : null}
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
                        <Button
                            size="sm"
                            variant={sourceMode === "optimized" ? "default" : "outline"}
                            onClick={() => setSourceMode("optimized")}
                            disabled={sending}
                        >
                            <Sparkles className="h-4 w-4"/>
                            Desde optimizadas
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
                    ) : sourceMode === "gallery" ? (
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
                                                {isPreviewableImage(image.contentType, image.name) ? (
                                                    <Image src={image.downloadURL} alt={image.name} fill unoptimized
                                                           className="object-cover"
                                                           sizes="(max-width: 768px) 100vw, 33vw"/>
                                                ) : (
                                                    <div
                                                        className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                                                        Vista previa no disponible
                                                        para {image.contentType || "este formato"}
                                                    </div>
                                                )}
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
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Seleccionada: {selectedGalleryImage.name}</p>
                                    {selectedGalleryNeedsJpegWizard ? (
                                        <p className="text-xs text-amber-700">
                                            Esta imagen no es compatible con n8n. Se usará wizard en 2 pasos: convertir
                                            a JPG y luego copiar.
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Formato compatible con n8n, envío
                                            directo.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">Selecciona una imagen de la galería.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 rounded-lg border p-4">
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => void loadOptimized()}
                                        disabled={loadingOptimized || sending || !user}>
                                    {loadingOptimized ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                        <RefreshCcw className="h-4 w-4"/>}
                                    Recargar optimizadas
                                </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {optimizedImages.map((image) => {
                                    const active = image.path === selectedOptimizedPath;
                                    return (
                                        <button
                                            key={image.path}
                                            type="button"
                                            className={`overflow-hidden rounded-lg border text-left transition ${
                                                active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                                            }`}
                                            onClick={() => setSelectedOptimizedPath(image.path)}
                                            disabled={sending}
                                        >
                                            <div className="relative aspect-[4/3] bg-muted">
                                                {isPreviewableImage(image.contentType, image.name) ? (
                                                    <Image src={image.downloadURL} alt={image.name} fill unoptimized
                                                           className="object-cover"
                                                           sizes="(max-width: 768px) 100vw, 33vw"/>
                                                ) : (
                                                    <div
                                                        className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                                                        Vista previa no disponible
                                                        para {image.contentType || "este formato"}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1 p-2">
                                                <p className="truncate text-xs font-medium">{image.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatBytes(image.sizeBytes)}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedOptimizedImage ? (
                                <p className="text-xs text-muted-foreground">Seleccionada: {selectedOptimizedImage.name}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">Selecciona una imagen optimizada.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => void handleSendToN8n()} disabled={sending || !user}>
                            {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <CopyPlus className="h-4 w-4"/>}
                            {sourceMode === "gallery" && selectedGalleryNeedsJpegWizard
                                ? galleryWizardStep === 1
                                    ? "Paso 1: Convertir a JPG"
                                    : "Paso 2: Copiar a n8n"
                                : "Enviar a n8n"}
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
