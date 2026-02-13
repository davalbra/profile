import { NextResponse } from "next/server";
import {
  AccesoDenegadoError,
  registrarSesionFirebase,
  revocarSesionFirebase,
} from "@/lib/auth/firebase-session";

function extraerBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [schema, token] = authorizationHeader.split(" ");
  if (schema?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { idToken?: string };
    const idToken = payload.idToken;

    if (!idToken) {
      return NextResponse.json({ error: "Falta idToken." }, { status: 400 });
    }

    const sesion = await registrarSesionFirebase(idToken, request);

    return NextResponse.json(
      {
        ok: true,
        usuario: {
          uid: sesion.uid,
          email: sesion.email,
          nombre: sesion.nombre,
          avatarUrl: sesion.avatarUrl,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `firebase_id_token=${idToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${
            process.env.NODE_ENV === "production" ? "; Secure" : ""
          }`,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la sesión.";
    const status = error instanceof AccesoDenegadoError ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const idToken = extraerBearerToken(request.headers.get("authorization"));
    if (!idToken) {
      return NextResponse.json({ error: "Falta token Bearer para cerrar sesión." }, { status: 400 });
    }

    await revocarSesionFirebase(idToken);

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `firebase_id_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
            process.env.NODE_ENV === "production" ? "; Secure" : ""
          }`,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cerrar la sesión.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
