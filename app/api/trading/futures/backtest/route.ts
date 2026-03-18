import { NextResponse } from "next/server";
import {
  AccesoDenegadoError,
  requerirSesionFirebase,
  RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import { backtestFuturesStrategy, type FuturesBotOverrides } from "@/lib/trading/binance-futures";
import { saveBacktestHistory } from "@/lib/trading/history";
import { TradingExecutionSource } from "@prisma/client";

export const runtime = "nodejs";

type RequestPayload = Partial<{
  candlesLimit: number;
  symbol: string;
  interval: string;
  leverage: number;
  riskPerTrade: number;
  fastEma: number;
  slowEma: number;
  rsiPeriod: number;
  atrPeriod: number;
  stopAtrMult: number;
  tpAtrMult: number;
  testnet: boolean;
  marginType: "ISOLATED" | "CROSSED";
  paperBalance: number;
}>;

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (["true", "1", "yes", "on"].includes(lowered)) return true;
    if (["false", "0", "no", "off"].includes(lowered)) return false;
  }
  return undefined;
}

function parseOverrides(payload: RequestPayload): FuturesBotOverrides {
  const marginType =
    String(payload.marginType || "")
      .toUpperCase()
      .trim() === "CROSSED"
      ? "CROSSED"
      : payload.marginType
        ? "ISOLATED"
        : undefined;

  return {
    symbol: payload.symbol?.toUpperCase().trim() || undefined,
    interval: payload.interval?.trim() || undefined,
    leverage: parseNumber(payload.leverage),
    riskPerTrade: parseNumber(payload.riskPerTrade),
    fastEma: parseNumber(payload.fastEma),
    slowEma: parseNumber(payload.slowEma),
    rsiPeriod: parseNumber(payload.rsiPeriod),
    atrPeriod: parseNumber(payload.atrPeriod),
    stopAtrMult: parseNumber(payload.stopAtrMult),
    tpAtrMult: parseNumber(payload.tpAtrMult),
    testnet: parseBoolean(payload.testnet),
    marginType,
    paperBalance: parseNumber(payload.paperBalance),
  };
}

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

export async function POST(request: Request) {
  try {
    const sesion = await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });

    const rawPayload = (await request.json().catch(() => ({}))) as RequestPayload;
    const overrides = parseOverrides(rawPayload || {});
    const candlesLimit = parseNumber(rawPayload?.candlesLimit);

    const result = await backtestFuturesStrategy({
      overrides,
      candlesLimit,
    });
    await saveBacktestHistory({
      result,
      source: TradingExecutionSource.MANUAL,
      userId: sesion.uid,
    });

    return NextResponse.json(
      {
        ok: true,
        data: result,
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

    const message = error instanceof Error ? error.message : "No se pudo ejecutar el backtesting.";
    const status = /binance|config|inv[aá]lid|velas|candle|backtest/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
