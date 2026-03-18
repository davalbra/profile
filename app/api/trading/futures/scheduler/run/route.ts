import { NextResponse } from "next/server";
import { TradingExecutionSource, TradingExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFuturesBotConfig, runFuturesBot } from "@/lib/trading/binance-futures";
import {
  getSchedulerConfig,
  saveRunHistory,
  saveRunHistoryError,
  schedulerConfigToOverrides,
} from "@/lib/trading/history";
import { tradingConfig } from "@/lib/trading/config";

export const runtime = "nodejs";

function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const [schema, token] = authorization.split(" ");
  if (schema?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function isAuthorizedSchedulerRequest(request: Request): boolean {
  const configuredToken = process.env.TRADING_SCHEDULER_TOKEN || process.env.CRON_SECRET;
  const providedToken =
    extractBearerToken(request.headers.get("authorization")) || request.headers.get("x-trading-scheduler-token");

  if (!configuredToken) {
    return false;
  }

  return providedToken === configuredToken;
}

function toMs(minutes: number): number {
  return Math.max(1, minutes) * 60 * 1000;
}

export async function POST(request: Request) {
  if (!isAuthorizedSchedulerRequest(request)) {
    return NextResponse.json({ error: "No autorizado para ejecutar scheduler." }, { status: 401 });
  }

  const scheduler = await getSchedulerConfig();
  const now = new Date();

  await prisma.tradingFuturesSchedulerConfig.update({
    where: { id: scheduler.id },
    data: {
      ultimoIntentoEn: now,
    },
  });

  if (!scheduler.enabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Scheduler deshabilitado.",
      data: scheduler,
    });
  }

  const intervalMs = toMs(scheduler.intervalMinutes);
  if (scheduler.ultimaEjecucionEn && now.getTime() - scheduler.ultimaEjecucionEn.getTime() < intervalMs) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Aún no se cumple el intervalo (${scheduler.intervalMinutes} min).`,
      data: scheduler,
    });
  }

  try {
    const overrides = schedulerConfigToOverrides(scheduler);
    getFuturesBotConfig(overrides);
    const result = await runFuturesBot({ overrides });
    await saveRunHistory({
      result,
      source: TradingExecutionSource.CRON,
      userId: null,
    });

    const updatedScheduler = await prisma.tradingFuturesSchedulerConfig.update({
      where: { id: scheduler.id },
      data: {
        ultimaEjecucionEn: now,
        ultimaDecision: result.signal.decision,
        ultimoEstado: TradingExecutionStatus.SUCCESS,
        ultimoError: null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        skipped: false,
        data: {
          result,
          scheduler: updatedScheduler,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido ejecutando scheduler.";

    await saveRunHistoryError({
      source: TradingExecutionSource.CRON,
      userId: null,
      symbol: (scheduler.symbol || tradingConfig.binance.symbol || "BTCUSDT").toUpperCase(),
      interval: scheduler.interval || tradingConfig.binance.interval || "15m",
      network: scheduler.testnet ? "TESTNET" : "MAINNET",
      dryRun: scheduler.runInDryMode,
      leverage: scheduler.leverage ?? Math.trunc(tradingConfig.binance.leverage || 5),
      marginType: scheduler.marginType === "CROSSED" ? "CROSSED" : "ISOLATED",
      error: message,
    });

    const updatedScheduler = await prisma.tradingFuturesSchedulerConfig.update({
      where: { id: scheduler.id },
      data: {
        ultimoEstado: TradingExecutionStatus.FAILED,
        ultimoError: message,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: message,
        data: {
          scheduler: updatedScheduler,
        },
      },
      { status: 500 },
    );
  }
}
