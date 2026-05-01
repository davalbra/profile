import axios from "axios"
import { defineStore } from "pinia"
import type {
  ConsultaFacturacionUso,
  RespuestaFacturacionUso,
} from "@/types/facturacion"

export const useFacturacionRepositorio = defineStore(
  "facturacionRepositorio",
  () => {
    const obtenerUsoFacturacion = async (entrada: ConsultaFacturacionUso) => {
      return await axios.get<RespuestaFacturacionUso>("/api/billing/usage", {
        params: {
          service: entrada.servicio,
          period: entrada.periodo,
        },
      })
    }

    return {
      obtenerUsoFacturacion,
    }
  },
)
