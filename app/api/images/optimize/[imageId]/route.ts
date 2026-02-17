import {NextResponse} from "next/server";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";
import {prisma} from "@/lib/prisma";
import {buildOptimizedImageSlug} from "@/lib/images/optimized-slug";

type CollectionType = "gallery" | "n8n" | "optimized" | "original" | "unknown";

type LineageNode = {
    path: string;
    name: string;
    contentType: string | null;
    sizeBytes: number | null;
    downloadURL: string | null;
    collection: CollectionType;
    metadataSource: string | null;
    stepLabel: string;
    isCurrent: boolean;
};

function getDownloadUrl(bucketName: string, path: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function asString(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (value === null || value === undefined) {
        return null;
    }

    return String(value);
}

function asBoolean(value: unknown): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value === 1;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return normalized === "1" || normalized === "true" || normalized === "yes";
    }

    return false;
}

function asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function parseAuthError(error: unknown) {
    if (error instanceof AccesoDenegadoError || error instanceof RolInsuficienteError) {
        return NextResponse.json({error: error.message}, {status: 403});
    }

    const message = error instanceof Error ? error.message : "No autorizado.";
    if (/token|sesi[oó]n|autoriz/i.test(message)) {
        return NextResponse.json({error: message}, {status: 401});
    }

    return null;
}

function getCollectionFromPath(path: string): CollectionType {
    if (path.includes("/galeria/")) {
        return "gallery";
    }
    if (path.includes("/n8n/")) {
        return "n8n";
    }
    if (path.includes("/optimizadas/")) {
        return "optimized";
    }
    if (path.includes("/originales/")) {
        return "original";
    }
    return "unknown";
}

function getStepLabel(input: {
    collection: CollectionType;
    metadataSource: string | null;
    isCurrent: boolean;
}): string {
    if (input.isCurrent || input.collection === "optimized") {
        return "optimizada";
    }

    if (input.collection === "gallery") {
        return "galeria";
    }

    if (input.collection === "n8n") {
        if (input.metadataSource === "n8n-compatible") {
            return "formato compatible n8n";
        }
        if (input.metadataSource === "n8n-response") {
            return "generada n8n";
        }
        return "n8n";
    }

    if (input.collection === "original") {
        return "original";
    }

    return "archivo";
}

async function readStorageSnapshot(path: string): Promise<{
    path: string;
    name: string;
    contentType: string | null;
    sizeBytes: number | null;
    downloadURL: string | null;
    metadataSource: string | null;
} | null> {
    const bucket = getFirebaseAdminStorage().bucket();
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
        return null;
    }

    const [metadata] = await file.getMetadata();
    const fallbackName = path.split("/").pop() || path;
    const name = asString(metadata.metadata?.originalName) || fallbackName;
    const tokenRaw = asString(metadata.metadata?.firebaseStorageDownloadTokens) || "";
    const token = tokenRaw.split(",")[0]?.trim() || null;

    return {
        path,
        name,
        contentType: metadata.contentType || null,
        sizeBytes: asNumber(metadata.size),
        downloadURL: token ? getDownloadUrl(bucket.name, path, token) : null,
        metadataSource: asString(metadata.metadata?.source),
    };
}

async function buildLineagePaths(input: { uid: string; sourcePath: string | null }): Promise<string[]> {
    if (!input.sourcePath) {
        return [];
    }

    const visited = new Set<string>();
    const chain: string[] = [];
    let cursor: string | null = input.sourcePath;
    let depth = 0;

    while (cursor && depth < 8 && !visited.has(cursor)) {
        visited.add(cursor);
        chain.unshift(cursor);
        const relation: { origenPath: string } | null = await prisma.imagenRelacion.findFirst({
            where: {
                usuarioId: input.uid,
                destinoPath: cursor,
            },
            orderBy: {
                actualizadoEn: "desc",
            },
            select: {
                origenPath: true,
            },
        });
        cursor = relation?.origenPath || null;
        depth += 1;
    }

    return chain;
}

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ imageId: string }> }) {
    try {
        const params = await context.params;
        const imageId = decodeURIComponent(params.imageId || "").trim();
        if (!imageId) {
            return NextResponse.json({error: "Falta imageId."}, {status: 400});
        }

        const sesion = await requerirSesionFirebase(_request, {rolMinimo: "COLABORADOR"});
        const image = await prisma.imagen.findFirst({
            where: {
                id: imageId,
                usuarioId: sesion.uid,
                eliminadoEn: null,
            },
            select: {
                id: true,
                nombreOriginal: true,
                nombreOptimizado: true,
                mimeOriginal: true,
                mimeOptimizado: true,
                bytesOriginal: true,
                bytesOptimizado: true,
                pathOriginal: true,
                pathOptimizada: true,
                tokenOptimizado: true,
                creadoEn: true,
                actualizadoEn: true,
                estadisticasOptimizacion: {
                    orderBy: {
                        creadoEn: "desc",
                    },
                    take: 1,
                    select: {
                        id: true,
                        motor: true,
                        calidad: true,
                        esfuerzo: true,
                        bytesAhorrados: true,
                        porcentajeAhorro: true,
                        creadoEn: true,
                    },
                },
            },
        });

        if (!image) {
            return NextResponse.json({error: "No se encontró la imagen optimizada."}, {status: 404});
        }

        const optimizedSnapshot = await readStorageSnapshot(image.pathOptimizada);
        const bucketName = getFirebaseAdminStorage().bucket().name;
        const bucket = getFirebaseAdminStorage().bucket();
        const optimizedFile = bucket.file(image.pathOptimizada);
        const [optimizedExists] = await optimizedFile.exists();
        let sourceCollection: "gallery" | "n8n" | "optimized" | "local" | null = null;
        let sourceStoragePath: string | null = null;
        let sourceWasN8n = false;

        if (optimizedExists) {
            const [optimizedMetadata] = await optimizedFile.getMetadata();
            const rawCollection = asString(optimizedMetadata.metadata?.sourceCollection);
            sourceCollection =
                rawCollection === "gallery" ||
                rawCollection === "n8n" ||
                rawCollection === "optimized" ||
                rawCollection === "local"
                    ? rawCollection
                    : null;
            sourceStoragePath = asString(optimizedMetadata.metadata?.sourceStoragePath);
            sourceWasN8n = asBoolean(optimizedMetadata.metadata?.sourceWasN8n) || sourceCollection === "n8n";
        }

        const lineagePaths = await buildLineagePaths({
            uid: sesion.uid,
            sourcePath: sourceStoragePath,
        });

        if (!lineagePaths.length && sourceCollection === "local" && image.pathOriginal) {
            lineagePaths.push(image.pathOriginal);
        }

        if (!lineagePaths.includes(image.pathOptimizada)) {
            lineagePaths.push(image.pathOptimizada);
        }

        const uniquePaths = Array.from(new Set(lineagePaths));
        const lineageNodes: LineageNode[] = [];
        for (const path of uniquePaths) {
            if (path === image.pathOptimizada) {
                lineageNodes.push({
                    path,
                    name: optimizedSnapshot?.name || image.nombreOptimizado,
                    contentType: optimizedSnapshot?.contentType || image.mimeOptimizado || null,
                    sizeBytes: optimizedSnapshot?.sizeBytes ?? image.bytesOptimizado,
                    downloadURL: getDownloadUrl(bucketName, image.pathOptimizada, image.tokenOptimizado),
                    collection: "optimized",
                    metadataSource: optimizedSnapshot?.metadataSource || null,
                    stepLabel: getStepLabel({
                        collection: "optimized",
                        metadataSource: optimizedSnapshot?.metadataSource || null,
                        isCurrent: true,
                    }),
                    isCurrent: true,
                });
                continue;
            }

            if (path === image.pathOriginal) {
                lineageNodes.push({
                    path,
                    name: image.nombreOriginal,
                    contentType: image.mimeOriginal || null,
                    sizeBytes: image.bytesOriginal,
                    downloadURL: null,
                    collection: "original",
                    metadataSource: null,
                    stepLabel: getStepLabel({
                        collection: "original",
                        metadataSource: null,
                        isCurrent: false,
                    }),
                    isCurrent: false,
                });
                continue;
            }

            const snapshot = await readStorageSnapshot(path);
            if (!snapshot) {
                continue;
            }

            const collection = getCollectionFromPath(path);
            lineageNodes.push({
                path,
                name: snapshot.name,
                contentType: snapshot.contentType,
                sizeBytes: snapshot.sizeBytes,
                downloadURL: snapshot.downloadURL,
                collection,
                metadataSource: snapshot.metadataSource,
                stepLabel: getStepLabel({
                    collection,
                    metadataSource: snapshot.metadataSource,
                    isCurrent: false,
                }),
                isCurrent: false,
            });
        }

        const transitions = lineageNodes.slice(1).map((toNode, index) => {
            const fromNode = lineageNodes[index];
            const fromBytes = fromNode.sizeBytes ?? 0;
            const toBytes = toNode.sizeBytes ?? 0;
            const savedBytes = Math.max(0, fromBytes - toBytes);
            const savedPercent = fromBytes > 0 ? Number(((savedBytes / fromBytes) * 100).toFixed(1)) : null;

            return {
                fromPath: fromNode.path,
                toPath: toNode.path,
                fromCollection: fromNode.collection,
                toCollection: toNode.collection,
                fromContentType: fromNode.contentType,
                toContentType: toNode.contentType,
                fromSizeBytes: fromNode.sizeBytes,
                toSizeBytes: toNode.sizeBytes,
                savedBytes,
                savedPercent,
            };
        });

        const latestStats = image.estadisticasOptimizacion[0] || null;
        const savedBytes =
            latestStats?.bytesAhorrados ?? Math.max(0, image.bytesOriginal - image.bytesOptimizado);
        const savedPercent =
            latestStats?.porcentajeAhorro ??
            (image.bytesOriginal > 0 ? Number(((savedBytes / image.bytesOriginal) * 100).toFixed(1)) : 0);

        return NextResponse.json(
            {
                ok: true,
                image: {
                    id: image.id,
                    slug: buildOptimizedImageSlug({id: image.id, name: image.nombreOptimizado}),
                    name: image.nombreOptimizado,
                    originalName: image.nombreOriginal,
                    path: image.pathOptimizada,
                    downloadURL: getDownloadUrl(bucketName, image.pathOptimizada, image.tokenOptimizado),
                    originalPath: image.pathOriginal,
                    contentType: image.mimeOptimizado,
                    originalContentType: image.mimeOriginal,
                    sizeBytes: image.bytesOptimizado,
                    originalSizeBytes: image.bytesOriginal,
                    savedBytes,
                    savedPercent,
                    sourceCollection,
                    sourceStoragePath,
                    sourceWasN8n,
                    createdAt: image.creadoEn.toISOString(),
                    updatedAt: image.actualizadoEn.toISOString(),
                    optimizationStats: latestStats
                        ? {
                            id: latestStats.id,
                            engine: latestStats.motor,
                            quality: latestStats.calidad,
                            effort: latestStats.esfuerzo,
                            createdAt: latestStats.creadoEn.toISOString(),
                        }
                        : null,
                },
                lineage: lineageNodes,
                transitions,
            },
            {headers: {"Cache-Control": "no-store"}},
        );
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo cargar el detalle de la imagen optimizada.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
