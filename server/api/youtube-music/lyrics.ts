import * as route from "@/server/handlers/youtube-music/lyrics";
import { dispatchWebRoute } from "@/server/utils/web-route";

export default defineEventHandler((event) => dispatchWebRoute(event, route));
