import { prisma } from "@/lib/prisma";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

type SesionFirebaseValidada = {
  uid: string;
  email: string;
  nombre: string;
  avatarUrl: string;
};

export class AccesoDenegadoError extends Error {
  constructor(message = "Tu correo no está autorizado para usar esta aplicación.") {
    super(message);
    this.name = "AccesoDenegadoError";
  }
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [schema, token] = authorizationHeader.split(" ");
  if (schema?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function getCookieToken(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name === cookieName) {
      return parts.join("=") || null;
    }
  }

  return null;
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function validarCorreoAutorizado(email: string, emailVerificado: boolean): Promise<void> {
  const config = await prisma.configuracionAcceso.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: {
      requerirListaCorreos: true,
      permitirCorreosNoVerificados: true,
    },
  });

  if (!emailVerificado && !config.permitirCorreosNoVerificados) {
    throw new AccesoDenegadoError("Tu correo de Firebase no está verificado.");
  }

  if (!config.requerirListaCorreos) {
    return;
  }

  const emailNormalizado = normalizarEmail(email);
  const autorizado = await prisma.correoAutorizado.findFirst({
    where: {
      email: emailNormalizado,
      activo: true,
    },
    select: {
      id: true,
    },
  });

  if (!autorizado) {
    throw new AccesoDenegadoError();
  }
}

export async function registrarSesionFirebase(idToken: string, request: Request) {
  const auth = getFirebaseAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);

  const email = normalizarEmail(decoded.email || `${decoded.uid}@firebase.local`);
  const emailVerificado = decoded.email_verified ?? false;
  const nombre = decoded.name || "Usuario";
  const avatarUrl = decoded.picture || null;
  const expiraEn = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600_000);

  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent");

  await validarCorreoAutorizado(email, emailVerificado);

  await prisma.usuario.upsert({
    where: { id: decoded.uid },
    update: {
      email,
      nombre,
      avatarUrl,
    },
    create: {
      id: decoded.uid,
      email,
      nombre,
      avatarUrl,
    },
  });

  await prisma.sesionFirebase.upsert({
    where: { token: idToken },
    update: {
      usuarioId: decoded.uid,
      expiraEn,
      revocadoEn: null,
      ip,
      userAgent,
      proveedor: decoded.firebase?.sign_in_provider || "google.com",
    },
    create: {
      usuarioId: decoded.uid,
      token: idToken,
      expiraEn,
      ip,
      userAgent,
      proveedor: decoded.firebase?.sign_in_provider || "google.com",
    },
  });

  return {
    uid: decoded.uid,
    email,
    nombre,
    avatarUrl,
    expiraEn,
  };
}

export async function revocarSesionFirebase(idToken: string): Promise<void> {
  await prisma.sesionFirebase.updateMany({
    where: {
      token: idToken,
      revocadoEn: null,
    },
    data: {
      revocadoEn: new Date(),
    },
  });
}

export async function validarSesionFirebase(idToken: string): Promise<SesionFirebaseValidada> {
  const auth = getFirebaseAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const email = normalizarEmail(decoded.email || `${decoded.uid}@firebase.local`);
  const emailVerificado = decoded.email_verified ?? false;

  try {
    await validarCorreoAutorizado(email, emailVerificado);
  } catch (error) {
    await revocarSesionFirebase(idToken);
    throw error;
  }

  const sesion = await prisma.sesionFirebase.findFirst({
    where: {
      token: idToken,
      usuarioId: decoded.uid,
      revocadoEn: null,
      expiraEn: { gt: new Date() },
    },
    include: {
      usuario: true,
    },
  });

  if (!sesion) {
    throw new Error("La sesión no está registrada o ya expiró.");
  }

  return {
    uid: decoded.uid,
    email,
    nombre: sesion.usuario.nombre || "Usuario",
    avatarUrl: sesion.usuario.avatarUrl || "",
  };
}

export async function requerirSesionFirebase(request: Request): Promise<SesionFirebaseValidada> {
  const token =
    getBearerToken(request.headers.get("authorization")) ||
    getCookieToken(request.headers.get("cookie"), "firebase_id_token");

  if (!token) {
    throw new Error("Falta el token de sesión.");
  }

  return validarSesionFirebase(token);
}
