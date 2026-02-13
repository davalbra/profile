import { NextResponse } from "next/server";
import { requerirSesionFirebase } from "@/lib/auth/firebase-session";

export async function GET(request: Request) {
  try {
    const sesion = await requerirSesionFirebase(request);

    return NextResponse.json(
      {
        ok: true,
        sesion,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sesión inválida.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
