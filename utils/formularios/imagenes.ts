import type {
  EntradaCopiasImagen,
  EntradaOptimizarImagen,
  EntradaSubirImagenGaleria,
} from "@/types/imagenes"

export function construirFormularioSubidaImagen(
  entrada: EntradaSubirImagenGaleria,
): FormData {
  const formulario = new FormData()
  formulario.append("image", entrada.imagen)
  return formulario
}

export function construirFormularioOptimizacionImagen(
  entrada: EntradaOptimizarImagen,
): FormData {
  const formulario = new FormData()
  formulario.append("galleryPath", entrada.galleryPath)
  formulario.append("qualityMode", entrada.qualityMode)
  return formulario
}

export function construirFormularioCopiasImagen(
  entrada: EntradaCopiasImagen,
): FormData {
  const formulario = new FormData()
  formulario.append("galleryPath", entrada.galleryPath)

  if (entrada.forceJpegConversion)
    formulario.append("forceJpegConversion", "true")
  if (entrada.prepareOnly) formulario.append("prepareOnly", "true")
  if (entrada.optimizeForWeb) formulario.append("optimizeForWeb", "true")

  return formulario
}
