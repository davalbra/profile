import { deleteCookie, getCookie, getHeader, setHeader } from "h3";
import { revokeFirebaseSession } from "@/server/utils/firebase-session";

const getBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

export default defineEventHandler(async (event) => {
  try {
    const token =
      getBearerToken(getHeader(event, "authorization") ?? null) ||
      getCookie(event, "firebase_session") ||
      getCookie(event, "firebase_id_token");

    if (token) {
      await revokeFirebaseSession(token);
    }

    deleteCookie(event, "firebase_session", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    deleteCookie(event, "firebase_id_token", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    setHeader(event, "Cache-Control", "no-store");
    return { ok: true };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
    });
  }
});
