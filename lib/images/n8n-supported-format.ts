const N8N_SUPPORTED_IMAGE_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
]);

function normalizeMime(contentType: string | null | undefined): string {
    return (contentType || "").toLowerCase().split(";")[0].trim();
}

function extractExtension(fileName: string | null | undefined): string {
    if (!fileName) {
        return "";
    }

    const trimmed = fileName.trim().toLowerCase();
    const dotIndex = trimmed.lastIndexOf(".");

    if (dotIndex <= -1 || dotIndex === trimmed.length - 1) {
        return "";
    }

    return trimmed.slice(dotIndex + 1);
}

function inferMimeFromExtension(extension: string): string | null {
    if (extension === "jpg" || extension === "jpeg") {
        return "image/jpeg";
    }
    if (extension === "png") {
        return "image/png";
    }
    if (extension === "webp") {
        return "image/webp";
    }
    if (extension === "heic") {
        return "image/heic";
    }
    if (extension === "heif") {
        return "image/heif";
    }
    if (extension === "avif") {
        return "image/avif";
    }

    return null;
}

export function isN8nSupportedImageFormat(input: { contentType?: string | null; fileName?: string | null }): boolean {
    const mime = normalizeMime(input.contentType || null);
    if (N8N_SUPPORTED_IMAGE_MIME_TYPES.has(mime)) {
        return true;
    }

    const inferred = inferMimeFromExtension(extractExtension(input.fileName || null));
    return inferred ? N8N_SUPPORTED_IMAGE_MIME_TYPES.has(inferred) : false;
}
