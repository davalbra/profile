"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {ArrowLeft, ArrowRight, Loader2, Sparkles, Star, Zap} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {getImageFormatLabel} from "@/lib/images/image-format-label";
import {parseOptimizedImageIdFromSlug} from "@/lib/images/optimized-slug";

type DetailPayload = {
    image: {
        id: string;
        slug: string;
        name: string;
        originalName: string;
        path: string;
        downloadURL: string;
        originalPath: string;
        contentType: string | null;
        originalContentType: string | null;
        sizeBytes: number | null;
        originalSizeBytes: number | null;
        savedBytes: number | null;
        savedPercent: number | null;
        sourceCollection: "gallery" | "n8n" | "optimized" | "local" | null;
        sourceStoragePath: string | null;
        sourceWasN8n: boolean;
        createdAt: string;
        updatedAt: string;
        optimizationStats: {
            id: string;
            engine: string | null;
            quality: number | null;
            effort: number | null;
            createdAt: string;
        } | null;
    };
    lineage: Array<{
        path: string;
        name: string;
        contentType: string | null;
        sizeBytes: number | null;
        downloadURL: string | null;
        collection: "gallery" | "n8n" | "optimized" | "original" | "unknown";
        stepLabel: string;
        isCurrent: boolean;
    }>;
    transitions: Array<{
        fromPath: string;
        toPath: string;
        fromCollection: string;
        toCollection: string;
        fromContentType: string | null;
        toContentType: string | null;
        fromSizeBytes: number | null;
        toSizeBytes: number | null;
        savedBytes: number | null;
        savedPercent: number | null;
    }>;
};

function getTransitionSummary(input: { fromStep: string; toStep: string }): string {
    const fromStep = input.fromStep.trim() || "paso anterior";
    const toStep = input.toStep.trim() || "siguiente paso";
    return `${fromStep} -> ${toStep}`;
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

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return new Intl.DateTimeFormat("es-CO", {dateStyle: "medium", timeStyle: "short"}).format(date);
}

export function OptimizedImageDetail({slug}: { slug: string }) {
    const imageId = useMemo(() => parseOptimizedImageIdFromSlug(slug), [slug]);
    const [data, setData] = useState<DetailPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!imageId) {
            setError("Slug inválido.");
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function loadDetail() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/images/optimize/${encodeURIComponent(imageId)}`, {
                    method: "GET",
                    cache: "no-store",
                });
                const payload = (await response.json().catch(() => ({}))) as DetailPayload & { error?: string };
                if (!response.ok) {
                    throw new Error(payload.error || "No se pudo cargar el detalle.");
                }

                if (!cancelled) {
                    setData(payload);
                }
            } catch (reason) {
                const message = reason instanceof Error ? reason.message : "No se pudo cargar el detalle.";
                if (!cancelled) {
                    setError(message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadDetail();
        return () => {
            cancelled = true;
        };
    }, [imageId]);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    Cargando detalle de optimización...
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Detalle no disponible</CardTitle>
                    <CardDescription>{error || "No se pudo cargar la imagen."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/images/optimize">
                            <ArrowLeft className="h-4 w-4"/>
                            Volver a optimizar
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/images/optimize">
                        <ArrowLeft className="h-4 w-4"/>
                        Volver
                    </Link>
                </Button>
                <Badge variant="secondary">
                    <Zap className="mr-1 h-3 w-3"/>
                    Optimizada
                </Badge>
                {data.image.sourceWasN8n ? (
                    <Badge variant="secondary">
                        <Star className="mr-1 h-3 w-3 fill-current"/>
                        n8n
                    </Badge>
                ) : null}
                <Badge variant="outline">{formatBytes(data.image.sizeBytes)}</Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{data.image.name}</CardTitle>
                    <CardDescription>
                        {formatBytes(data.image.originalSizeBytes)} {"->"} {formatBytes(data.image.sizeBytes)} |
                        ahorro{" "}
                        {formatBytes(data.image.savedBytes)} ({formatPercent(data.image.savedPercent)})
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
                        <Image src={data.image.downloadURL} alt={data.image.name} fill className="object-contain"
                               unoptimized/>
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                        <p>Creada: {formatDate(data.image.createdAt)}</p>
                        <p>Actualizada: {formatDate(data.image.updatedAt)}</p>
                        <p>Formato original: {getImageFormatLabel({
                            contentType: data.image.originalContentType,
                            fileName: data.image.originalName
                        })}</p>
                        <p>Formato optimizado: {getImageFormatLabel({
                            contentType: data.image.contentType,
                            fileName: data.image.name
                        })}</p>
                        {data.image.optimizationStats ? (
                            <p className="md:col-span-2">
                                Motor: {data.image.optimizationStats.engine || "sharp-avif"} ·
                                q{data.image.optimizationStats.quality ?? "-"} ·
                                e{data.image.optimizationStats.effort ?? "-"}
                            </p>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Ruta de Transformación</CardTitle>
                    <CardDescription>Histórico visual del proceso entre colecciones.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        {data.lineage.map((node, index) => (
                            <div key={node.path} className="space-y-2">
                                <article className="overflow-hidden rounded-lg border">
                                    <div className="relative aspect-[4/3] bg-muted">
                                        {node.downloadURL ? (
                                            <Image
                                                src={node.downloadURL}
                                                alt={node.name}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                                                Vista previa no disponible
                                            </div>
                                        )}
                                        <Badge
                                            variant="outline"
                                            className="absolute left-2 top-2 border-white/20 bg-black/65 text-white"
                                        >
                                            {node.stepLabel}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 p-2">
                                        <p className="truncate text-xs font-medium">{node.name}</p>
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {getImageFormatLabel({contentType: node.contentType, fileName: node.name})}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px]">{formatBytes(node.sizeBytes)}</Badge>
                                            {node.collection === "n8n" ? (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    <Star className="mr-1 h-3 w-3 fill-current"/>
                                                    n8n
                                                </Badge>
                                            ) : null}
                                            {node.collection === "optimized" ? (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    <Sparkles className="mr-1 h-3 w-3"/>
                                                    optimizada
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                                {index < data.transitions.length ? (
                                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-700">
                                        <p className="flex items-center gap-1 font-medium">
                                            <ArrowRight className="h-3 w-3"/>
                                            {getTransitionSummary({
                                                fromStep: node.stepLabel,
                                                toStep: data.lineage[index + 1]?.stepLabel || "",
                                            })}
                                        </p>
                                        <p>
                                            {formatBytes(data.transitions[index].fromSizeBytes)} {"->"} {formatBytes(data.transitions[index].toSizeBytes)}
                                        </p>
                                        <p>
                                            Ahorro {formatBytes(data.transitions[index].savedBytes)} ({formatPercent(data.transitions[index].savedPercent)})
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
