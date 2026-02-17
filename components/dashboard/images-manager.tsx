"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {
    ArrowRight,
    Download,
    ImagePlus,
    Images,
    Loader2,
    RefreshCcw,
    Sparkles,
    Star,
    Zap,
} from "lucide-react";
import Image from "next/image";
import {useAuth} from "@/components/providers/auth-provider";
import {GalleryPaginationControls} from "@/components/dashboard/gallery-pagination-controls";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useGalleryImages} from "@/hooks/use-gallery-images";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {getImageFormatLabel} from "@/lib/images/image-format-label";
import {buildOptimizedImageSlug} from "@/lib/images/optimized-slug";

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

type UploadResult = {
    optimizedBytes: number;
    originalBytes: number;
    savedBytes: number;
    savedPercent: number;
    optimizedPath: string | null;
    optimizedName: string | null;
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
    if (!trimmed) {
        return `imagen.${extensionFromContentType(input.contentType)}`;
    }

    if (/\.[a-z0-9]+$/i.test(trimmed)) {
        return trimmed;
    }

    return `${trimmed}.${extensionFromContentType(input.contentType)}`;
}

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

async function uploadOptimizedImage(input: {
    galleryPath: string;
    qualityMode: QualityMode;
}): Promise<UploadResult> {
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
    const savedPercent = Number(
        payload?.image?.savedPercent ?? (originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0),
    );

    return {
        optimizedBytes,
        originalBytes,
        savedBytes,
        savedPercent,
        optimizedPath: payload?.image?.path || null,
        optimizedName: payload?.image?.name || null,
    };
}

export function ImagesManager() {
    const {user, error} = useAuth();
    const searchParams = useSearchParams();
    const requestedGalleryPath = searchParams.get("galleryPath");
    const requestedSourceMode: OptimizeSourceMode = requestedGalleryPath?.includes("/n8n/")
        ? "n8n"
        : requestedGalleryPath?.includes("/optimizadas/")
            ? "optimized"
            : "gallery";

    const userId = user?.uid || null;
    const [sourceMode, setSourceMode] = useState<OptimizeSourceMode>(requestedSourceMode);
    const [galleryPage, setGalleryPage] = useState(1);
    const [galleryPageSize, setGalleryPageSize] = useState<10 | 25 | 50>(10);
    const [qualityByPath, setQualityByPath] = useState<Record<string, QualityMode>>({});
    const [optimizingPath, setOptimizingPath] = useState<string | null>(null);
    const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [historyRecords, setHistoryRecords] = useState<OptimizedHistoryRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const {
        images: sourceImages,
        loading: loadingSource,
        error: sourceError,
        refresh: refreshSource,
    } = useGalleryImages({
        userId,
        enabled: true,
        scope: sourceMode,
    });

    const {
        images: optimizedAuxImages,
        loading: loadingOptimizedAux,
        error: optimizedAuxError,
        refresh: refreshOptimizedAux,
    } = useGalleryImages({
        userId,
        enabled: sourceMode !== "optimized",
        scope: "optimized",
    });

    const optimizedCollection = sourceMode === "optimized" ? sourceImages : optimizedAuxImages;

    const refreshOptimizedCollection = useCallback(async () => {
        if (sourceMode === "optimized") {
            return refreshSource({force: true});
        }
        return refreshOptimizedAux({force: true});
    }, [refreshOptimizedAux, refreshSource, sourceMode]);

    useEffect(() => {
        if (requestedGalleryPath) {
            setSourceMode(requestedSourceMode);
        }
    }, [requestedGalleryPath, requestedSourceMode]);

    const loadHistoryRecords = useCallback(async () => {
        if (!userId) {
            setHistoryRecords([]);
            return;
        }

        setLoadingHistory(true);
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
            setHistoryRecords(payload.images || []);
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudieron cargar las imágenes optimizadas.";
            setFailure(message);
        } finally {
            setLoadingHistory(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadHistoryRecords();
    }, [loadHistoryRecords]);

    useEffect(() => {
        if (sourceError) {
            setFailure(sourceError);
        }
    }, [sourceError]);

    useEffect(() => {
        if (optimizedAuxError) {
            setFailure(optimizedAuxError);
        }
    }, [optimizedAuxError]);

    const activeScopeLabel = sourceMode === "n8n" ? "n8n" : sourceMode === "optimized" ? "Optimizadas" : "Galería";
    const busy = optimizingPath !== null;

    const paginatedImages = useMemo(() => {
        const start = (galleryPage - 1) * galleryPageSize;
        return sourceImages.slice(start, start + galleryPageSize);
    }, [galleryPage, galleryPageSize, sourceImages]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(sourceImages.length / galleryPageSize)),
        [galleryPageSize, sourceImages.length],
    );

    useEffect(() => {
        setGalleryPage((currentPage) => Math.min(currentPage, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setGalleryPage(1);
    }, [sourceMode]);

    useEffect(() => {
        if (!requestedGalleryPath) {
            return;
        }

        const index = sourceImages.findIndex((item) => item.path === requestedGalleryPath);
        if (index < 0) {
            return;
        }

        const targetPage = Math.floor(index / galleryPageSize) + 1;
        setGalleryPage(targetPage);
    }, [galleryPageSize, requestedGalleryPath, sourceImages]);

    const historyByPath = useMemo(() => {
        const map = new Map<string, OptimizedHistoryRecord & {
            originalBytes: number | null;
            optimizedBytes: number | null;
            savedBytes: number | null;
            savedPercent: number | null;
        }>();

        for (const item of historyRecords) {
            const originalBytes = item.originalSizeBytes ?? null;
            const optimizedBytes = item.optimizedSizeBytes ?? item.sizeBytes ?? null;
            const savedBytes =
                item.savedBytes ??
                (originalBytes !== null && optimizedBytes !== null ? Math.max(0, originalBytes - optimizedBytes) : null);
            const savedPercent =
                item.savedPercent ??
                (originalBytes !== null && originalBytes > 0 && savedBytes !== null
                    ? Number(((savedBytes / originalBytes) * 100).toFixed(1))
                    : null);

            map.set(item.path, {
                ...item,
                originalBytes,
                optimizedBytes,
                savedBytes,
                savedPercent,
            });
        }

        return map;
    }, [historyRecords]);

    const optimizedBySourcePath = useMemo(() => {
        const map = new Map<string, (typeof optimizedCollection)[number]>();

        for (const image of optimizedCollection) {
            const sourcePath = image.sourceGalleryPath || null;
            if (!sourcePath || map.has(sourcePath)) {
                continue;
            }
            map.set(sourcePath, image);
        }

        return map;
    }, [optimizedCollection]);

    const statsSummary = useMemo(() => {
        const values = Array.from(historyByPath.values());
        const totalOriginalBytes = values.reduce((acc, item) => acc + (item.originalBytes || 0), 0);
        const totalOptimizedBytes = values.reduce((acc, item) => acc + (item.optimizedBytes || 0), 0);
        const totalSavedBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);
        const totalSavedPercent = totalOriginalBytes > 0 ? (totalSavedBytes / totalOriginalBytes) * 100 : 0;

        return {
            totalOriginalBytes,
            totalOptimizedBytes,
            totalSavedBytes,
            totalSavedPercent,
        };
    }, [historyByPath]);

    async function handleOptimizeImage(input: { path: string; name: string }) {
        if (!user) {
            setFailure("Debes iniciar sesión para administrar imágenes.");
            return;
        }

        const qualityMode = qualityByPath[input.path] || "balanced";

        setOptimizingPath(input.path);
        setFailure(null);
        setStatus(null);

        try {
            const result = await uploadOptimizedImage({
                galleryPath: input.path,
                qualityMode,
            });

            await Promise.all([
                refreshSource({force: true}),
                refreshOptimizedCollection(),
                loadHistoryRecords(),
            ]);

            const optimizedLabel = result.optimizedName ? ` (${result.optimizedName})` : "";
            setStatus(
                `${input.name} optimizada${optimizedLabel}: ${formatBytes(result.originalBytes)} -> ${formatBytes(
                    result.optimizedBytes,
                )} (ahorro ${formatBytes(result.savedBytes)} / ${formatPercent(result.savedPercent)}).`,
            );
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudo optimizar la imagen.";
            setFailure(message);
        } finally {
            setOptimizingPath(null);
        }
    }

    async function handleDownloadImage(input: { path: string; name: string; contentType: string | null }) {
        setFailure(null);
        setDownloadingPath(input.path);

        try {
            const anchor = document.createElement("a");
            const fileName = buildDownloadFileName({
                name: input.name,
                contentType: input.contentType,
            });
            const downloadUrl = `/api/images/download?path=${encodeURIComponent(input.path)}&name=${encodeURIComponent(fileName)}`;
            anchor.href = downloadUrl;
            anchor.download = fileName;
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            setStatus(`Descarga iniciada: ${fileName}`);
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : "No se pudo descargar la imagen.";
            setFailure(message);
        } finally {
            setDownloadingPath(null);
        }
    }

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <ImagePlus className="h-5 w-5"/>
                        Gestión de Imágenes Web
                    </CardTitle>
                    <CardDescription>
                        Optimiza por card y usa la colección de optimizadas como histórico con detalle por slug.
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{sourceImages.length} en colección</Badge>
                    <Badge variant="outline">{historyRecords.length} optimizadas</Badge>
                    <Badge variant="outline">
                        Ahorro
                        acumulado {formatBytes(statsSummary.totalSavedBytes)} ({formatPercent(statsSummary.totalSavedPercent)})
                    </Badge>
                    <Badge variant="outline">Colección: {activeScopeLabel}</Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
                {status ? <p className="text-sm text-emerald-600">{status}</p> : null}

                <section className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant={sourceMode === "gallery" ? "default" : "outline"}
                                onClick={() => setSourceMode("gallery")}
                                disabled={busy}
                            >
                                <Images className="h-4 w-4"/>
                                Galería
                            </Button>
                            <Button
                                size="sm"
                                variant={sourceMode === "n8n" ? "default" : "outline"}
                                onClick={() => setSourceMode("n8n")}
                                disabled={busy}
                            >
                                <Sparkles className="h-4 w-4"/>
                                n8n
                            </Button>
                            <Button
                                size="sm"
                                variant={sourceMode === "optimized" ? "default" : "outline"}
                                onClick={() => setSourceMode("optimized")}
                                disabled={busy}
                            >
                                <Zap className="h-4 w-4"/>
                                Optimizadas
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm" disabled={busy}>
                                <Link href="/dashboard/images/gallery">
                                    <Images className="h-4 w-4"/>
                                    Ir a galería
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    void refreshSource({force: true});
                                    void refreshOptimizedCollection();
                                    void loadHistoryRecords();
                                }}
                                disabled={loadingSource || loadingHistory || loadingOptimizedAux || busy || !user}
                            >
                                {loadingSource || loadingHistory || loadingOptimizedAux ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <RefreshCcw className="h-4 w-4"/>
                                )}
                                Recargar
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {paginatedImages.map((image) => {
                            const showN8nBadge = sourceMode === "n8n" || image.isN8nGenerated || image.isN8nDerived;
                            const isOptimizedCollection = sourceMode === "optimized" || image.isOptimized;
                            const linkedOptimized =
                                optimizedBySourcePath.get(image.path) ||
                                (image.sourceGalleryPath ? optimizedBySourcePath.get(image.sourceGalleryPath) : null) ||
                                null;
                            const linkedStats = linkedOptimized ? historyByPath.get(linkedOptimized.path) || null : null;
                            const ownStats = historyByPath.get(image.path) || null;
                            const currentStats = isOptimizedCollection ? ownStats : linkedStats;
                            const isAlreadyOptimized = isOptimizedCollection || Boolean(linkedOptimized);
                            const quality = qualityByPath[image.path] || "balanced";
                            const cardBusy = optimizingPath === image.path;
                            const cardDownloading = downloadingPath === image.path;
                            const detailId = image.optimizedImageId || ownStats?.id || null;
                            const detailName = ownStats?.name || image.name;
                            const detailSlug = detailId
                                ? buildOptimizedImageSlug({id: detailId, name: detailName})
                                : null;

                            return (
                                <article
                                    key={image.path}
                                    className={`overflow-hidden rounded-lg border bg-card ${
                                        requestedGalleryPath === image.path ? "ring-2 ring-primary/40" : ""
                                    }`}
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
                                        {showN8nBadge ? (
                                            <Badge
                                                variant="secondary"
                                                className="pointer-events-none absolute right-2 top-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
                                            >
                                                <Star className="mr-1 h-3 w-3 fill-current"/>
                                                n8n
                                            </Badge>
                                        ) : null}
                                        {isAlreadyOptimized ? (
                                            <Badge
                                                variant="secondary"
                                                className="pointer-events-none absolute bottom-2 right-2 z-10 border-white/20 bg-black/65 text-[10px] text-white hover:bg-black/65"
                                            >
                                                <Zap className="mr-1 h-3 w-3"/>
                                                optimizada
                                            </Badge>
                                        ) : null}
                                        <Image
                                            src={image.downloadURL}
                                            alt={image.name}
                                            fill
                                            unoptimized
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                        />
                                    </div>

                                    <div className="space-y-3 p-3">
                                        <div className="space-y-1">
                                            <p className="truncate text-sm font-medium">{image.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(image.sizeBytes)} · {formatDate(image.createdAt)}</p>
                                        </div>

                                        {currentStats ? (
                                            <div className="rounded-md border bg-muted/30 p-2 text-xs">
                                                <p>Original: {formatBytes(currentStats.originalBytes)}</p>
                                                <p>Optimizada: {formatBytes(currentStats.optimizedBytes)}</p>
                                                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                                                    Ahorro: {formatBytes(currentStats.savedBytes)} ({formatPercent(currentStats.savedPercent)})
                                                </p>
                                            </div>
                                        ) : null}

                                        {sourceMode === "optimized" ? (
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground">Este item pertenece al
                                                    histórico de optimización.</p>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() =>
                                                        void handleDownloadImage({
                                                            path: image.path,
                                                            name: image.name,
                                                            contentType: image.contentType,
                                                        })
                                                    }
                                                    disabled={cardDownloading}
                                                >
                                                    {cardDownloading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                                    ) : (
                                                        <Download className="h-4 w-4"/>
                                                    )}
                                                    Descargar
                                                </Button>
                                                {detailSlug ? (
                                                    <Button asChild size="sm" variant="outline" className="w-full">
                                                        <Link
                                                            href={`/dashboard/images/optimize/${encodeURIComponent(detailSlug)}`}>
                                                            <ArrowRight className="h-4 w-4"/>
                                                            Detalle
                                                        </Link>
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ) : isAlreadyOptimized && linkedOptimized ? (
                                            <div className="space-y-2">
                                                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                                    Ya está optimizada. Puedes abrirla en la colección de optimizadas.
                                                </p>
                                                <Button asChild size="sm" variant="outline" className="w-full">
                                                    <Link
                                                        href={`/dashboard/images/optimize?galleryPath=${encodeURIComponent(linkedOptimized.path)}`}
                                                    >
                                                        <ArrowRight className="h-4 w-4"/>
                                                        Ir a optimizadas
                                                    </Link>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Select
                                                    value={quality}
                                                    onValueChange={(value) =>
                                                        setQualityByPath((current) => ({
                                                            ...current,
                                                            [image.path]: value as QualityMode,
                                                        }))
                                                    }
                                                    disabled={busy}
                                                >
                                                    <SelectTrigger className="h-8 w-full">
                                                        <SelectValue placeholder="Calidad"/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="balanced">Balanceado</SelectItem>
                                                        <SelectItem value="high">Alta calidad</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Button
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => void handleOptimizeImage({
                                                        path: image.path,
                                                        name: image.name
                                                    })}
                                                    disabled={busy}
                                                >
                                                    {cardBusy ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                                        <Zap className="h-4 w-4"/>}
                                                    Optimizar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <GalleryPaginationControls
                        totalItems={sourceImages.length}
                        page={galleryPage}
                        pageSize={galleryPageSize}
                        onPageChange={setGalleryPage}
                        onPageSizeChange={(nextSize) => {
                            setGalleryPageSize(nextSize);
                            setGalleryPage(1);
                        }}
                        disabled={busy || loadingSource}
                    />

                    {!loadingSource && sourceImages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay imágenes en esta colección.</p>
                    ) : null}
                </section>

                {!user ? (
                    <p className="text-sm text-muted-foreground">Inicia sesión para administrar imágenes dentro del
                        dashboard.</p>
                ) : null}
            </CardContent>
        </Card>
    );
}
