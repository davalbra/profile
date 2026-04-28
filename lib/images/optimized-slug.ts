function normalizePart(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

export function buildOptimizedImageSlug(input: { id: string; name: string }): string {
    const cleanName = normalizePart(input.name || "imagen");
    return cleanName ? `${cleanName}--${input.id}` : input.id;
}

export function parseOptimizedImageIdFromSlug(slug: string): string {
    const clean = decodeURIComponent(slug || "").trim();
    if (!clean) {
        return "";
    }

    const markerIndex = clean.lastIndexOf("--");
    if (markerIndex < 0) {
        return clean;
    }

    return clean.slice(markerIndex + 2);
}
