import { NextResponse } from "next/server";
import {
  AccesoDenegadoError,
  requerirSesionFirebase,
  RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import { getSchedulerConfig, updateSchedulerConfig, type SchedulerConfigPayload } from "@/lib/trading/history";

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
    const config = await getSchedulerConfig();
    return NextResponse.json(
      {
        ok: true,
        data: config,
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
    const message = error instanceof Error ? error.message : "No se pudo obtener la configuración del scheduler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });
    const payload = (await request.json().catch(() => ({}))) as SchedulerConfigPayload;
    const config = await updateSchedulerConfig(payload);
    return NextResponse.json(
      {
        ok: true,
        data: config,
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
    const message = error instanceof Error ? error.message : "No se pudo actualizar la configuración del scheduler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
