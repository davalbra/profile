import { Readable } from "node:stream"
import {
  createError,
  defineEventHandler,
  getHeader,
  getMethod,
  getQuery,
  getRouterParam,
  send,
  sendStream,
  setHeader,
  setResponseStatus,
} from "h3"
import sharp from "sharp"
import { tieneAccesoMilky } from "@/server/utils/milky-access"

const girosFotos: Readonly<Record<string, number>> = {
  "20260224_214339.jpg": 90,
  "20260726_170146.jpg": 90,
  "20260224_231154.jpg": 270,
}

function* fragmentarVideo(contenido: Uint8Array) {
  const tamanoFragmento = 64 * 1024
  for (
    let inicio = 0;
    inicio < contenido.byteLength;
    inicio += tamanoFragmento
  ) {
    yield contenido.subarray(inicio, inicio + tamanoFragmento)
  }
}

function rangoBytes(cabecera: string, total: number) {
  const rango = /^bytes=(\d*)-(\d*)$/i.exec(cabecera.trim())
  if (!rango || total === 0) return null

  const [, desde, hasta] = rango
  if (desde === "") {
    const cantidad = Number(hasta)
    return cantidad > 0
      ? { inicio: Math.max(total - cantidad, 0), fin: total - 1 }
      : null
  }

  const inicio = Number(desde)
  const fin = hasta === "" ? total - 1 : Math.min(Number(hasta), total - 1)
  return inicio <= fin ? { inicio, fin } : null
}

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")
  if (!tieneAccesoMilky(event)) throw createError({ statusCode: 403 })

  const metodo = getMethod(event)
  if (metodo !== "GET" && metodo !== "HEAD") {
    setHeader(event, "Allow", "GET, HEAD")
    throw createError({ statusCode: 405 })
  }

  const tipo = getRouterParam(event, "tipo")
  const archivo = getRouterParam(event, "archivo") ?? ""
  const foto = tipo === "fotos" && /^[\w-]+\.jpg$/.test(archivo)
  const video = tipo === "videos" && /^[\w-]+\.mp4$/.test(archivo)
  const poster = tipo === "videos" && /^[\w-]+\.webp$/.test(archivo)
  if (!foto && !video && !poster) throw createError({ statusCode: 404 })

  const recursos = useStorage("assets:server")
  const original = await recursos.getItemRaw<Uint8Array>(
    `milky/${tipo}/${archivo}`,
  )
  if (!(original instanceof Uint8Array)) throw createError({ statusCode: 404 })

  let contenido = original
  let contenidoTipo = video ? "video/mp4" : poster ? "image/webp" : "image/jpeg"

  if (foto) {
    const ancho = getQuery(event).ancho
    const giro = girosFotos[archivo]
    if (giro || ancho === "420" || ancho === "960") {
      const imagen = sharp(original)
        .autoOrient()
        .rotate(giro ?? 0)
      if (ancho === "420" || ancho === "960") {
        imagen.resize({ width: Number(ancho), withoutEnlargement: true })
      }
      contenido = await imagen.webp().toBuffer()
      contenidoTipo = "image/webp"
    }
  }

  if (video) {
    setHeader(event, "Accept-Ranges", "bytes")
    const range = getHeader(event, "range")
    if (
      metodo === "GET" &&
      range !== undefined &&
      !getHeader(event, "if-range")
    ) {
      const total = contenido.byteLength
      const rango = rangoBytes(range, total)
      if (!rango) {
        setHeader(event, "Content-Range", `bytes */${total}`)
        setResponseStatus(event, 416)
        return send(event)
      }

      const { inicio, fin } = rango
      contenido = contenido.subarray(inicio, fin + 1)
      setResponseStatus(event, 206)
      setHeader(event, "Content-Range", `bytes ${inicio}-${fin}/${total}`)
    }
  }

  setHeader(event, "Content-Type", contenidoTipo)
  setHeader(event, "Content-Length", contenido.byteLength)
  if (metodo === "HEAD") return send(event)
  if (video) {
    return sendStream(
      event,
      Readable.from(fragmentarVideo(contenido), { objectMode: false }),
    )
  }
  return send(event, contenido)
})
