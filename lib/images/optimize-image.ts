import sharp from "sharp";

const DEFAULT_MAX_DIMENSION = 2400;
const DEFAULT_AVIF_QUALITY = 52;
const DEFAULT_AVIF_EFFORT = 4;

export type OptimizeImageOptions = {
    input: Buffer;
    fileName?: string;
    maxDimension?: number;
    quality?: number;
    effort?: number;
};

export type OptimizeImageResult = {
    output: Buffer;
    outputName: string;
    original: {
        sizeBytes: number;
        format: string | null;
        width: number | null;
        height: number | null;
    };
    optimized: {
        sizeBytes: number;
        format: "avif";
        width: number | null;
        height: number | null;
    };
};

export function getBaseName(fileName: string): string {
    const trimmed = fileName.trim();
    if (!trimmed) {
        return "imagen";
    }

    const noExt = trimmed.replace(/\.[^.]+$/, "");
    return noExt.replace(/[^a-zA-Z0-9\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "imagen";
}

export async function optimizeImageToAvif(options: OptimizeImageOptions): Promise<OptimizeImageResult> {
    const source = options.input;
    const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
    const quality = options.quality ?? DEFAULT_AVIF_QUALITY;
    const effort = options.effort ?? DEFAULT_AVIF_EFFORT;
    const sourceMetadata = await sharp(source, {failOn: "none", animated: true}).metadata();

    const {data, info} = await sharp(source, {failOn: "none", animated: true})
        .rotate()
        .resize({
            width: maxDimension,
            height: maxDimension,
            fit: "inside",
            withoutEnlargement: true,
        })
        .avif({
            quality,
            effort,
        })
        .toBuffer({resolveWithObject: true});

    const outputName = `${getBaseName(options.fileName || "imagen")}.avif`;

    return {
        output: data,
        outputName,
        original: {
            sizeBytes: source.length,
            format: sourceMetadata.format || null,
            width: sourceMetadata.width || null,
            height: sourceMetadata.height || null,
        },
        optimized: {
            sizeBytes: data.length,
            format: "avif",
            width: info.width || null,
            height: info.height || null,
        },
    };
}

export const IMAGE_OPTIMIZATION_DEFAULTS = {
    maxDimension: DEFAULT_MAX_DIMENSION,
    quality: DEFAULT_AVIF_QUALITY,
    effort: DEFAULT_AVIF_EFFORT,
} as const;
