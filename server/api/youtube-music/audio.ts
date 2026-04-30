import * as route from "@/server/legacy-api/youtube-music/audio/route";
import { dispatchLegacyRoute } from "@/server/utils/legacy-route";

export default defineEventHandler((event) => dispatchLegacyRoute(event, route));
