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
const IMAGE_N8N_FOLDER = "n8n";
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

function buildN8nPrefix(uid: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${IMAGE_N8N_FOLDER}/`;
}

function getDownloadUrl(bucketName: string, path: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
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

function normalizeMime(contentType: string | null): string {
    return (contentType || "").toLowerCase().split(";")[0].trim();
}

function extractFileNameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
        return null;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
    if (quotedMatch?.[1]) {
        return quotedMatch[1];
    }

    const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
    if (plainMatch?.[1]) {
        return plainMatch[1].trim();
    }

    return null;
}

function extractFileExtension(fileName: string | null): string | null {
    if (!fileName) {
        return null;
    }

    const trimmed = fileName.trim();
    if (!trimmed) {
        return null;
    }

    const parts = trimmed.toLowerCase().split(".");
    if (parts.length < 2) {
        return null;
    }

    return parts[parts.length - 1] || null;
}

function extensionFromMime(contentType: string): string {
    switch (contentType) {
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/gif":
            return "gif";
        case "image/bmp":
            return "bmp";
        case "image/tiff":
            return "tiff";
        case "image/avif":
            return "avif";
        case "image/heic":
            return "heic";
        case "image/heif":
            return "heif";
        case "image/svg+xml":
            return "svg";
        default:
            return "bin";
    }
}

function mimeFromFileExtension(extension: string | null): string | null {
    switch (extension) {
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "gif":
            return "image/gif";
        case "bmp":
            return "image/bmp";
        case "tif":
        case "tiff":
            return "image/tiff";
        case "avif":
            return "image/avif";
        case "heic":
            return "image/heic";
        case "heif":
            return "image/heif";
        case "svg":
            return "image/svg+xml";
        default:
            return null;
    }
}

function sniffImageMimeFromBuffer(buffer: Buffer): string | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }

    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return "image/png";
    }

    if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return "image/webp";
    }

    if (
        buffer.length >= 4 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
    ) {
        return "image/gif";
    }

    if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
        return "image/bmp";
    }

    if (
        buffer.length >= 4 &&
        ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
            (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
    ) {
        return "image/tiff";
    }

    if (buffer.length >= 12) {
        const boxType = buffer.toString("ascii", 4, 8);
        if (boxType === "ftyp") {
            const brand = buffer.toString("ascii", 8, 12).trim();
            if (brand === "avif" || brand === "avis") {
                return "image/avif";
            }

            if (brand.startsWith("hei") || brand.startsWith("hev")) {
                return "image/heic";
            }

            if (brand === "mif1" || brand === "msf1") {
                return "image/heif";
            }
        }
    }

    return null;
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

function normalizeN8nStoredFileName(fileName: string, contentType: string): string {
    const trimmed = fileName.trim();
    const safeRawName = (trimmed || `n8n-image-${Date.now()}`)
        .replace(/[\\/\0]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    const withoutExtension = safeRawName.replace(/\.[^.]+$/, "").replace(/^-|-$/g, "") || `n8n-image-${Date.now()}`;
    const providedExtension = extractFileExtension(safeRawName);
    const validProvidedExtension = mimeFromFileExtension(providedExtension) ? providedExtension : null;
    const extension = validProvidedExtension || extensionFromMime(contentType);
    return `${withoutExtension}.${extension}`;
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
        const n8nContentDisposition = response.headers.get("content-disposition");
        const n8nHeaderContentType = normalizeMime(response.headers.get("content-type"));
        const n8nBuffer = Buffer.from(await response.arrayBuffer());
        const n8nImageFileNameFromHeaders = extractFileNameFromContentDisposition(n8nContentDisposition);
        const n8nMimeFromFileName = mimeFromFileExtension(extractFileExtension(n8nImageFileNameFromHeaders));
        const n8nMimeFromBuffer = sniffImageMimeFromBuffer(n8nBuffer);
        const n8nDetectedImageMime =
            n8nHeaderContentType.startsWith("image/")
                ? n8nHeaderContentType
                : n8nMimeFromFileName || n8nMimeFromBuffer;
        const n8nResponseIsImage = Boolean(n8nDetectedImageMime);
        const n8nContentType = n8nDetectedImageMime || n8nHeaderContentType || "application/octet-stream";

        let parsed: unknown = null;
        let imagePayload:
            | {
            dataUrl: string;
            contentType: string;
            sizeBytes: number;
            fileName: string;
        }
            | null = null;
        let storedN8nImage:
            | {
            path: string;
            name: string;
            downloadURL: string;
            contentType: string;
            sizeBytes: number;
            createdAt: string;
        }
            | null = null;

        if (n8nResponseIsImage) {
            const n8nImageFileName =
                n8nImageFileNameFromHeaders || preparedImage.fileName;
            if (n8nBuffer.length > MAX_UPLOAD_BYTES) {
                throw new Error(
                    `La imagen devuelta por n8n supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`,
                );
            }
            const n8nStoredFileName = normalizeN8nStoredFileName(n8nImageFileName, n8nContentType);
            const n8nStoredPath = `${buildN8nPrefix(sesion.uid)}${Date.now()}-${n8nStoredFileName}`;
            const createdAt = new Date().toISOString();
            const downloadToken = crypto.randomUUID();
            const bucket = getFirebaseAdminStorage().bucket();
            const destination = bucket.file(n8nStoredPath);

            await destination.save(n8nBuffer, {
                resumable: false,
                metadata: {
                    contentType: n8nContentType,
                    metadata: {
                        firebaseStorageDownloadTokens: downloadToken,
                        originalName: n8nImageFileName,
                        source: "n8n",
                        createdAt,
                    },
                },
            });

            imagePayload = {
                dataUrl: `data:${n8nContentType};base64,${n8nBuffer.toString("base64")}`,
                contentType: n8nContentType,
                sizeBytes: n8nBuffer.length,
                fileName: n8nImageFileName,
            };

            storedN8nImage = {
                path: n8nStoredPath,
                name: n8nImageFileName,
                downloadURL: getDownloadUrl(bucket.name, n8nStoredPath, downloadToken),
                contentType: n8nContentType,
                sizeBytes: n8nBuffer.length,
                createdAt,
            };
        } else {
            const rawText = n8nBuffer.toString("utf-8");
            parsed = rawText;
            try {
                parsed = JSON.parse(rawText);
            } catch {
                parsed = rawText;
            }
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: "n8n respondió con error.",
                    status: response.status,
                    payload: n8nResponseIsImage ? {
                        contentType: n8nContentType,
                        message: "n8n devolvió una imagen en una respuesta de error.",
                    } : parsed,
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
                n8nContentType,
                n8nResponseType: n8nResponseIsImage ? "image" : "data",
                n8nImage: imagePayload,
                n8nStoredImage: storedN8nImage,
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
