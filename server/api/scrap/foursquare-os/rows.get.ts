import { fetchFoursquareOsPreviewRows } from "@/lib/foursquare/os-places"
import { createError, getQuery, setHeader } from "h3"

type QueryValue =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | null

interface PlacesOsRowsQuery {
  page?: QueryValue
  pageSize?: QueryValue
  q?: QueryValue
  country?: QueryValue
  timezone?: QueryValue
  website?: QueryValue
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

  const query = getQuery<PlacesOsRowsQuery>(event)

  try {
    const rows = await fetchFoursquareOsPreviewRows({
      page: parseQueryNumber(query.page || null),
      pageSize: parseQueryNumber(query.pageSize || null),
      q: parseQueryText(query.q || null),
      country: parseQueryText(query.country || null),
      timezone: parseQueryText(query.timezone || null),
      website: parseQueryText(query.website || null),
    })

    return {
      ok: true,
      data: rows,
    }
  } catch (error) {
    throw createError({
      statusCode:
        error instanceof Error && error.message.includes("429") ? 429 : 502,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron consultar las filas de Places OS.",
    })
  }
})
