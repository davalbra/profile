import { readBody, setCookie, setHeader } from "h3";
import { AccessDeniedError, registerFirebaseSession } from "@/server/utils/firebase-session";

const SESSION_MAX_AGE_SECONDS = 3 * 24 * 60 * 60;

export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody<{ idToken?: string }>(event);

    if (!payload.idToken) {
      throw createError({
        statusCode: 400,
        statusMessage: "Falta idToken.",
      });
    }

    const session = await registerFirebaseSession(payload.idToken, event);
    setHeader(event, "Cache-Control", "no-store");

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
    };

    setCookie(event, "firebase_session", session.sessionCookie, cookieOptions);
    setCookie(event, "firebase_id_token", session.sessionCookie, cookieOptions);

    return {
      ok: true,
      usuario: {
        uid: session.uid,
        email: session.email,
        nombre: session.nombre,
        avatarUrl: session.avatarUrl,
        rol: session.rol,
      },
    };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      throw createError({
        statusCode: 403,
        statusMessage: error.message,
      });
    }

    if (typeof error === "object" && error && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 401,
      statusMessage:
        error instanceof Error ? error.message : "No se pudo registrar la sesión.",
    });
  }
});
