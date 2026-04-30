import { getMethod, getRouterParam, toWebRequest } from "h3";
import type { H3Event } from "h3";

type WebRouteParams = Record<string, string> & { imageId: string };
type WebRouteHandler = (request: Request, context: { params: Promise<WebRouteParams> }) => Promise<Response>;

type WebRoute = Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", WebRouteHandler>>;

export async function dispatchWebRoute(
  event: H3Event,
  route: WebRoute,
  params: Record<string, string> = {},
) {
  const method = getMethod(event).toUpperCase() as keyof WebRoute;
  const handler = route[method];

  if (!handler) {
    throw createError({
      statusCode: 405,
      statusMessage: `Método ${method} no permitido.`,
    });
  }

  return await handler(toWebRequest(event), {
    params: Promise.resolve(params as WebRouteParams),
  });
}

export function getRequiredRouteParam(event: H3Event, name: string) {
  const value = getRouterParam(event, name);

  if (!value) {
    throw createError({
      statusCode: 400,
      statusMessage: `Falta parámetro ${name}.`,
    });
  }

  return value;
}
