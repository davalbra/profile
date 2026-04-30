import * as route from "@/server/handlers/images/gallery";
import { dispatchWebRoute } from "@/server/utils/web-route";

export default defineEventHandler((event) => dispatchWebRoute(event, route));
