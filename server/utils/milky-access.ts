import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { getCookie, setCookie, type H3Event } from "h3"

const COOKIE_MILKY = "milky_access"
const DURACION_SESION_MS = 12 * 60 * 60 * 1000

type ConfiguracionMilky = {
  password: string
  secret: string
}

export function configuracionMilky(): ConfiguracionMilky | null {
  const password = process.env.MILKY_PASSWORD
  const secret = process.env.MILKY_SESSION_SECRET

  return password && secret ? { password, secret } : null
}

function firmar(expiracion: string, configuracion: ConfiguracionMilky) {
  return createHmac("sha256", configuracion.secret)
    .update(`milky-access:${expiracion}:`)
    .update(configuracion.password)
    .digest()
}

function resumir(password: string) {
  return createHash("sha256").update(password).digest()
}

export function tieneAccesoMilky(event: H3Event): boolean {
  const configuracion = configuracionMilky()
  const cookie = getCookie(event, COOKIE_MILKY)
  if (!configuracion || !cookie) return false

  const partes = /^(\d{13})\.([a-f0-9]{64})$/.exec(cookie)
  if (!partes) return false

  const [, expiracion, firma] = partes
  if (Number(expiracion) <= Date.now()) return false

  return timingSafeEqual(
    Buffer.from(firma, "hex"),
    firmar(expiracion, configuracion),
  )
}

export function iniciarSesionMilky(
  event: H3Event,
  password: unknown,
  configuracion: ConfiguracionMilky,
): boolean {
  if (
    typeof password !== "string" ||
    !timingSafeEqual(resumir(password), resumir(configuracion.password))
  ) {
    return false
  }

  const expiracion = String(Date.now() + DURACION_SESION_MS)
  const firma = firmar(expiracion, configuracion).toString("hex")
  setCookie(event, COOKIE_MILKY, `${expiracion}.${firma}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return true
}
