import {NextResponse} from "next/server";
import sharp from "sharp";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";
import {isN8nSupportedImageFormat} from "@/lib/images/n8n-supported-format";

const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const IMAGE_GALLERY_FOLDER = "galeria";
const IMAGE_OPTIMIZED_FOLDER = "optimizadas";
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const N8N_COPY_WEBHOOK_URL =
    "https://n8n.srv1338422.hstgr.cloud/webhook-test/37f97811-ea45-4d5a-a2c5-6f104ca79b15";
const JPEG_CONTENT_TYPE = "image/jpeg";

function buildGalleryPrefix(uid: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${IMAGE_GALLERY_FOLDER}/`;
}

function buildOptimizedPrefix(uid: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${IMAGE_OPTIMIZED_FOLDER}/`;
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

function asString(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (value === null || value === undefined) {
        return null;
    }

    return String(value);
}

async function resolveSourceImage(formData: FormData, uid: string): Promise<{
    buffer: Buffer;
    fileName: string;
    contentType: string;
    source: "local" | "gallery" | "optimized";
}> {
    const fileValue = formData.get("image") ?? formData.get("file");

    if (fileValue instanceof File) {
        if (fileValue.type && !fileValue.type.startsWith("image/")) {
            throw new Error("El archivo debe ser una imagen.");
        }

        if (fileValue.size <= 0) {
            throw new Error("La imagen está vacía.");
        }

        if (fileValue.size > MAX_UPLOAD_BYTES) {
            throw new Error(`La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
        }

        return {
            buffer: Buffer.from(await fileValue.arrayBuffer()),
            fileName: fileValue.name || `image-${Date.now()}`,
            contentType: fileValue.type || "application/octet-stream",
            source: "local",
        };
    }

    const galleryPath = String(formData.get("galleryPath") || "").trim();
    const optimizedPath = String(formData.get("optimizedPath") || "").trim();

    let storagePath = "";
    let prefix = "";
    let source: "gallery" | "optimized";
    let forbiddenMessage = "";
    let notFoundMessage = "";

    if (galleryPath) {
        storagePath = galleryPath;
        prefix = buildGalleryPrefix(uid);
        source = "gallery";
        forbiddenMessage = "No tienes permisos para usar esta imagen de galería.";
        notFoundMessage = "La imagen seleccionada en galería no existe.";
    } else if (optimizedPath) {
        storagePath = optimizedPath;
        prefix = buildOptimizedPrefix(uid);
        source = "optimized";
        forbiddenMessage = "No tienes permisos para usar esta imagen optimizada.";
        notFoundMessage = "La imagen optimizada seleccionada no existe.";
    } else {
        throw new Error("Debes seleccionar una imagen local, de galería o optimizada.");
    }

    if (!storagePath.startsWith(prefix)) {
        throw new Error(forbiddenMessage);
    }

    const bucket = getFirebaseAdminStorage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new Error(notFoundMessage);
    }

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const originalName = asString(metadata.metadata?.originalName);

    if (buffer.length > MAX_UPLOAD_BYTES) {
        throw new Error(`La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
    }

    const fileName = originalName || storagePath.split("/").pop() || `image-${Date.now()}`;
    const contentType = metadata.contentType || "application/octet-stream";

    return {
        buffer,
        fileName,
        contentType,
        source,
    };
}

function shouldForceJpegConversion(formData: FormData): boolean {
    const rawValue = String(formData.get("forceJpegConversion") || "").trim().toLowerCase();
    return rawValue === "1" || rawValue === "true" || rawValue === "yes";
}

function normalizeJpegFileName(fileName: string): string {
    const trimmed = fileName.trim();
    if (!trimmed) {
        return `image-${Date.now()}.jpg`;
    }

    const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, "-");
    const withoutExtension = sanitized.replace(/\.[^.]+$/, "");
    return `${withoutExtension || `image-${Date.now()}`}.jpg`;
}

async function prepareImageForN8n(
    sourceImage: {
        buffer: Buffer;
        fileName: string;
        contentType: string;
        source: "local" | "gallery" | "optimized";
    },
    options: { forceJpegConversion: boolean },
): Promise<{
    buffer: Buffer;
    fileName: string;
    contentType: string;
    source: "local" | "gallery" | "optimized";
    originalContentType: string;
    wasConvertedToJpeg: boolean;
}> {
    const needsJpegConversion =
        options.forceJpegConversion ||
        !isN8nSupportedImageFormat({
            contentType: sourceImage.contentType,
            fileName: sourceImage.fileName,
        });

    if (!needsJpegConversion) {
        return {
            ...sourceImage,
            originalContentType: sourceImage.contentType,
            wasConvertedToJpeg: false,
        };
    }

    let converted: Buffer;
    try {
        converted = await sharp(sourceImage.buffer, {failOn: "none", animated: true})
            .rotate()
            .jpeg({quality: 92, mozjpeg: true})
            .toBuffer();
    } catch {
        throw new Error("No se pudo convertir la imagen a JPG para enviarla a n8n.");
    }

    if (converted.length <= 0) {
        throw new Error("La conversión a JPG produjo un archivo vacío.");
    }

    if (converted.length > MAX_UPLOAD_BYTES) {
        throw new Error(
            `La imagen convertida a JPG supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`,
        );
    }

    return {
        buffer: converted,
        fileName: normalizeJpegFileName(sourceImage.fileName),
        contentType: JPEG_CONTENT_TYPE,
        source: sourceImage.source,
        originalContentType: sourceImage.contentType,
        wasConvertedToJpeg: true,
    };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const formData = await request.formData();
        const sourceImage = await resolveSourceImage(formData, sesion.uid);
        const preparedImage = await prepareImageForN8n(sourceImage, {
            forceJpegConversion: shouldForceJpegConversion(formData),
        });

        const outbound = new FormData();
        outbound.append(
            "image",
            new Blob([new Uint8Array(preparedImage.buffer)], {type: preparedImage.contentType}),
            preparedImage.fileName,
        );
        outbound.append("source", preparedImage.source);
        outbound.append("uid", sesion.uid);

        const response = await fetch(N8N_COPY_WEBHOOK_URL, {
            method: "POST",
            body: outbound,
            cache: "no-store",
        });

        const rawText = await response.text();
        let parsed: unknown = rawText;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            parsed = rawText;
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: "n8n respondió con error.",
                    status: response.status,
                    payload: parsed,
                },
                {status: 502},
            );
        }

        return NextResponse.json(
            {
                ok: true,
                source: preparedImage.source,
                fileName: preparedImage.fileName,
                contentType: preparedImage.contentType,
                originalContentType: preparedImage.originalContentType,
                wasConvertedToJpeg: preparedImage.wasConvertedToJpeg,
                n8n: parsed,
            },
            {headers: {"Cache-Control": "no-store"}},
        );
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo enviar la imagen a n8n.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
