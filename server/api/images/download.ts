import * as route from "@/server/handlers/images/download";
import { dispatchWebRoute } from "@/server/utils/web-route";

export default defineEventHandler((event) => dispatchWebRoute(event, route));
