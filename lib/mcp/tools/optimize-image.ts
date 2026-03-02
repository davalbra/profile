import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";
import {IMAGE_OPTIMIZATION_DEFAULTS, optimizeImageToAvif} from "@/lib/images/optimize-image";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const MCP_OPTIMIZED_FOLDER = "mcp/optimizadas";

function parseRemoteImageUrl(raw: string): URL {
    const trimmed = raw.trim();
    if (!trimmed) {
        throw new Error("imageUrl no puede estar vacío.");
    }

    let url: URL;

    try {
        url = new URL(trimmed);
    } catch {
        throw new Error("imageUrl debe ser una URL válida.");
    }

    if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("imageUrl debe usar http o https.");
    }

    if (url.username || url.password) {
        throw new Error("imageUrl no puede incluir credenciales.");
    }

    if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(url.hostname)) {
        throw new Error("imageUrl debe apuntar a una URL pública.");
    }

    return url;
}

function inferFileNameFromUrl(url: URL): string {
    const segment = url.pathname.split("/").filter(Boolean).pop();
    if (!segment) {
        return "imagen";
    }

    try {
        return decodeURIComponent(segment) || "imagen";
    } catch {
        return segment || "imagen";
    }
}

function getDownloadUrl(bucketName: string, path: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function fetchRemoteImageInput(imageUrl: string) {
    const sourceUrl = parseRemoteImageUrl(imageUrl);

    let response: Response;
    try {
        response = await fetch(sourceUrl, {
            method: "GET",
            headers: {
                Accept: "image/*",
            },
        });
    } catch {
        throw new Error("No se pudo descargar imageUrl.");
    }

    if (!response.ok) {
        throw new Error(`No se pudo descargar la imagen (${response.status} ${response.statusText}).`);
    }

    const contentLengthHeader = response.headers.get("content-length");
    const declaredSize = contentLengthHeader ? Number(contentLengthHeader) : null;
    if (declaredSize !== null && Number.isFinite(declaredSize) && declaredSize > MAX_UPLOAD_BYTES) {
        throw new Error(`La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
    }

    const contentTypeHeader = response.headers.get("content-type");
    const contentType = contentTypeHeader?.split(";")[0]?.trim() || null;
    if (contentType && !contentType.startsWith("image/")) {
        throw new Error("imageUrl no apunta a un recurso de imagen.");
    }

    const arrayBuffer = await response.arrayBuffer();
    const input = Buffer.from(arrayBuffer);

    if (!input.length) {
        throw new Error("La imagen descargada está vacía.");
    }

    if (input.length > MAX_UPLOAD_BYTES) {
        throw new Error(`La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
    }

    const resolvedUrl = response.url || sourceUrl.toString();
    const resolvedFileName = inferFileNameFromUrl(parseRemoteImageUrl(resolvedUrl));

    return {
        input,
        contentType,
        resolvedUrl,
        resolvedFileName,
    };
}

async function uploadOptimizedImage(input: {
    fileName: string;
    sourceUrl: string;
    originalSizeBytes: number;
    optimizedSizeBytes: number;
    buffer: Buffer;
}) {
    const bucket = getFirebaseAdminStorage().bucket();
    const token = crypto.randomUUID();
    const timestamp = Date.now();
    const path = `${MCP_OPTIMIZED_FOLDER}/${timestamp}-${input.fileName}`;
    const file = bucket.file(path);

    await file.save(input.buffer, {
        resumable: false,
        metadata: {
            contentType: "image/avif",
            metadata: {
                firebaseStorageDownloadTokens: token,
                source: "mcp-optimize-image",
                originalUrl: input.sourceUrl,
                originalSizeBytes: String(input.originalSizeBytes),
                optimizedSizeBytes: String(input.optimizedSizeBytes),
                optimizedAt: new Date().toISOString(),
            },
        },
    });

    return {
        path,
        bucketName: bucket.name,
        downloadUrl: getDownloadUrl(bucket.name, path, token),
    };
}

function buildOptimizeImageContent(input: {
    summary: string;
    downloadUrl: string;
    fileName: string;
}) {
    return [
        {
            type: "text" as const,
            text: input.summary,
        },
        {
            type: "text" as const,
            text: input.downloadUrl,
        },
        {
            type: "resource_link" as const,
            uri: input.downloadUrl,
            name: input.fileName,
            mimeType: "image/avif",
            description: "Imagen optimizada en AVIF",
        },
    ];
}

function buildOptimizeImageStructuredContent(input: {
    fileName: string;
    sourceUrl: string;
    sourceContentType: string | null;
    originalSizeBytes: number;
    optimizedSizeBytes: number;
    savedBytes: number;
    savedPercent: number;
    width: number | null;
    height: number | null;
    storagePath: string;
    bucketName: string;
    downloadUrl: string;
    returnBase64: boolean | undefined;
    optimizedOutput: Buffer;
}) {
    const structuredContent: Record<string, unknown> = {
        fileName: input.fileName,
        format: "avif",
        originalSizeBytes: input.originalSizeBytes,
        optimizedSizeBytes: input.optimizedSizeBytes,
        savedBytes: input.savedBytes,
        savedPercent: input.savedPercent,
        width: input.width,
        height: input.height,
        sourceUrl: input.sourceUrl,
        sourceContentType: input.sourceContentType,
        storagePath: input.storagePath,
        bucketName: input.bucketName,
        optimizedUrl: input.downloadUrl,
        downloadUrl: input.downloadUrl,
    };

    if (input.returnBase64) {
        structuredContent.optimizedBase64 = input.optimizedOutput.toString("base64");
    }

    return structuredContent;
}

export function registerOptimizeImageTool(server: McpServer) {
    server.registerTool(
        "optimize_image",
        {
            title: "Optimizar imagen AVIF",
            description: "Optimiza una imagen remota por URL a formato AVIF con metadata de ahorro.",
            inputSchema: {
                imageUrl: z.url().describe("URL pública de la imagen a optimizar."),
                fileName: z.string().optional(),
                quality: z.number().int().min(1).max(100).optional(),
                effort: z.number().int().min(0).max(9).optional(),
                maxDimension: z.number().int().min(256).max(4096).optional(),
                returnBase64: z.boolean().optional(),
            },
        },
        async ({imageUrl, fileName, quality, effort, maxDimension, returnBase64}) => {
            try {
                const remoteImage = await fetchRemoteImageInput(imageUrl);
                const optimized = await optimizeImageToAvif({
                    input: remoteImage.input,
                    fileName: fileName || remoteImage.resolvedFileName,
                    quality: quality ?? IMAGE_OPTIMIZATION_DEFAULTS.quality,
                    effort: effort ?? IMAGE_OPTIMIZATION_DEFAULTS.effort,
                    maxDimension: maxDimension ?? IMAGE_OPTIMIZATION_DEFAULTS.maxDimension,
                });

                const savedBytes = Math.max(0, optimized.original.sizeBytes - optimized.optimized.sizeBytes);
                const savedPercent =
                    optimized.original.sizeBytes > 0
                        ? Number(((savedBytes / optimized.original.sizeBytes) * 100).toFixed(2))
                        : 0;
                const uploaded = await uploadOptimizedImage({
                    fileName: optimized.outputName,
                    sourceUrl: remoteImage.resolvedUrl,
                    originalSizeBytes: optimized.original.sizeBytes,
                    optimizedSizeBytes: optimized.optimized.sizeBytes,
                    buffer: optimized.output,
                });

                return {
                    content: buildOptimizeImageContent({
                        summary: `Optimización completada: ${optimized.original.sizeBytes} -> ${optimized.optimized.sizeBytes} bytes (${savedPercent}% ahorro).`,
                        downloadUrl: uploaded.downloadUrl,
                        fileName: optimized.outputName,
                    }),
                    structuredContent: buildOptimizeImageStructuredContent({
                        fileName: optimized.outputName,
                        sourceUrl: remoteImage.resolvedUrl,
                        sourceContentType: remoteImage.contentType,
                        originalSizeBytes: optimized.original.sizeBytes,
                        optimizedSizeBytes: optimized.optimized.sizeBytes,
                        savedBytes,
                        savedPercent,
                        width: optimized.optimized.width,
                        height: optimized.optimized.height,
                        storagePath: uploaded.path,
                        bucketName: uploaded.bucketName,
                        downloadUrl: uploaded.downloadUrl,
                        returnBase64,
                        optimizedOutput: optimized.output,
                    }),
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : "No se pudo optimizar la imagen.";
                return {
                    isError: true,
                    content: [{type: "text", text: message}],
                };
            }
        },
    );
}
