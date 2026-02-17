"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {Images, Loader2, RefreshCcw, Sparkles, Star} from "lucide-react";
import Image from "next/image";
import {useAuth} from "@/components/providers/auth-provider";
import {GalleryPaginationControls} from "@/components/dashboard/gallery-pagination-controls";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useGalleryImages} from "@/hooks/use-gallery-images";
import {getImageFormatLabel} from "@/lib/images/image-format-label";
import {isPreviewableImage} from "@/lib/images/is-previewable-image";
import {isN8nSupportedImageFormat} from "@/lib/images/n8n-supported-format";

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
    const {user, error} = useAuth();
    const userId = user?.uid || null;
    const searchParams = useSearchParams();
    const requestedGalleryPath = searchParams.get("galleryPath");

    const [selectedGalleryPath, setSelectedGalleryPath] = useState<string | null>(requestedGalleryPath);
    const [galleryPage, setGalleryPage] = useState(1);
    const [galleryPageSize, setGalleryPageSize] = useState<10 | 25 | 50>(10);
    const [sending, setSending] = useState(false);
    const [preparingGallery, setPreparingGallery] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [responsePayload, setResponsePayload] = useState<unknown>(null);
    const [responseImage, setResponseImage] = useState<N8nImagePreview | null>(null);

    const {
        images: galleryImages,
        loading: loadingGallery,
        error: galleryError,
        refresh: refreshGallery,
    } = useGalleryImages({
        userId,
        enabled: true,
        scope: "n8n",
    });

    useEffect(() => {
        if (!requestedGalleryPath) {
            return;
        }

        setSelectedGalleryPath(requestedGalleryPath);
    }, [requestedGalleryPath]);

    const selectedGalleryImage = useMemo(
        () => galleryImages.find((image) => image.path === selectedGalleryPath) || null,
        [galleryImages, selectedGalleryPath],
    );

    const paginatedGalleryImages = useMemo(() => {
        const start = (galleryPage - 1) * galleryPageSize;
        return galleryImages.slice(start, start + galleryPageSize);
    }, [galleryImages, galleryPage, galleryPageSize]);

    const totalGalleryPages = useMemo(
        () => Math.max(1, Math.ceil(galleryImages.length / galleryPageSize)),
        [galleryImages.length, galleryPageSize],
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
    const busy = sending || preparingGallery;

    useEffect(() => {
        setGalleryPage((currentPage) => Math.min(currentPage, totalGalleryPages));
    }, [totalGalleryPages]);

    useEffect(() => {
        if (!galleryError) {
            return;
        }
        setFailure(galleryError);
    }, [galleryError]);

    useEffect(() => {
        setSelectedGalleryPath((currentPath) =>
            currentPath && !galleryImages.some((image) => image.path === currentPath)
                ? (galleryImages.find((image) => image.sourceGalleryPath === currentPath)?.path || null)
                : currentPath,
        );
    }, [galleryImages]);

    useEffect(() => {
        if (!selectedGalleryPath) {
            return;
        }

        const index = galleryImages.findIndex((image) => image.path === selectedGalleryPath);
        if (index < 0) {
            return;
        }

        const targetPage = Math.floor(index / galleryPageSize) + 1;
        setGalleryPage(targetPage);
    }, [galleryImages, galleryPageSize, selectedGalleryPath]);

    async function handlePrepareGalleryForN8n() {
        if (!user) {
            setFailure("Debes iniciar sesión para preparar imágenes para n8n.");
            return;
        }

        if (!selectedGalleryPath) {
            setFailure("Selecciona una imagen de la galería.");
            return;
        }

        if (!selectedGalleryNeedsJpegWizard) {
            setStatus("Esta imagen ya está en formato compatible con n8n.");
            return;
        }

        setPreparingGallery(true);
        setFailure(null);
        setStatus(null);
        setResponsePayload(null);
        setResponseImage(null);

        try {
            const formData = new FormData();
            formData.append("galleryPath", selectedGalleryPath);
            formData.append("forceJpegConversion", "true");
            formData.append("prepareOnly", "true");

            const response = await fetch("/api/images/copies", {
                method: "POST",
                body: formData,
            });

            const payload = (await response.json().catch(() => ({}))) as {
                ok?: boolean;
                error?: string;
                wasConvertedToJpeg?: boolean;
                n8nCompatibleImage?: StoredN8nImage | null;
            };

            if (!response.ok) {
                throw new Error(payload.error || "No se pudo convertir la imagen a JPG para n8n.");
            }

            if (payload.n8nCompatibleImage) {
                await refreshGallery({force: true});
                setSelectedGalleryPath(payload.n8nCompatibleImage.path);
                setStatus(`Paso 1 completado: ${payload.n8nCompatibleImage.name} lista para enviar a n8n.`);
            } else if (payload.wasConvertedToJpeg) {
                await refreshGallery({force: true});
                setStatus("Paso 1 completado: imagen convertida a JPG para n8n.");
            } else {
                setStatus("Esta imagen ya estaba en formato compatible con n8n.");
            }
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudo preparar la imagen para n8n.";
            setFailure(message);
        } finally {
            setPreparingGallery(false);
        }
    }

    async function handleSendToN8n() {
        if (!user) {
            setFailure("Debes iniciar sesión para enviar imágenes a n8n.");
            return;
        }

        if (selectedGalleryNeedsJpegWizard) {
            setFailure("Primero convierte la imagen a JPG en el Paso 1.");
            return;
        }

        setFailure(null);
        setStatus(null);
        setResponsePayload(null);
        setResponseImage(null);

        const formData = new FormData();

        if (!selectedGalleryPath) {
            setFailure("Selecciona una imagen de la galería.");
            return;
        }
        formData.append("galleryPath", selectedGalleryPath);

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

            const sourceLabel =
                payload.source === "gallery" ? "galería" : payload.source === "n8n" ? "galería n8n" : "galería";
            const convertedLabel = payload.wasConvertedToJpeg ? " (convertida a JPG)" : "";
            const storedLabel = payload.n8nStoredImage ? " Resultado n8n guardado y reemplazado en galería n8n." : "";
            const compatibleLabel = payload.n8nCompatibleImage ? " Galería n8n actualizada con versión JPG." : "";
            setStatus(
                `Imagen enviada a n8n desde ${sourceLabel}: ${payload.fileName || "archivo"}${convertedLabel}.${storedLabel}${compatibleLabel}`,
            );
            const n8nImage = payload.n8nImage || null;
            setResponseImage(n8nImage);
            if (n8nImage) {
                setResponsePayload({
                    n8nResponseType: "image",
                    contentType: n8nImage.contentType,
                    fileName: n8nImage.fileName,
                    sizeBytes: n8nImage.sizeBytes,
                    n8nStoredImage: payload.n8nStoredImage || null,
                });
            } else {
                setResponsePayload(payload.n8n ?? payload);
            }
            if (payload.n8nStoredImage || payload.n8nCompatibleImage) {
                await refreshGallery({force: true});
                setSelectedGalleryPath(payload.n8nStoredImage?.path || payload.n8nCompatibleImage?.path || null);
            }
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
                        <Sparkles className="h-5 w-5"/>
                        Copias de Imágenes con n8n
                    </CardTitle>
                    <CardDescription>
                        Elige una imagen desde galería y envíala al webhook para crear copias con tu flujo de n8n.
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                        Fuente: Galería
                    </Badge>
                    <Badge variant="outline">{galleryImages.length} en galería</Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
                {status ? <p className="text-sm text-emerald-600">{status}</p> : null}



                    <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex justify-between gap-2">
                            <Button asChild variant="outline" size="sm" disabled={busy}>
                                <Link href="/dashboard/images/gallery">
                                    <Images className="h-4 w-4"/>
                                    Ir a galería
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void refreshGallery({force: true})}
                                    disabled={loadingGallery || busy || !user}>
                                {loadingGallery ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                    <RefreshCcw className="h-4 w-4"/>}
                                Recargar galería
                            </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {paginatedGalleryImages.map((image) => {
                                const active = image.path === selectedGalleryPath;
                                return (
                                    <button
                                        key={image.path}
                                        type="button"
                                        className={`overflow-hidden rounded-lg border text-left transition ${
                                            active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                                        }`}
                                        onClick={() => setSelectedGalleryPath(image.path)}
                                        disabled={busy}
                                    >
                                        <div className="relative aspect-[4/3] bg-muted">
                                            <Badge
                                                variant="secondary"
                                                className="pointer-events-none absolute left-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
                                            >
                                                {getImageFormatLabel({
                                                    contentType: image.contentType,
                                                    fileName: image.name || image.path,
                                                })}
                                            </Badge>
                                            {image.isN8nGenerated ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="pointer-events-none absolute right-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
                                                >
                                                    <Star className="mr-1 h-3 w-3 fill-current"/>
                                                    n8n
                                                </Badge>
                                            ) : null}
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
                        <GalleryPaginationControls
                            totalItems={galleryImages.length}
                            page={galleryPage}
                            pageSize={galleryPageSize}
                            onPageChange={setGalleryPage}
                            onPageSizeChange={(nextSize) => {
                                setGalleryPageSize(nextSize);
                                setGalleryPage(1);
                            }}
                            disabled={busy || loadingGallery}
                        />

                        {selectedGalleryImage ? (
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Seleccionada: {selectedGalleryImage.name}</p>
                                {selectedGalleryNeedsJpegWizard ? (
                                    <p className="text-xs text-amber-700">
                                        Esta imagen no es compatible con n8n. Debes convertir a JPG y luego copiar.
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

                    <div className="flex justify-end gap-2">
                        {selectedGalleryNeedsJpegWizard ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handlePrepareGalleryForN8n()}
                                disabled={busy || !user || !selectedGalleryPath}
                            >
                                {preparingGallery ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                    <Sparkles className="h-4 w-4"/>}
                                Paso 1: Convertir a JPG
                            </Button>
                        ) : null}
                        <Button
                            size="sm"
                            onClick={() => void handleSendToN8n()}
                            disabled={
                                busy ||
                                !user ||
                                !selectedGalleryPath ||
                                selectedGalleryNeedsJpegWizard
                            }
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                            Enviar a n8n
                        </Button>
                    </div>

                {responsePayload ? (
                    <section className="space-y-2 rounded-lg border p-4">
                        <p className="text-sm font-medium">Respuesta de n8n</p>
                        <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(responsePayload, null, 2)}
            </pre>
                    </section>
                ) : null}

                {responseImage ? (
                    <section className="space-y-2 rounded-lg border p-4">
                        <p className="text-sm font-medium">Imagen devuelta por n8n</p>
                        <p className="text-xs text-muted-foreground">
                            {responseImage.fileName} · {responseImage.contentType} · {formatBytes(responseImage.sizeBytes)}
                        </p>
                        <div
                            className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-lg border bg-muted">
                            <Image
                                src={responseImage.dataUrl}
                                alt={responseImage.fileName || "Imagen generada por n8n"}
                                fill
                                unoptimized
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 66vw"
                            />
                        </div>
                    </section>
                ) : null}
            </CardContent>
        </Card>
    );
}
