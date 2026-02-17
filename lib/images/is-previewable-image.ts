export function isPreviewableImage(contentType: string | null, name: string): boolean {
    const mime = (contentType || "").toLowerCase();
    const fileName = name.toLowerCase();

    if (mime.includes("heic") || mime.includes("heif")) {
        return false;
    }

    if (fileName.endsWith(".heic") || fileName.endsWith(".heif")) {
        return false;
    }

    return true;
}
