import { getMethod, getRouterParam, toWebRequest } from "h3";
import type { H3Event } from "h3";

type LegacyRouteParams = Record<string, string> & { imageId: string };
type LegacyHandler = (request: Request, context: { params: Promise<LegacyRouteParams> }) => Promise<Response>;

type LegacyRoute = Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", LegacyHandler>>;

export async function dispatchLegacyRoute(
  event: H3Event,
  route: LegacyRoute,
  params: Record<string, string> = {},
) {
  const method = getMethod(event).toUpperCase() as keyof LegacyRoute;
  const handler = route[method];

  if (!handler) {
    throw createError({
      statusCode: 405,
      statusMessage: `Método ${method} no permitido.`,
    });
  }

  return await handler(toWebRequest(event), {
    params: Promise.resolve(params as LegacyRouteParams),
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
