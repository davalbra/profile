import { RolUsuario } from "@prisma/client"
import { setHeader } from "h3"
import {
  AccessDeniedError,
  InsufficientRoleError,
  requireFirebaseSession,
} from "@/server/utils/firebase-session"

function parsearRolMinimo(valor: string): RolUsuario | null {
  if (
    valor === RolUsuario.LECTOR ||
    valor === RolUsuario.COLABORADOR ||
    valor === RolUsuario.ADMIN
  ) {
    return valor
  }

  return null
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const rolMinimo =
      typeof query.rolMinimo === "string"
        ? parsearRolMinimo(query.rolMinimo)
        : null
    const opciones = rolMinimo ? { rolMinimo } : {}

    const session = await requireFirebaseSession(event, opciones)
    setHeader(event, "Cache-Control", "no-store")

    return {
      ok: true,
      sesion: session,
    }
  } catch (error) {
    if (
      error instanceof AccessDeniedError ||
      error instanceof InsufficientRoleError
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: error.message,
      })
    }

    throw createError({
      statusCode: 401,
      statusMessage:
        error instanceof Error ? error.message : "Sesión inválida.",
    })
  }
})
