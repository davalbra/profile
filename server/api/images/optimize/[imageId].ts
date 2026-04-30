import * as route from "@/server/legacy-api/images/optimize/[imageId]/route";
import { dispatchLegacyRoute, getRequiredRouteParam } from "@/server/utils/legacy-route";

export default defineEventHandler((event) =>
  dispatchLegacyRoute(event, route, {
    imageId: getRequiredRouteParam(event, "imageId"),
  }),
);
