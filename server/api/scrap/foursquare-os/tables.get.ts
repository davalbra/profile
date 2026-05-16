import {
  listarTablasPlacesOs,
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

interface PlacesOsTablesQuery {
  country?: QueryValue
  website?: QueryValue
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

  const query = getQuery<PlacesOsTablesQuery>(event)
  const website = parseQueryText(query.website || null)

  try {
    const tables = await listarTablasPlacesOs({
      country: normalizarPaisPlacesOs(parseQueryText(query.country || null)),
      website: website ? normalizarWebsitePlacesOs(website) : null,
    })

    return {
      ok: true,
      data: {
        tables,
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 502,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron consultar las tablas guardadas de Places OS.",
    })
  }
})
