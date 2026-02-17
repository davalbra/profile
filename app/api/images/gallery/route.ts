import {NextResponse} from "next/server";
import {TipoRelacionImagen} from "@prisma/client";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";
import {isN8nSupportedImageFormat} from "@/lib/images/n8n-supported-format";
import {prisma} from "@/lib/prisma";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const IMAGE_GALLERY_FOLDER = "galeria";
const IMAGE_N8N_FOLDER = "n8n";
const IMAGE_OPTIMIZED_FOLDER = "optimizadas";

type GalleryScope = "gallery" | "n8n" | "optimized";
type SourceCollection = "gallery" | "n8n" | "optimized" | "local";

type GalleryImageResponse = {
    path: string;
    name: string;
    downloadURL: string;
    contentType: string | null;
    sizeBytes: number | null;
    createdAt: string | null;
    updatedAt: string | null;
    sourceGalleryPath?: string | null;
    isN8nDerived?: boolean;
    isN8nGenerated?: boolean;
    needsN8nTransformation?: boolean;
    n8nVariantPath?: string | null;
    isOptimized?: boolean;
    optimizedImageId?: string | null;
    optimizedSourceCollection?: SourceCollection | null;
    sourceWasN8n?: boolean;
};

type FirebaseFileWithMetadata = {
    name: string;
    metadata: {
        contentType?: string;
        size?: string | number;
        timeCreated?: string;
        updated?: string;
        metadata?: Record<string, unknown>;
    };
};

function getDownloadUrl(bucketName: string, path: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function buildGalleryPrefix(uid: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${IMAGE_GALLERY_FOLDER}/`;
}

function buildN8nPrefix(uid: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${IMAGE_N8N_FOLDER}/`;
}

function buildOptimizedPrefix(uid: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${IMAGE_OPTIMIZED_FOLDER}/`;
}

function parseGalleryScope(request: Request): GalleryScope {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    if (scope === "n8n") {
        return "n8n";
    }
    if (scope === "optimized") {
        return "optimized";
    }
    return "gallery";
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

function normalizeGalleryName(fileName: string): string {
    const trimmed = fileName.trim();
    if (!trimmed) {
        return "imagen";
    }

    return trimmed
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9\-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "imagen";
}

function normalizeEditableName(rawName: string): string {
    const trimmed = rawName.trim();
    if (!trimmed) {
        throw new Error("El nombre no puede estar vacío.");
    }

    if (trimmed.length > 120) {
        throw new Error("El nombre no puede superar 120 caracteres.");
    }

    return trimmed;
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

function parseSourceCollection(value: unknown): SourceCollection | null {
    const raw = asString(value);
    if (raw === "gallery" || raw === "n8n" || raw === "optimized" || raw === "local") {
        return raw;
    }
    return null;
}

function mapStorageFileToResponse(file: FirebaseFileWithMetadata, bucketName: string): GalleryImageResponse | null {
    const tokenRaw = asString(file.metadata.metadata?.firebaseStorageDownloadTokens) || "";
    const token = tokenRaw.split(",")[0]?.trim();

    if (!token) {
        return null;
    }

    const fallbackName = file.name.split("/").pop() || file.name;
    const name = asString(file.metadata.metadata?.originalName) || fallbackName;

    return {
        path: file.name,
        name,
        downloadURL: getDownloadUrl(bucketName, file.name, token),
        contentType: file.metadata.contentType || null,
        sizeBytes: file.metadata.size ? Number(file.metadata.size) : null,
        createdAt: file.metadata.timeCreated || null,
        updatedAt: file.metadata.updated || null,
    };
}

async function resolveStorageImageByPath(input: {
    bucketName: string;
    path: string;
}): Promise<GalleryImageResponse | null> {
    const bucket = getFirebaseAdminStorage().bucket();
    const file = bucket.file(input.path);
    const [exists] = await file.exists();
    if (!exists) {
        return null;
    }

    const [metadata] = await file.getMetadata();
    return mapStorageFileToResponse(
        {
            name: input.path,
            metadata,
        },
        input.bucketName,
    );
}

async function buildN8nScopedGallery(input: {
    uid: string;
    bucketName: string;
    galleryItems: GalleryImageResponse[];
}): Promise<GalleryImageResponse[]> {
    if (!input.galleryItems.length) {
        return [];
    }

    const galleryPrefix = buildGalleryPrefix(input.uid);
    const n8nPrefix = buildN8nPrefix(input.uid);

    const compatibleRelations = await prisma.imagenRelacion.findMany({
        where: {
            usuarioId: input.uid,
            tipo: TipoRelacionImagen.N8N_COMPATIBLE,
            origenPath: {
                startsWith: galleryPrefix,
            },
            destinoPath: {
                startsWith: n8nPrefix,
            },
        },
    });
    const responseRelations = await prisma.imagenRelacion.findMany({
        where: {
            usuarioId: input.uid,
            tipo: TipoRelacionImagen.N8N_RESPUESTA,
        },
        select: {
            id: true,
            origenPath: true,
            destinoPath: true,
        },
    });

    const compatibleByOrigin = new Map(compatibleRelations.map((relation) => [relation.origenPath, relation]));
    const responseByOrigin = new Map(responseRelations.map((relation) => [relation.origenPath, relation]));
    const uniqueDerivedPaths = Array.from(
        new Set([...compatibleRelations, ...responseRelations].map((relation) => relation.destinoPath)),
    );
    const derivedEntries = await Promise.all(
        uniqueDerivedPaths.map(async (path) => {
            const item = await resolveStorageImageByPath({
                bucketName: input.bucketName,
                path,
            });
            return [path, item] as const;
        }),
    );
    const derivedByPath = new Map(derivedEntries);
    const staleCompatibleRelationIds = compatibleRelations
        .filter((relation) => !derivedByPath.get(relation.destinoPath))
        .map((relation) => relation.id);
    const staleResponseRelationIds = responseRelations
        .filter((relation) => !derivedByPath.get(relation.destinoPath))
        .map((relation) => relation.id);

    const staleRelationIds = [...staleCompatibleRelationIds, ...staleResponseRelationIds];
    if (staleRelationIds.length > 0) {
        await prisma.imagenRelacion.deleteMany({
            where: {
                id: {
                    in: staleRelationIds,
                },
            },
        });
    }

    return input.galleryItems.map((item) => {
        const compatibleRelation = compatibleByOrigin.get(item.path);
        const compatibleDerived = compatibleRelation ? derivedByPath.get(compatibleRelation.destinoPath) || null : null;
        const currentItem = compatibleDerived || item;
        const responseRelation = responseByOrigin.get(currentItem.path);
        const responseDerived = responseRelation ? derivedByPath.get(responseRelation.destinoPath) || null : null;

        if (responseDerived) {
            return {
                ...responseDerived,
                sourceGalleryPath: item.path,
                isN8nDerived: Boolean(compatibleDerived),
                isN8nGenerated: true,
                needsN8nTransformation: false,
                n8nVariantPath: currentItem.path,
            };
        }

        if (compatibleDerived) {
            return {
                ...compatibleDerived,
                sourceGalleryPath: item.path,
                isN8nDerived: true,
                isN8nGenerated: false,
                needsN8nTransformation: false,
                n8nVariantPath: compatibleDerived.path,
            };
        }

        const needsTransformation = !isN8nSupportedImageFormat({
            contentType: item.contentType,
            fileName: item.name || item.path,
        });

        return {
            ...item,
            sourceGalleryPath: item.path,
            isN8nDerived: false,
            isN8nGenerated: false,
            needsN8nTransformation: needsTransformation,
            n8nVariantPath: null,
        };
    });
}

async function buildOptimizedScopedGallery(input: { uid: string; bucketName: string }): Promise<GalleryImageResponse[]> {
    const optimizedPrefix = buildOptimizedPrefix(input.uid);
    const rows = await prisma.imagen.findMany({
        where: {
            usuarioId: input.uid,
            eliminadoEn: null,
            pathOptimizada: {
                startsWith: optimizedPrefix,
            },
        },
        orderBy: {
            creadoEn: "desc",
        },
        take: 300,
        select: {
            id: true,
            pathOptimizada: true,
            nombreOptimizado: true,
            tokenOptimizado: true,
            mimeOptimizado: true,
            bytesOptimizado: true,
            creadoEn: true,
            actualizadoEn: true,
        },
    });

    if (!rows.length) {
        return [];
    }

    const bucket = getFirebaseAdminStorage().bucket();
    const mapped: Array<GalleryImageResponse | null> = await Promise.all(
        rows.map(async (row): Promise<GalleryImageResponse | null> => {
            const file = bucket.file(row.pathOptimizada);
            const [exists] = await file.exists();
            if (!exists) {
                return null;
            }

            const [metadata] = await file.getMetadata();
            const sourceCollection = parseSourceCollection(metadata.metadata?.sourceCollection);
            const sourceWasN8n = asBoolean(metadata.metadata?.sourceWasN8n) || sourceCollection === "n8n";
            const sizeBytes = Number.isFinite(row.bytesOptimizado)
                ? row.bytesOptimizado
                : metadata.size
                    ? Number(metadata.size)
                    : null;

            return {
                path: row.pathOptimizada,
                name: row.nombreOptimizado || row.pathOptimizada.split("/").pop() || row.pathOptimizada,
                downloadURL: getDownloadUrl(input.bucketName, row.pathOptimizada, row.tokenOptimizado),
                contentType: row.mimeOptimizado || metadata.contentType || null,
                sizeBytes,
                createdAt: row.creadoEn.toISOString(),
                updatedAt: row.actualizadoEn.toISOString(),
                optimizedImageId: row.id,
                sourceGalleryPath: asString(metadata.metadata?.sourceStoragePath),
                isN8nDerived: sourceWasN8n,
                isN8nGenerated: false,
                needsN8nTransformation: false,
                n8nVariantPath: null,
                isOptimized: true,
                optimizedSourceCollection: sourceCollection,
                sourceWasN8n,
            };
        }),
    );

    return mapped.filter((item): item is GalleryImageResponse => item !== null);
}

export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const scope = parseGalleryScope(request);
        const bucket = getFirebaseAdminStorage().bucket();
        if (scope === "optimized") {
            const optimizedItems = await buildOptimizedScopedGallery({
                uid: sesion.uid,
                bucketName: bucket.name,
            });
            return NextResponse.json({ok: true, scope, images: optimizedItems}, {headers: {"Cache-Control": "no-store"}});
        }

        const prefix = buildGalleryPrefix(sesion.uid);

        const [files] = await bucket.getFiles({prefix});
        const fileWithMetadata = await Promise.all(
            files
                .filter((file) => !file.name.endsWith("/"))
                .map(async (file) => {
                    const [metadata] = await file.getMetadata();
                    return {name: file.name, metadata};
                }),
        );

        const baseItems = fileWithMetadata
            .map((file) => mapStorageFileToResponse(file as FirebaseFileWithMetadata, bucket.name))
            .filter((item): item is GalleryImageResponse => item !== null)
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });

        const items =
            scope === "n8n"
                ? await buildN8nScopedGallery({
                    uid: sesion.uid,
                    bucketName: bucket.name,
                    galleryItems: baseItems,
                })
                : baseItems;

        return NextResponse.json({ok: true, scope, images: items}, {headers: {"Cache-Control": "no-store"}});
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo cargar la galería.";
        return NextResponse.json({error: message}, {status: 500});
    }
}

export async function POST(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const formData = await request.formData();
        const fileValue = formData.get("image") ?? formData.get("file");

        if (!(fileValue instanceof File)) {
            return NextResponse.json({error: "Debes enviar un archivo en el campo image o file."}, {status: 400});
        }

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

        const extension = fileValue.name.includes(".") ? fileValue.name.split(".").pop()?.toLowerCase() : "bin";
        const safeExtension = extension ? extension.replace(/[^a-z0-9]/g, "") || "bin" : "bin";
        const baseName = normalizeGalleryName(fileValue.name);
        const timestamp = Date.now();
        const storedName = `${timestamp}-${baseName}.${safeExtension}`;
        const path = `${buildGalleryPrefix(sesion.uid)}${storedName}`;
        const token = crypto.randomUUID();
        const bucket = getFirebaseAdminStorage().bucket();
        const file = bucket.file(path);

        await file.save(Buffer.from(await fileValue.arrayBuffer()), {
            resumable: false,
            metadata: {
                contentType: fileValue.type || "application/octet-stream",
                metadata: {
                    firebaseStorageDownloadTokens: token,
                    originalName: fileValue.name,
                    uploadedAt: new Date().toISOString(),
                },
            },
        });

        const [metadata] = await file.getMetadata();

        const item = mapStorageFileToResponse(
            {
                name: path,
                metadata,
            },
            bucket.name,
        );

        if (!item) {
            return NextResponse.json({error: "No se pudo construir la respuesta de la imagen."}, {status: 500});
        }

        return NextResponse.json({ok: true, image: item}, {headers: {"Cache-Control": "no-store"}});
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo subir la imagen a galería.";
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

        const prefix = buildGalleryPrefix(sesion.uid);
        if (!path.startsWith(prefix)) {
            return NextResponse.json({error: "No tienes permisos para eliminar este archivo."}, {status: 403});
        }

        const bucket = getFirebaseAdminStorage().bucket();
        const relatedRelations = await prisma.imagenRelacion.findMany({
            where: {
                usuarioId: sesion.uid,
                OR: [
                    {origenPath: path},
                    {destinoPath: path},
                ],
            },
            select: {
                id: true,
                tipo: true,
                origenPath: true,
                destinoPath: true,
            },
        });
        const n8nPrefix = buildN8nPrefix(sesion.uid);
        const n8nDerivedPathsToDelete = relatedRelations
            .filter(
                (relation) =>
                    relation.tipo === TipoRelacionImagen.N8N_COMPATIBLE &&
                    relation.origenPath === path &&
                    relation.destinoPath.startsWith(n8nPrefix),
            )
            .map((relation) => relation.destinoPath);

        if (n8nDerivedPathsToDelete.length > 0) {
            await Promise.all(
                n8nDerivedPathsToDelete.map((derivedPath) => bucket.file(derivedPath).delete({ignoreNotFound: true})),
            );
        }

        if (relatedRelations.length > 0) {
            await prisma.imagenRelacion.deleteMany({
                where: {
                    id: {
                        in: relatedRelations.map((relation) => relation.id),
                    },
                },
            });
        }
        await bucket.file(path).delete({ignoreNotFound: true});

        return NextResponse.json({ok: true}, {headers: {"Cache-Control": "no-store"}});
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo eliminar la imagen de galería.";
        return NextResponse.json({error: message}, {status: 500});
    }
}

export async function PATCH(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const payload = (await request.json().catch(() => null)) as { path?: string; name?: string } | null;
        const path = payload?.path?.trim();
        const rawName = typeof payload?.name === "string" ? payload.name : "";

        if (!path) {
            return NextResponse.json({error: "Falta path de la imagen."}, {status: 400});
        }

        let normalizedName = "";
        try {
            normalizedName = normalizeEditableName(rawName);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Nombre inválido.";
            return NextResponse.json({error: message}, {status: 400});
        }

        const prefix = buildGalleryPrefix(sesion.uid);
        if (!path.startsWith(prefix)) {
            return NextResponse.json({error: "No tienes permisos para renombrar este archivo."}, {status: 403});
        }

        const bucket = getFirebaseAdminStorage().bucket();
        const file = bucket.file(path);
        const [exists] = await file.exists();
        if (!exists) {
            return NextResponse.json({error: "La imagen no existe."}, {status: 404});
        }

        const [metadata] = await file.getMetadata();
        const currentCustomMetadata = (metadata.metadata || {}) as Record<string, string>;

        await file.setMetadata({
            metadata: {
                ...currentCustomMetadata,
                originalName: normalizedName,
                renamedAt: new Date().toISOString(),
            },
        });

        const [updatedMetadata] = await file.getMetadata();
        const item = mapStorageFileToResponse(
            {
                name: path,
                metadata: updatedMetadata,
            },
            bucket.name,
        );

        if (!item) {
            return NextResponse.json({error: "No se pudo construir la imagen actualizada."}, {status: 500});
        }

        return NextResponse.json({ok: true, image: item}, {headers: {"Cache-Control": "no-store"}});
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo renombrar la imagen de galería.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
