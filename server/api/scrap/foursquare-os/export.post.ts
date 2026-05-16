import { fetchFoursquareOsPreviewRows } from "@/lib/foursquare/os-places"
import {
  actualizarTablaMaestraPlacesOs,
  asegurarTablaDatosPlacesOs,
  construirNombreTablaPlacesOs,
  exportarFilasPlacesOs,
  maximoFilasExportacionPlacesOs,
  normalizarLimitePlacesOs,
  normalizarPaisPlacesOs,
  normalizarWebsitePlacesOs,
  type FilaExportablePlacesOs,
} from "@/server/utils/places-os-neon"
import type { FiltroWebsitePlacesOs } from "@/utils/enums/anums"
import { createError, readBody, setHeader } from "h3"

interface CuerpoExportacionPlacesOs {
  country?: string | null
  website?: string | null
  limite?: number | null
}

const tamanoPaginaExportacion = 100

async function obtenerFilasExportables(input: {
  country: string
  website: FiltroWebsitePlacesOs
  limite: number
}) {
  const filas: FilaExportablePlacesOs[] = []
  let pagina = 1
  let continuar = true

  while (filas.length < input.limite && continuar) {
    const respuesta = await fetchFoursquareOsPreviewRows({
      page: pagina,
      pageSize: tamanoPaginaExportacion,
      country: input.country,
      website: input.website,
    })

    filas.push(
      ...respuesta.rows.map((fila) => ({
        rowIdx: fila.rowIdx,
        row: fila.row,
      })),
    )
    continuar = respuesta.hasNextPage && respuesta.rows.length > 0
    pagina += 1
  }

  return filas.slice(0, input.limite)
}

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")

  const body = await readBody<CuerpoExportacionPlacesOs>(event)
  const country = normalizarPaisPlacesOs(body.country || null)
  const website = normalizarWebsitePlacesOs(body.website || null)
  const limite = normalizarLimitePlacesOs(
    body.limite || null,
    100,
    maximoFilasExportacionPlacesOs,
  )

  if (!/^[A-Z]{2}$/.test(country)) {
    throw createError({
      statusCode: 400,
      message: "Selecciona un pais valido para exportar Places OS.",
    })
  }

  const tableName = construirNombreTablaPlacesOs({ country, website })

  try {
    await asegurarTablaDatosPlacesOs(tableName)
    const filas = await obtenerFilasExportables({ country, website, limite })
    const resultado = await exportarFilasPlacesOs({
      nombreTabla: tableName,
      filas,
    })

    await actualizarTablaMaestraPlacesOs({
      nombreTabla: tableName,
      country,
      website,
      filasExportadas: filas.length,
    })

    return {
      ok: true,
      data: {
        tableName,
        country,
        website,
        requestedLimit: limite,
        fetchedRows: filas.length,
        insertedRows: resultado.insertadas,
        updatedRows: resultado.actualizadas,
        skippedRows: resultado.omitidas,
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 502,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo exportar Places OS hacia Neon.",
    })
  }
})
