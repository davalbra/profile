import { AlcanceGaleriaImagen, ModoCalidadImagen, TamanoPaginaGaleria } from "@/utils/enums/anums";

export const bytesMaximosCargaImagen = 40 * 1024 * 1024;

export const tamanosPaginaGaleria: TamanoPaginaGaleria[] = [
  TamanoPaginaGaleria.DIEZ,
  TamanoPaginaGaleria.VEINTICINCO,
  TamanoPaginaGaleria.CINCUENTA,
];

export const modoCalidadImagenPredeterminado = ModoCalidadImagen.BALANCEADO;

export const alcanceGaleriaPredeterminado = AlcanceGaleriaImagen.GALERIA;

export const nombreArchivoImagenPredeterminado = "imagen";
