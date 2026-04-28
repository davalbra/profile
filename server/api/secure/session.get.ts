import type { RolUsuario } from "@prisma/client";
import { setHeader } from "h3";
import {
  AccessDeniedError,
  InsufficientRoleError,
  requireFirebaseSession,
} from "@/server/utils/firebase-session";

const VALID_ROLES = new Set<RolUsuario>(["LECTOR", "COLABORADOR", "ADMIN"]);

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const role = typeof query.rolMinimo === "string" && VALID_ROLES.has(query.rolMinimo as RolUsuario)
      ? (query.rolMinimo as RolUsuario)
      : undefined;

    const session = await requireFirebaseSession(event, { rolMinimo: role });
    setHeader(event, "Cache-Control", "no-store");

    return {
      ok: true,
      sesion: session,
    };
  } catch (error) {
    if (error instanceof AccessDeniedError || error instanceof InsufficientRoleError) {
      throw createError({
        statusCode: 403,
        statusMessage: error.message,
      });
    }

    throw createError({
      statusCode: 401,
      statusMessage: error instanceof Error ? error.message : "Sesión inválida.",
    });
  }
});
