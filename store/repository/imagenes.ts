import axios from "axios";
import {defineStore} from "pinia";
import {
    construirFormularioCopiasImagen,
    construirFormularioOptimizacionImagen,
    construirFormularioSubidaImagen,
} from "@/utils/formularios/imagenes";
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

export const useImagenesRepositorio = defineStore("imagenesRepositorio", () => {
    const obtenerGaleria = async (alcance: AlcanceGaleriaImagen) => {
        const parametros =
            alcance === AlcanceGaleriaImagen.GALERIA ? {} : {scope: alcance};
        return await axios.get<RespuestaGaleriaImagenes>("/api/images/gallery", {
            params: parametros,
            headers: {"Cache-Control": "no-store"},
        });
    };

    const subirImagenGaleria = async (entrada: EntradaSubirImagenGaleria) => {
        return await axios.post(
            "/api/images/gallery",
            construirFormularioSubidaImagen(entrada),
        );
    };

    const eliminarImagenGaleria = async (entrada: EntradaRutaImagen) => {
        return await axios.delete("/api/images/gallery", {data: entrada});
    };

    const renombrarImagenGaleria = async (entrada: EntradaRenombrarImagen) => {
        return await axios.patch("/api/images/gallery", entrada);
    };

    const optimizarImagen = async (entrada: EntradaOptimizarImagen) => {
        return await axios.post<RespuestaOptimizarImagen>(
            "/api/images",
            construirFormularioOptimizacionImagen(entrada),
        );
    };

    const obtenerHistorialOptimizacion = async () => {
        return await axios.get<RespuestaHistorialImagenes>("/api/images", {
            headers: {"Cache-Control": "no-store"},
        });
    };

    const prepararImagenN8n = async (entrada: EntradaCopiasImagen) => {
        return await axios.post<RespuestaPrepararImagenN8n>(
            "/api/images/copies",
            construirFormularioCopiasImagen(entrada),
        );
    };

    const enviarImagenN8n = async (entrada: EntradaCopiasImagen) => {
        return await axios.post<RespuestaCopiasImagen>(
            "/api/images/copies",
            construirFormularioCopiasImagen(entrada),
        );
    };

    const obtenerDetalleOptimizacion = async (id: string) => {
        return await axios.get<DetalleImagenOptimizada>(
            `/api/images/optimize/${encodeURIComponent(id)}`,
            {
                headers: {"Cache-Control": "no-store"},
            },
        );
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
