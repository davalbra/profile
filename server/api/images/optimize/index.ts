import * as route from "@/server/legacy-api/images/optimize/route";
import { dispatchLegacyRoute } from "@/server/utils/legacy-route";

export default defineEventHandler((event) => dispatchLegacyRoute(event, route));
