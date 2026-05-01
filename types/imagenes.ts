import type { GalleryImage } from "@/lib/images/gallery-image";
import type { AlcanceGaleriaImagen, ColeccionOrigenImagen, ModoCalidadImagen, OrigenFlujoImagen } from "@/utils/enums/anums";

export interface ImagenGuardada {
  path: string;
  name: string;
  downloadURL: string;
  contentType: string | null;
  sizeBytes: number;
  createdAt: string;
}

export interface ImagenN8nVistaPrevia {
  dataUrl: string;
  contentType: string;
  sizeBytes: number;
  fileName: string;
}

export interface ImagenOptimizadaGuardada {
  id: string;
  original: ImagenGuardada;
  optimized: ImagenGuardada;
  savedBytes: number;
  savedPercent: number;
}

export interface RegistroHistorialOptimizacion {
  id: string;
  path: string;
  name: string;
  downloadURL: string;
  contentType: string | null;
  sizeBytes: number | null;
  originalSizeBytes: number | null;
  optimizedSizeBytes: number | null;
  savedBytes: number | null;
  savedPercent: number | null;
  optimizationStats: {
    id: string;
    engine: string;
    quality: number | null;
    effort: number | null;
    createdAt: string;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RegistroHistorialConMetricas extends RegistroHistorialOptimizacion {
  originalBytes: number | null;
  optimizedBytes: number | null;
  savedBytes: number | null;
  savedPercent: number | null;
}

export interface RespuestaGaleriaImagenes {
  images: GalleryImage[];
}

export interface EntradaSubirImagenGaleria {
  imagen: File;
}

export interface EntradaRutaImagen {
  path: string;
}

export interface EntradaRenombrarImagen {
  path: string;
  name: string;
}

export interface EntradaOptimizarImagen {
  galleryPath: string;
  qualityMode: ModoCalidadImagen;
}

export interface RespuestaOptimizarImagen {
  image: {
    path: string | null;
    name: string | null;
    sizeBytes: number | null;
    originalSizeBytes: number | null;
    optimizedSizeBytes: number | null;
    savedBytes: number | null;
    savedPercent: number | null;
  } | null;
}

export interface ResultadoOptimizarImagen {
  optimizedBytes: number;
  originalBytes: number;
  savedBytes: number;
  savedPercent: number;
  optimizedPath: string | null;
  optimizedName: string | null;
}

export interface RespuestaHistorialImagenes {
  images: RegistroHistorialOptimizacion[];
}

export interface EntradaCopiasImagen {
  galleryPath: string;
  forceJpegConversion: boolean;
  prepareOnly: boolean;
  optimizeForWeb: boolean;
}

export interface RespuestaCopiasImagen {
  error: string | null;
  n8n: object | null;
  n8nImage: ImagenN8nVistaPrevia | null;
  n8nStoredImage: ImagenGuardada | null;
  n8nCompatibleImage: ImagenGuardada | null;
  optimizedWebImage: ImagenOptimizadaGuardada | null;
  source: OrigenFlujoImagen | null;
  fileName: string | null;
  wasConvertedToJpeg: boolean;
}

export interface RespuestaPrepararImagenN8n {
  error: string | null;
  wasConvertedToJpeg: boolean;
  n8nCompatibleImage: ImagenGuardada | null;
}

export interface DetalleImagenOptimizada {
  image: {
    id: string;
    slug: string;
    name: string;
    originalName: string;
    path: string;
    downloadURL: string;
    originalPath: string;
    contentType: string | null;
    originalContentType: string | null;
    sizeBytes: number | null;
    originalSizeBytes: number | null;
    savedBytes: number | null;
    savedPercent: number | null;
    sourceCollection: ColeccionOrigenImagen | null;
    sourceStoragePath: string | null;
    sourceWasN8n: boolean;
    createdAt: string;
    updatedAt: string;
    optimizationStats: {
      id: string;
      engine: string | null;
      quality: number | null;
      effort: number | null;
      createdAt: string;
    } | null;
  };
  lineage: Array<{
    path: string;
    name: string;
    contentType: string | null;
    sizeBytes: number | null;
    downloadURL: string | null;
    collection: ColeccionOrigenImagen;
    stepLabel: string;
    isCurrent: boolean;
  }>;
  transitions: Array<{
    fromPath: string;
    toPath: string;
    fromCollection: string;
    toCollection: string;
    fromContentType: string | null;
    toContentType: string | null;
    fromSizeBytes: number | null;
    toSizeBytes: number | null;
    savedBytes: number | null;
    savedPercent: number | null;
  }>;
}

export interface ConsultaGaleria {
  scope: AlcanceGaleriaImagen;
}
