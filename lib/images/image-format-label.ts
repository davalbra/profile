function extractExtension(fileName: string): string {
    const trimmed = fileName.trim();
    const dotIndex = trimmed.lastIndexOf(".");

    if (dotIndex <= -1 || dotIndex === trimmed.length - 1) {
        return "";
    }

    return trimmed.slice(dotIndex + 1).toLowerCase();
}

export function getImageFormatLabel(input: { contentType?: string | null; fileName?: string | null }): string {
    const mime = (input.contentType || "").toLowerCase().split(";")[0].trim();

    if (mime === "image/jpeg") {
        return "JPG";
    }
    if (mime === "image/png") {
        return "PNG";
    }
    if (mime === "image/webp") {
        return "WEBP";
    }
    if (mime === "image/avif") {
        return "AVIF";
    }
    if (mime === "image/heic") {
        return "HEIC";
    }
    if (mime === "image/heif") {
        return "HEIF";
    }
    if (mime === "image/gif") {
        return "GIF";
    }
    if (mime === "image/bmp") {
        return "BMP";
    }
    if (mime === "image/tiff") {
        return "TIFF";
    }
    if (mime === "image/svg+xml") {
        return "SVG";
    }

    const extension = extractExtension(input.fileName || "");
    if (extension === "jpeg") {
        return "JPG";
    }
    if (extension) {
        return extension.toUpperCase();
    }

    if (mime.startsWith("image/")) {
        return mime.slice(6).replace("+xml", "").toUpperCase() || "IMG";
    }

    return "IMG";
}
