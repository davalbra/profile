import {NextResponse} from "next/server";
import {Prisma} from "@prisma/client";
import sharp from "sharp";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";
import {prisma} from "@/lib/prisma";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const AVIF_QUALITY = 52;
const IMAGE_GALLERY_FOLDER = "galeria";
const IMAGE_N8N_FOLDER = "n8n";
const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const IMAGE_ORIGINALS_FOLDER = "originales";
const IMAGE_OPTIMIZED_FOLDER = "optimizadas";
type OptimizationMode = "balanced" | "high";
type SourceCollection = "gallery" | "n8n" | "optimized" | "local";

const OPTIMIZATION_PROFILES: Record<
    OptimizationMode,
    { quality: number; effort: number; maxDimension: number; engine: string }
> = {
    balanced: {
        quality: AVIF_QUALITY,
        effort: 4,
        maxDimension: MAX_DIMENSION,
        engine: "sharp-avif-balanced",
    },
    high: {
        quality: 68,
        effort: 6,
        maxDimension: 3200,
        engine: "sharp-avif-high",
    },
};

type ImageResponse = {
    id: string;
    path: string;
    name: string;
    downloadURL: string;
    contentType: string | null;
    sizeBytes: number | null;
    originalSizeBytes: number | null;
    optimizedSizeBytes: number | null;
    savedBytes: number | null;
    savedPercent: number | null;
    optimizationStats: {
        id: string;
        engine: string;
        quality: number | null;
        effort: number | null;
        createdAt: string;
    } | null;
    createdAt: string | null;
    updatedAt: string | null;
};

type OptimizationStatsRow = {
    imagenId: string;
    id: string;
    motor: string | null;
    calidad: number | null;
    esfuerzo: number | null;
    porcentajeAhorro: number | null;
    bytesAhorrados: number | null;
    creadoEn: Date;
};

function getBaseName(fileName: string): string {
    const trimmed = fileName.trim();
    if (!trimmed) {
        return "imagen";
    }

    const noExt = trimmed.replace(/\.[^.]+$/, "");
    return noExt.replace(/[^a-zA-Z0-9\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "imagen";
}

function normalizeStoredImageName(rawName: string): string {
    const trimmed = rawName.trim();
    if (!trimmed) {
        throw new Error("El nombre no puede estar vacío.");
    }

    const sanitized = trimmed
        .replace(/[\\/\0]/g, "-")
        .replace(/\s+/g, " ")
        .slice(0, 120);

    if (!sanitized) {
        throw new Error("El nombre no es válido.");
    }

    return sanitized.toLowerCase().endsWith(".avif") ? sanitized : `${sanitized}.avif`;
}

function buildFolderPrefix(uid: string, folder: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${folder}/`;
}

function parseOptimizationMode(raw: string | null): OptimizationMode {
    return raw?.toLowerCase() === "high" ? "high" : "balanced";
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

function getDownloadUrl(bucketName: string, path: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function toImageResponse(
    image: {
        id: string;
        pathOptimizada: string;
        nombreOptimizado: string;
        mimeOptimizado: string;
        bytesOptimizado: number;
        bytesOriginal: number;
        creadoEn: Date;
        actualizadoEn: Date;
        tokenOptimizado: string;
    },
    statsByImageId: Map<string, OptimizationStatsRow>,
    bucketName: string,
): ImageResponse {
    const latestStats = statsByImageId.get(image.id) || null;
    const savedBytes = latestStats?.bytesAhorrados ?? Math.max(0, image.bytesOriginal - image.bytesOptimizado);
    const savedPercent =
        latestStats?.porcentajeAhorro ?? (image.bytesOriginal > 0 ? Number(((savedBytes / image.bytesOriginal) * 100).toFixed(1)) : 0);

    return {
        id: image.id,
        path: image.pathOptimizada,
        name: image.nombreOptimizado,
        downloadURL: getDownloadUrl(bucketName, image.pathOptimizada, image.tokenOptimizado),
        contentType: image.mimeOptimizado || null,
        sizeBytes: image.bytesOptimizado,
        originalSizeBytes: image.bytesOriginal,
        optimizedSizeBytes: image.bytesOptimizado,
        savedBytes,
        savedPercent,
        optimizationStats: latestStats
            ? {
                id: latestStats.id,
                engine: latestStats.motor || "sharp-avif",
                quality: latestStats.calidad,
                effort: latestStats.esfuerzo,
                createdAt: latestStats.creadoEn.toISOString(),
            }
            : null,
        createdAt: image.creadoEn.toISOString(),
        updatedAt: image.actualizadoEn.toISOString(),
    };
}

async function getLatestOptimizationStats(imageIds: string[]): Promise<Map<string, OptimizationStatsRow>> {
    if (!imageIds.length) {
        return new Map();
    }

    try {
        const rows = await prisma.$queryRaw<OptimizationStatsRow[]>(Prisma.sql`
            SELECT DISTINCT
            ON ("imagenId")
                "imagenId",
                "id",
                "motor",
                "calidad",
                "esfuerzo",
                "porcentajeAhorro",
                "bytesAhorrados",
                "creadoEn"
            FROM "imagenes_optimizacion_estadisticas"
            WHERE "imagenId" IN (${Prisma.join(imageIds)})
            ORDER BY "imagenId", "creadoEn" DESC
        `);

        return new Map(rows.map((row) => [row.imagenId, row]));
    } catch {
        // Backward-compatible: if the table doesn't exist yet or old environments lag behind,
        // keep serving images without stats instead of failing the route.
        return new Map();
    }
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

export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const images = await prisma.imagen.findMany({
            where: {
                usuarioId: sesion.uid,
                eliminadoEn: null,
            },
            orderBy: {
                creadoEn: "desc",
            },
            take: 300,
            select: {
                id: true,
                pathOptimizada: true,
                nombreOptimizado: true,
                mimeOptimizado: true,
                bytesOptimizado: true,
                bytesOriginal: true,
                creadoEn: true,
                actualizadoEn: true,
                tokenOptimizado: true,
            },
        });
        const bucketName = getFirebaseAdminStorage().bucket().name;
        const statsByImageId = await getLatestOptimizationStats(images.map((image) => image.id));
        const items = images.map((image) => toImageResponse(image, statsByImageId, bucketName));

        return NextResponse.json({ok: true, images: items}, {headers: {"Cache-Control": "no-store"}});
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudieron listar las imágenes.";
        return NextResponse.json({error: message}, {status: 500});
    }
}

export async function POST(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const formData = await request.formData();
        const fileValue = formData.get("image") ?? formData.get("file");
        const galleryPath = String(formData.get("galleryPath") || "").trim();
        const optimizationMode = parseOptimizationMode(
            formData.get("qualityMode") ? String(formData.get("qualityMode")) : null,
        );
        const profile = OPTIMIZATION_PROFILES[optimizationMode];

        const bucket = getFirebaseAdminStorage().bucket();
        let sourceBuffer: Buffer;
        let sourceName: string;
        let sourceMime: string;
        let sourcePath: string | null = null;
        let sourceCollection: SourceCollection = "local";
        let sourceWasN8n = false;

        if (fileValue instanceof File) {
            if (fileValue.type && !fileValue.type.startsWith("image/")) {
                return NextResponse.json({error: "El archivo debe ser una imagen."}, {status: 415});
            }

            if (fileValue.size <= 0) {
                return NextResponse.json({error: "La imagen está vacía."}, {status: 400});
            }

            if (fileValue.size > MAX_UPLOAD_BYTES) {
                return NextResponse.json(
                    {error: `La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`},
                    {status: 413},
                );
            }

            sourceBuffer = Buffer.from(await fileValue.arrayBuffer());
            sourceName = fileValue.name || `imagen-${Date.now()}`;
            sourceMime = fileValue.type || "application/octet-stream";
        } else if (galleryPath) {
            const allowedGalleryPrefix = buildFolderPrefix(sesion.uid, IMAGE_GALLERY_FOLDER);
            const allowedN8nPrefix = buildFolderPrefix(sesion.uid, IMAGE_N8N_FOLDER);
            const allowedOptimizedPrefix = buildFolderPrefix(sesion.uid, IMAGE_OPTIMIZED_FOLDER);
            const isAllowedGalleryPath =
                galleryPath.startsWith(allowedGalleryPrefix) ||
                galleryPath.startsWith(allowedN8nPrefix) ||
                galleryPath.startsWith(allowedOptimizedPrefix);

            if (!isAllowedGalleryPath) {
                return NextResponse.json({error: "No tienes permisos para usar esta imagen de galería/n8n/optimizadas."}, {status: 403});
            }

            sourcePath = galleryPath;
            if (galleryPath.startsWith(allowedN8nPrefix)) {
                sourceCollection = "n8n";
                sourceWasN8n = true;
            } else if (galleryPath.startsWith(allowedOptimizedPrefix)) {
                sourceCollection = "optimized";
            } else {
                sourceCollection = "gallery";
            }

            const galleryFile = bucket.file(galleryPath);
            const [exists] = await galleryFile.exists();
            if (!exists) {
                return NextResponse.json({error: "La imagen seleccionada no existe."}, {status: 404});
            }

            const [downloaded] = await galleryFile.download();
            const [metadata] = await galleryFile.getMetadata();
            if (downloaded.length > MAX_UPLOAD_BYTES) {
                return NextResponse.json(
                    {error: `La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`},
                    {status: 413},
                );
            }

            sourceBuffer = downloaded;
            const originalName = asString(metadata.metadata?.originalName);
            sourceName = originalName || galleryPath.split("/").pop() || `imagen-${Date.now()}`;
            sourceMime = metadata.contentType || "application/octet-stream";
            if (sourceCollection === "optimized") {
                sourceWasN8n = asBoolean(metadata.metadata?.sourceWasN8n) || asString(metadata.metadata?.sourceCollection) === "n8n";
            }
        } else {
            return NextResponse.json(
                {error: "Debes enviar un archivo en el campo image/file o indicar galleryPath."},
                {status: 400},
            );
        }

        const output = await sharp(sourceBuffer, {failOn: "none", animated: true})
            .rotate()
            .resize({
                width: profile.maxDimension,
                height: profile.maxDimension,
                fit: "inside",
                withoutEnlargement: true,
            })
            .avif({
                quality: profile.quality,
                effort: profile.effort,
            })
            .toBuffer();

        const baseName = getBaseName(sourceName);
        const extension = sourceName.includes(".") ? sourceName.split(".").pop()?.toLowerCase() : "bin";
        const safeExtension = extension ? extension.replace(/[^a-z0-9]/g, "") || "bin" : "bin";
        const timestamp = Date.now();
        const originalName = `${timestamp}-${baseName}.${safeExtension}`;
        const optimizedName = `${timestamp}-${baseName}.avif`;
        const originalPath = `${buildFolderPrefix(sesion.uid, IMAGE_ORIGINALS_FOLDER)}${originalName}`;
        const optimizedPath = `${buildFolderPrefix(sesion.uid, IMAGE_OPTIMIZED_FOLDER)}${optimizedName}`;
        const optimizedToken = crypto.randomUUID();
        const originalToken = crypto.randomUUID();
        const originalFile = bucket.file(originalPath);
        const optimizedFile = bucket.file(optimizedPath);

        await originalFile.save(sourceBuffer, {
            resumable: false,
            metadata: {
                contentType: sourceMime,
                metadata: {
                    firebaseStorageDownloadTokens: originalToken,
                    source: "original-upload",
                    uploadedAt: new Date().toISOString(),
                    sourceCollection,
                    sourceStoragePath: sourcePath || "",
                    sourceWasN8n: String(sourceWasN8n),
                },
            },
        });

        await optimizedFile.save(output, {
            resumable: false,
            metadata: {
                contentType: "image/avif",
                metadata: {
                    firebaseStorageDownloadTokens: optimizedToken,
                    originalName: sourceName,
                    originalPath,
                    originalBytes: String(sourceBuffer.length),
                    optimizedBytes: String(output.length),
                    optimizedAt: new Date().toISOString(),
                    optimizationMode,
                    sourceCollection,
                    sourceStoragePath: sourcePath || "",
                    sourceWasN8n: String(sourceWasN8n),
                },
            },
        });

        const bytesAhorrados = Math.max(0, sourceBuffer.length - output.length);
        const porcentajeAhorro = sourceBuffer.length > 0 ? Number(((bytesAhorrados / sourceBuffer.length) * 100).toFixed(1)) : 0;

        const image = await prisma.$transaction(async (tx) => {
            const createdImage = await tx.imagen.create({
                data: {
                    usuarioId: sesion.uid,
                    nombreOriginal: sourceName,
                    nombreOptimizado: optimizedName,
                    pathOriginal: originalPath,
                    pathOptimizada: optimizedPath,
                    tokenOriginal: originalToken,
                    tokenOptimizado: optimizedToken,
                    mimeOriginal: sourceMime,
                    mimeOptimizado: "image/avif",
                    bytesOriginal: sourceBuffer.length,
                    bytesOptimizado: output.length,
                },
                select: {
                    id: true,
                    pathOptimizada: true,
                    nombreOptimizado: true,
                    mimeOptimizado: true,
                    bytesOptimizado: true,
                    bytesOriginal: true,
                    creadoEn: true,
                    actualizadoEn: true,
                    tokenOptimizado: true,
                    pathOriginal: true,
                    nombreOriginal: true,
                    mimeOriginal: true,
                    tokenOriginal: true,
                },
            });

            await tx.$executeRaw`
                INSERT INTO "imagenes_optimizacion_estadisticas"
                ("id", "imagenId", "bytesOriginal", "bytesOptimizado", "bytesAhorrados", "porcentajeAhorro",
                 "formatoOriginal", "formatoOptimizado", "motor", "calidad", "esfuerzo", "creadoEn")
                VALUES (${crypto.randomUUID()}, ${createdImage.id}, ${sourceBuffer.length}, ${output.length},
                        ${bytesAhorrados}, ${porcentajeAhorro}, ${sourceMime},
                        ${"image/avif"}, ${profile.engine}, ${profile.quality}, ${profile.effort}, ${new Date()})
            `;

            return createdImage;
        });

        const statsByImageId = await getLatestOptimizationStats([image.id]);

        return NextResponse.json(
            {
                ok: true,
                image: toImageResponse(image, statsByImageId, bucket.name),
                original: {
                    path: image.pathOriginal,
                    name: image.nombreOriginal,
                    downloadURL: getDownloadUrl(bucket.name, image.pathOriginal, image.tokenOriginal),
                    contentType: image.mimeOriginal,
                    sizeBytes: image.bytesOriginal,
                },
            },
            {headers: {"Cache-Control": "no-store"}},
        );
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo optimizar y subir la imagen.";
        return NextResponse.json({error: message}, {status: 500});
    }
}

export async function DELETE(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const payload = (await request.json().catch(() => null)) as { path?: string } | null;
        const path = payload?.path?.trim();

        if (!path) {
            return NextResponse.json({error: "Falta path del archivo a eliminar."}, {status: 400});
        }

        const prefix = `users/${sesion.uid}/${IMAGE_ROOT_FOLDER}/`;
        if (!path.startsWith(prefix)) {
            return NextResponse.json({error: "No tienes permisos para eliminar este archivo."}, {status: 403});
        }

        const bucket = getFirebaseAdminStorage().bucket();
        const image = await prisma.imagen.findFirst({
            where: {
                usuarioId: sesion.uid,
                pathOptimizada: path,
                eliminadoEn: null,
            },
            select: {
                id: true,
                pathOptimizada: true,
                pathOriginal: true,
            },
        });

        if (image) {
            await Promise.all([
                bucket.file(image.pathOptimizada).delete({ignoreNotFound: true}),
                bucket.file(image.pathOriginal).delete({ignoreNotFound: true}),
            ]);

            await prisma.imagen.update({
                where: {id: image.id},
                data: {eliminadoEn: new Date()},
            });
        } else {
            await bucket.file(path).delete({ignoreNotFound: true});
        }

        return NextResponse.json({ok: true}, {headers: {"Cache-Control": "no-store"}});
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo eliminar la imagen.";
        return NextResponse.json({error: message}, {status: 500});
    }
}

export async function PATCH(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const payload = (await request.json().catch(() => null)) as { path?: string; name?: string } | null;
        const path = payload?.path?.trim();
        const rawName = payload?.name ?? "";

        if (!path) {
            return NextResponse.json({error: "Falta path de la imagen."}, {status: 400});
        }

        let normalizedName: string;
        try {
            normalizedName = normalizeStoredImageName(rawName);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Nombre inválido.";
            return NextResponse.json({error: message}, {status: 400});
        }

        const image = await prisma.imagen.findFirst({
            where: {
                usuarioId: sesion.uid,
                pathOptimizada: path,
                eliminadoEn: null,
            },
            select: {
                id: true,
            },
        });

        if (!image) {
            return NextResponse.json({error: "Imagen no encontrada."}, {status: 404});
        }

        const updated = await prisma.imagen.update({
            where: {id: image.id},
            data: {
                nombreOptimizado: normalizedName,
            },
            select: {
                id: true,
                pathOptimizada: true,
                nombreOptimizado: true,
                mimeOptimizado: true,
                bytesOptimizado: true,
                bytesOriginal: true,
                creadoEn: true,
                actualizadoEn: true,
                tokenOptimizado: true,
            },
        });

        const statsByImageId = await getLatestOptimizationStats([updated.id]);
        const bucketName = getFirebaseAdminStorage().bucket().name;

        return NextResponse.json(
            {
                ok: true,
                image: toImageResponse(updated, statsByImageId, bucketName),
            },
            {headers: {"Cache-Control": "no-store"}},
        );
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo renombrar la imagen.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
