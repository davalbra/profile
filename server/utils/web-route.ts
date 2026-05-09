import type { H3Event } from "h3"
import { getMethod, getRouterParam, toWebRequest } from "h3"

type WebRouteParams = Record<string, string>
type WebRouteHandler<ParametrosRuta extends WebRouteParams> = (
  request: Request,
  context: { params: Promise<ParametrosRuta> },
) => Promise<Response>

type WebRoute<ParametrosRuta extends WebRouteParams> = Partial<
  Record<
    "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    WebRouteHandler<ParametrosRuta>
  >
>

function esMetodoRuta(
  metodo: string,
): metodo is keyof WebRoute<WebRouteParams> {
  return (
    metodo === "GET" ||
    metodo === "POST" ||
    metodo === "PUT" ||
    metodo === "PATCH" ||
    metodo === "DELETE"
  )
}

export async function dispatchWebRoute<ParametrosRuta extends WebRouteParams>(
  event: H3Event,
  route: WebRoute<ParametrosRuta>,
  params: ParametrosRuta,
) {
  const metodo = getMethod(event).toUpperCase()

  if (!esMetodoRuta(metodo)) {
    throw createError({
      statusCode: 405,
      statusMessage: `Método ${metodo} no permitido.`,
    })
  }

  const handler = route[metodo]

  if (!handler) {
    throw createError({
      statusCode: 405,
      statusMessage: `Método ${metodo} no permitido.`,
    })
  }

  return await handler(toWebRequest(event), {
    params: Promise.resolve(params),
  })
}

export function getRequiredRouteParam(event: H3Event, name: string) {
  const value = getRouterParam(event, name)

  if (!value) {
    throw createError({
      statusCode: 400,
      statusMessage: `Falta parámetro ${name}.`,
    })
  }

  return value
}
