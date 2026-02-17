import {NextResponse} from "next/server";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const IMAGE_GALLERY_FOLDER = "galeria";

type GalleryImageResponse = {
    path: string;
    name: string;
    downloadURL: string;
    contentType: string | null;
    sizeBytes: number | null;
    createdAt: string | null;
    updatedAt: string | null;
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

export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const bucket = getFirebaseAdminStorage().bucket();
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

        const items = fileWithMetadata
            .map((file) => mapStorageFileToResponse(file as FirebaseFileWithMetadata, bucket.name))
            .filter((item): item is GalleryImageResponse => item !== null)
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });

        return NextResponse.json({ok: true, images: items}, {headers: {"Cache-Control": "no-store"}});
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
