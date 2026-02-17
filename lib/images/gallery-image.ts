export type GalleryImage = {
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
    optimizedSourceCollection?: "gallery" | "n8n" | "optimized" | "local" | null;
    sourceWasN8n?: boolean;
};
