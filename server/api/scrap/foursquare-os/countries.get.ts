import { fetchFoursquareOsCountries } from "@/lib/foursquare/os-places"
import { createError, setHeader } from "h3"

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")

  try {
    const countries = await fetchFoursquareOsCountries()

    return {
      ok: true,
      data: {
        countries,
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 502,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron consultar los paises de Places OS.",
    })
  }
})
