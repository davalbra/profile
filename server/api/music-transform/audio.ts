import * as route from "@/server/handlers/music-transform/audio"
import { dispatchWebRoute } from "@/server/utils/web-route"

export default defineEventHandler((event) => dispatchWebRoute(event, route, {}))
