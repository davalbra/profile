import {
  createError,
  defineEventHandler,
  getMethod,
  readBody,
  setHeader,
  setResponseStatus,
} from "h3"
import {
  configuracionMilky,
  iniciarSesionMilky,
  tieneAccesoMilky,
} from "../../utils/milky-access"

function leerNota() {
  const texto = process.env.MILKY_LETTER?.trim()
  if (!texto) throw createError({ statusCode: 503 })

  return { parrafos: texto.split(/\r?\n(?:[ \t]*\r?\n)+/) }
}

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")

  const metodo = getMethod(event)
  if (metodo === "GET") {
    return tieneAccesoMilky(event)
      ? { autorizado: true, nota: leerNota() }
      : { autorizado: false }
  }

  if (metodo !== "POST") {
    setHeader(event, "Allow", "GET, POST")
    setResponseStatus(event, 405)
    return { autorizado: false }
  }

  const configuracion = configuracionMilky()
  if (!configuracion) {
    setResponseStatus(event, 503)
    return { autorizado: false }
  }

  const nota = leerNota()
  const datos = await readBody<{ password?: unknown } | null>(event)
  if (!iniciarSesionMilky(event, datos?.password, configuracion)) {
    setResponseStatus(event, 401)
    return { autorizado: false }
  }

  return { autorizado: true, nota }
})
