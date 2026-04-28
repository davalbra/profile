import * as route from "@/server/legacy-api/images/gallery/route";
import { dispatchLegacyRoute } from "@/server/utils/legacy-route";

export default defineEventHandler((event) => dispatchLegacyRoute(event, route));
