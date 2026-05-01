import axios from "axios";
import {defineStore} from "pinia";
import {AlcanceGaleriaImagen} from "@/utils/enums/anums";
import type {
    DetalleImagenOptimizada,
    EntradaCopiasImagen,
    EntradaOptimizarImagen,
    EntradaRenombrarImagen,
    EntradaRutaImagen,
    EntradaSubirImagenGaleria,
    RespuestaCopiasImagen,
    RespuestaGaleriaImagenes,
    RespuestaHistorialImagenes,
    RespuestaOptimizarImagen,
    RespuestaPrepararImagenN8n,
} from "@/types/imagenes";

function construirFormularioSubida(entrada: EntradaSubirImagenGaleria): FormData {
    const formulario = new FormData();
    formulario.append("image", entrada.imagen);
    return formulario;
}

function construirFormularioOptimizacion(entrada: EntradaOptimizarImagen): FormData {
    const formulario = new FormData();
    formulario.append("galleryPath", entrada.galleryPath);
    formulario.append("qualityMode", entrada.qualityMode);
    return formulario;
}

function construirFormularioCopias(entrada: EntradaCopiasImagen): FormData {
    const formulario = new FormData();
    formulario.append("galleryPath", entrada.galleryPath);

    if (entrada.forceJpegConversion) formulario.append("forceJpegConversion", "true");
    if (entrada.prepareOnly) formulario.append("prepareOnly", "true");
    if (entrada.optimizeForWeb) formulario.append("optimizeForWeb", "true");

    return formulario;
}

export const useImagenesRepositorio = defineStore("imagenesRepositorio", () => {
    const obtenerGaleria = async (alcance: AlcanceGaleriaImagen) => {
        const parametros = alcance === AlcanceGaleriaImagen.GALERIA ? {} : {scope: alcance};
        return await axios.get<RespuestaGaleriaImagenes>("/api/images/gallery", {
            params: parametros,
            headers: {"Cache-Control": "no-store"},
        });
    };

    const subirImagenGaleria = async (entrada: EntradaSubirImagenGaleria) => {
        return await axios.post("/api/images/gallery", construirFormularioSubida(entrada));
    };

    const eliminarImagenGaleria = async (entrada: EntradaRutaImagen) => {
        return await axios.delete("/api/images/gallery", {data: entrada});
    };

    const renombrarImagenGaleria = async (entrada: EntradaRenombrarImagen) => {
        return await axios.patch("/api/images/gallery", entrada);
    };

    const optimizarImagen = async (entrada: EntradaOptimizarImagen) => {
        return await axios.post<RespuestaOptimizarImagen>("/api/images", construirFormularioOptimizacion(entrada));
    };

    const obtenerHistorialOptimizacion = async () => {
        return await axios.get<RespuestaHistorialImagenes>("/api/images", {
            headers: {"Cache-Control": "no-store"},
        });
    };

    const prepararImagenN8n = async (entrada: EntradaCopiasImagen) => {
        return await axios.post<RespuestaPrepararImagenN8n>("/api/images/copies", construirFormularioCopias(entrada));
    };

    const enviarImagenN8n = async (entrada: EntradaCopiasImagen) => {
        return await axios.post<RespuestaCopiasImagen>("/api/images/copies", construirFormularioCopias(entrada));
    };

    const obtenerDetalleOptimizacion = async (id: string) => {
        return await axios.get<DetalleImagenOptimizada>(`/api/images/optimize/${encodeURIComponent(id)}`, {
            headers: {"Cache-Control": "no-store"},
        });
    };

    return {
        obtenerGaleria,
        subirImagenGaleria,
        eliminarImagenGaleria,
        renombrarImagenGaleria,
        optimizarImagen,
        obtenerHistorialOptimizacion,
        prepararImagenN8n,
        enviarImagenN8n,
        obtenerDetalleOptimizacion,
    };
});
