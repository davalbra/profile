import { getCookie, getHeader, getRequestIP, type H3Event } from "h3";
import type { RolUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

type ServerSession = {
  uid: string;
  email: string;
  nombre: string;
  avatarUrl: string;
  rol: RolUsuario;
};

type RequireSessionOptions = {
  rolMinimo?: RolUsuario;
};

const SESSION_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

const ROLE_ORDER: Record<RolUsuario, number> = {
  LECTOR: 1,
  COLABORADOR: 2,
  ADMIN: 3,
};

export class AccessDeniedError extends Error {
  constructor(message = "Tu correo no está autorizado para usar esta aplicación.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export class InsufficientRoleError extends Error {
  constructor(currentRole: RolUsuario, requiredRole: RolUsuario) {
    super(`Se requiere rol ${requiredRole}. Tu rol actual es ${currentRole}.`);
    this.name = "InsufficientRoleError";
  }
}

const hasRequiredRole = (currentRole: RolUsuario, requiredRole: RolUsuario) =>
  ROLE_ORDER[currentRole] >= ROLE_ORDER[requiredRole];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

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

async function validateAuthorizedEmail(email: string, emailVerified: boolean) {
  const config = await prisma.configuracionAcceso.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: {
      requerirListaCorreos: true,
      permitirCorreosNoVerificados: true,
    },
  });

  if (!emailVerified && !config.permitirCorreosNoVerificados) {
    throw new AccessDeniedError("Tu correo de Firebase no está verificado.");
  }

  if (!config.requerirListaCorreos) {
    return;
  }

  const authorized = await prisma.correoAutorizado.findFirst({
    where: {
      email: normalizeEmail(email),
      activo: true,
    },
    select: { id: true },
  });

  if (!authorized) {
    throw new AccessDeniedError();
  }
}

export async function registerFirebaseSession(idToken: string, event: H3Event) {
  const auth = getFirebaseAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  const email = normalizeEmail(decoded.email || `${decoded.uid}@firebase.local`);
  const emailVerified = decoded.email_verified ?? false;
  const name = decoded.name || "Usuario";
  const avatarUrl = decoded.picture || "";
  const ip = getRequestIP(event, { xForwardedFor: true }) || null;
  const userAgent = getHeader(event, "user-agent") || null;

  await validateAuthorizedEmail(email, emailVerified);

  await prisma.usuario.upsert({
    where: { id: decoded.uid },
    update: {
      email,
      nombre: name,
      avatarUrl,
    },
    create: {
      id: decoded.uid,
      email,
      nombre: name,
      avatarUrl,
    },
  });

  await prisma.sesionFirebase.upsert({
    where: { token: sessionCookie },
    update: {
      usuarioId: decoded.uid,
      expiraEn: expiresAt,
      revocadoEn: null,
      ip,
      userAgent,
      proveedor: decoded.firebase?.sign_in_provider || "google.com",
    },
    create: {
      usuarioId: decoded.uid,
      token: sessionCookie,
      expiraEn: expiresAt,
      ip,
      userAgent,
      proveedor: decoded.firebase?.sign_in_provider || "google.com",
    },
  });

  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: decoded.uid },
    select: {
      rol: true,
    },
  });

  return {
    uid: decoded.uid,
    email,
    nombre: name,
    avatarUrl,
    rol: usuario.rol,
    expiraEn: expiresAt,
    sessionCookie,
  };
}

export async function revokeFirebaseSession(token: string) {
  const auth = getFirebaseAdminAuth();
  let uid: string | null = null;

  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    try {
      uid = (await auth.verifySessionCookie(token, false)).uid;
    } catch {
      uid = null;
    }
  }

  await prisma.sesionFirebase.updateMany({
    where: {
      revocadoEn: null,
      OR: [{ token }, ...(uid ? [{ usuarioId: uid }] : [])],
    },
    data: {
      revocadoEn: new Date(),
    },
  });

  if (uid) {
    try {
      await auth.revokeRefreshTokens(uid);
    } catch {
      // Evitamos bloquear el logout si la revocación remota falla.
    }
  }
}

export async function validateFirebaseSession(token: string): Promise<ServerSession> {
  const auth = getFirebaseAdminAuth();
  let decoded: { uid: string; email?: string; email_verified?: boolean };

  try {
    decoded = await auth.verifySessionCookie(token, false);
  } catch {
    decoded = await auth.verifyIdToken(token);
  }

  const email = normalizeEmail(decoded.email || `${decoded.uid}@firebase.local`);
  const emailVerified = decoded.email_verified ?? false;

  try {
    await validateAuthorizedEmail(email, emailVerified);
  } catch (error) {
    await revokeFirebaseSession(token);
    throw error;
  }

  const session = await prisma.sesionFirebase.findFirst({
    where: {
      token,
      usuarioId: decoded.uid,
      revocadoEn: null,
      expiraEn: { gt: new Date() },
    },
    include: {
      usuario: true,
    },
  });

  if (!session) {
    throw new Error("La sesión no está registrada o ya expiró.");
  }

  return {
    uid: decoded.uid,
    email,
    nombre: session.usuario.nombre || "Usuario",
    avatarUrl: session.usuario.avatarUrl || "",
    rol: session.usuario.rol,
  };
}

export async function requireFirebaseSession(
  event: H3Event,
  options: RequireSessionOptions = {},
): Promise<ServerSession> {
  const token =
    getBearerToken(getHeader(event, "authorization") ?? null) ||
    getCookie(event, "firebase_session") ||
    getCookie(event, "firebase_id_token");

  if (!token) {
    throw new Error("Falta el token de sesión.");
  }

  const session = await validateFirebaseSession(token);

  if (options.rolMinimo && !hasRequiredRole(session.rol, options.rolMinimo)) {
    throw new InsufficientRoleError(session.rol, options.rolMinimo);
  }

  return session;
}
