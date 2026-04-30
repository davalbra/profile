import * as route from "@/server/handlers/images/optimize/[imageId]";
import { dispatchWebRoute, getRequiredRouteParam } from "@/server/utils/web-route";

export default defineEventHandler((event) =>
  dispatchWebRoute(event, route, {
    imageId: getRequiredRouteParam(event, "imageId"),
  }),
);
