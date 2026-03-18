import { NextResponse } from "next/server";
import {
  AccesoDenegadoError,
  requerirSesionFirebase,
  RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import { getTradingHistory } from "@/lib/trading/history";

export const runtime = "nodejs";

function parseAuthError(error: unknown) {
  if (error instanceof AccesoDenegadoError || error instanceof RolInsuficienteError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  const message = error instanceof Error ? error.message : "No autorizado.";
  if (/token|sesi[oó]n|autoriz/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  try {
    await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });

    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = Number(limitParam || "20");
    const data = await getTradingHistory(limit);

    return NextResponse.json(
      {
        ok: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const authResponse = parseAuthError(error);
    if (authResponse) {
      return authResponse;
    }

    const message = error instanceof Error ? error.message : "No se pudo obtener el historial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
