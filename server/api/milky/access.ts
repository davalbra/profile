import {
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

const nota = {
  parrafos: [
    "Feliz cumpleaños. Ojalá hoy te sobren las razones para sonreír, los abrazos duren un poquito más y te guardes la mejor parte del pastel.",
    "Deseo que este año te traiga planes que te ilusionen, días tranquilos cuando los necesites y un montón de momentos que quieras volver a vivir.",
  ],
  despedida: "Con mucho cariño,",
  firma: "David",
}

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")

  const metodo = getMethod(event)
  if (metodo === "GET") {
    return tieneAccesoMilky(event)
      ? { autorizado: true, nota }
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

  const datos = await readBody<{ password?: unknown } | null>(event)
  if (!iniciarSesionMilky(event, datos?.password, configuracion)) {
    setResponseStatus(event, 401)
    return { autorizado: false }
  }

  return { autorizado: true, nota }
})
