import axios from "axios"
import { defineStore } from "pinia"
import type {
  ConsultaExportacionPlacesOs,
  ConsultaFilasPlacesOs,
  ConsultaMapaPlacesOs,
  ConsultaTablasPlacesOs,
  RespuestaExportacionPlacesOs,
  RespuestaFilasPlacesOs,
  RespuestaMapaPlacesOs,
  RespuestaPaisesPlacesOs,
  RespuestaTablasPlacesOs,
} from "@/types/scrap"

export const useScrapRepositorio = defineStore("scrapRepositorio", () => {
  const obtenerPaisesPlacesOs = async () => {
    return await axios.get<RespuestaPaisesPlacesOs>(
      "/api/scrap/foursquare-os/countries",
    )
  }

  const obtenerFilasPlacesOs = async (entrada: ConsultaFilasPlacesOs) => {
    return await axios.get<RespuestaFilasPlacesOs>(
      "/api/scrap/foursquare-os/rows",
      {
        params: {
          page: entrada.page,
          pageSize: entrada.pageSize,
          q: entrada.q,
          country: entrada.country,
          timezone: entrada.timezone,
          website: entrada.website,
        },
      },
    )
  }

  const exportarPlacesOs = async (entrada: ConsultaExportacionPlacesOs) => {
    return await axios.post<RespuestaExportacionPlacesOs>(
      "/api/scrap/foursquare-os/export",
      {
        country: entrada.pais,
        website: entrada.website,
        limite: entrada.limite,
      },
    )
  }

  const obtenerTablasPlacesOs = async (entrada: ConsultaTablasPlacesOs) => {
    return await axios.get<RespuestaTablasPlacesOs>(
      "/api/scrap/foursquare-os/tables",
      {
        params: {
          country: entrada.pais,
          website: entrada.website,
        },
      },
    )
  }

  const obtenerMapaPlacesOs = async (entrada: ConsultaMapaPlacesOs) => {
    return await axios.get<RespuestaMapaPlacesOs>(
      "/api/scrap/foursquare-os/map",
      {
        params: {
          tableName: entrada.tableName,
          country: entrada.pais,
          website: entrada.website,
          limite: entrada.limite,
          q: entrada.q,
        },
      },
    )
  }

  return {
    exportarPlacesOs,
    obtenerFilasPlacesOs,
    obtenerMapaPlacesOs,
    obtenerPaisesPlacesOs,
    obtenerTablasPlacesOs,
  }
})
