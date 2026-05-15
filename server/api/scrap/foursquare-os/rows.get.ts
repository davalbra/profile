import {fetchFoursquareOsPreviewRows} from "@/lib/foursquare/os-places"
import {createError, getQuery, setHeader} from "h3"

function parseQueryNumber(value: unknown) {
    if (Array.isArray(value)) {
        return Number(value[0])
    }

    return Number(value)
}

export default defineEventHandler(async (event) => {
    setHeader(event, "Cache-Control", "no-store")

    const query = getQuery(event)

    try {
        const rows = await fetchFoursquareOsPreviewRows({
            page: parseQueryNumber(query.page),
            pageSize: parseQueryNumber(query.pageSize),
            q: typeof query.q === "string" ? query.q : "",
            country: typeof query.country === "string" ? query.country : "",
            website: typeof query.website === "string" ? query.website : "",
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
