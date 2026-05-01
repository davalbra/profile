import {nombreArchivoImagenPredeterminado} from "@/utils/constants/imagenes";

export function formatearBytes(bytes: number | null): string {
    if (!bytes || Number.isNaN(bytes)) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function obtenerExtensionPorTipoContenido(tipoContenido: string | null): string {
    const tipoNormalizado = (tipoContenido || "").toLowerCase().split(";")[0].trim();

    switch (tipoNormalizado) {
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/avif":
            return "avif";
        case "image/heic":
            return "heic";
        case "image/heif":
            return "heif";
        default:
            return "img";
    }
}

export function construirNombreDescargaImagen(entrada: { nombre: string; tipoContenido: string | null }): string {
    const nombreNormalizado = entrada.nombre.trim();
    const extension = obtenerExtensionPorTipoContenido(entrada.tipoContenido);

    if (!nombreNormalizado) return `${nombreArchivoImagenPredeterminado}.${extension}`;
    if (/\.[a-z0-9]+$/i.test(nombreNormalizado)) return nombreNormalizado;
    return `${nombreNormalizado}.${extension}`;
}
