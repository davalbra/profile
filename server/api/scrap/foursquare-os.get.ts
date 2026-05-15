import {
    checkFoursquareOsToken,
    fetchFoursquareOsDatasets,
    fetchLatestFoursquareOsRelease,
} from "@/lib/foursquare/os-places"
import {setHeader} from "h3"

export default defineEventHandler(async (event) => {
    setHeader(event, "Cache-Control", "no-store")

    try {
        const [datasets, release, token] = await Promise.all([
            fetchFoursquareOsDatasets(),
            fetchLatestFoursquareOsRelease(),
            checkFoursquareOsToken(),
        ])

        return {
            ok: true,
            data: {
                datasets,
                release,
                token,
            },
        }
    } catch (error) {
        throw createError({
            statusCode: 502,
            statusMessage:
                error instanceof Error
                    ? error.message
                    : "No se pudo consultar Foursquare OS Places.",
        })
    }
})
