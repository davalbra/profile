import {
  consultarPuntosMapaPlacesOs,
  normalizarLimitePlacesOs,
  normalizarPaisPlacesOs,
  normalizarWebsitePlacesOs,
} from "@/server/utils/places-os-neon"
import { createError, getQuery, setHeader } from "h3"

type QueryValue =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | null

interface PlacesOsMapQuery {
  tableName?: QueryValue
  country?: QueryValue
  website?: QueryValue
  limite?: QueryValue
  q?: QueryValue
}

function parseQueryNumber(value: QueryValue) {
  if (Array.isArray(value)) {
    return Number(value[0])
  }

  return Number(value)
}

function parseQueryText(value: QueryValue): string {
  if (Array.isArray(value)) {
    return parseQueryText(value[0] || null)
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return ""
}

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")

  const query = getQuery<PlacesOsMapQuery>(event)
  const country = normalizarPaisPlacesOs(parseQueryText(query.country || null))
  const website = normalizarWebsitePlacesOs(
    parseQueryText(query.website || null),
  )
  const limite = normalizarLimitePlacesOs(
    parseQueryNumber(query.limite || null),
    250,
    1000,
  )

  try {
    const resultado = await consultarPuntosMapaPlacesOs({
      nombreTabla: parseQueryText(query.tableName || null),
      country,
      website,
      limite,
      q: parseQueryText(query.q || null).trim(),
    })

    return {
      ok: true,
      data: {
        table: resultado.table,
        points: resultado.points,
        totalPoints: resultado.points.length,
        filters: {
          country,
          website,
          limite,
          q: parseQueryText(query.q || null).trim(),
        },
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 502,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron consultar los puntos guardados de Places OS.",
    })
  }
})
