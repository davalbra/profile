import { TradingExecutionSource, TradingExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { BacktestSummary, BotRunSummary, FuturesBotOverrides } from "@/lib/trading/binance-futures";
import { tradingConfig } from "@/lib/trading/config";

export type SchedulerConfigPayload = Partial<{
  enabled: boolean;
  intervalMinutes: number;
  runInDryMode: boolean;
  testnet: boolean;
  symbol: string;
  interval: string;
  leverage: number;
  riskPerTrade: number;
  paperBalance: number;
  marginType: "ISOLATED" | "CROSSED";
  fastEma: number;
  slowEma: number;
  rsiPeriod: number;
  atrPeriod: number;
  stopAtrMult: number;
  tpAtrMult: number;
  candlesForBacktesting: number;
}>;

function sanitizeNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function sanitizeInt(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
}

export async function saveRunHistory(params: {
  result: BotRunSummary;
  source: TradingExecutionSource;
  userId?: string | null;
}) {
  const { result, source, userId } = params;
  await prisma.tradingFuturesRunHistory.create({
    data: {
      ejecutadoPorId: userId || null,
      source,
      status: TradingExecutionStatus.SUCCESS,
      symbol: result.config.symbol,
      interval: result.config.interval,
      network: result.config.network,
      dryRun: result.config.dryRun,
      leverage: result.config.leverage,
      marginType: result.config.marginType,
      decision: result.signal.decision,
      close: result.signal.close,
      fastEma: result.signal.fastEma,
      slowEma: result.signal.slowEma,
      rsi: result.signal.rsi,
      atr: result.signal.atr,
      balance: result.sizing?.balance ?? null,
      riskCapital: result.sizing?.riskCapital ?? null,
      quantity: result.sizing?.quantity ?? null,
      notional: result.sizing?.notional ?? null,
      stopPrice: result.sizing?.stopPrice ?? null,
      takeProfitPrice: result.sizing?.takeProfitPrice ?? null,
      orders: result.orders ? result.orders : undefined,
      message: result.message,
    },
  });
}

export async function saveRunHistoryError(params: {
  source: TradingExecutionSource;
  userId?: string | null;
  symbol: string;
  interval: string;
  network: "TESTNET" | "MAINNET";
  dryRun: boolean;
  leverage: number;
  marginType: "ISOLATED" | "CROSSED";
  error: string;
}) {
  const { source, userId, error, ...config } = params;
  await prisma.tradingFuturesRunHistory.create({
    data: {
      ejecutadoPorId: userId || null,
      source,
      status: TradingExecutionStatus.FAILED,
      symbol: config.symbol,
      interval: config.interval,
      network: config.network,
      dryRun: config.dryRun,
      leverage: config.leverage,
      marginType: config.marginType,
      decision: "HOLD",
      close: 0,
      fastEma: 0,
      slowEma: 0,
      rsi: 0,
      atr: 0,
      error,
      message: "Ejecución fallida.",
    },
  });
}

export async function saveBacktestHistory(params: {
  result: BacktestSummary;
  source: TradingExecutionSource;
  userId?: string | null;
}) {
  const { result, source, userId } = params;
  await prisma.tradingFuturesBacktestHistory.create({
    data: {
      ejecutadoPorId: userId || null,
      source,
      status: TradingExecutionStatus.SUCCESS,
      symbol: result.config.symbol,
      interval: result.config.interval,
      candles: result.config.candles,
      initialBalance: result.config.initialBalance,
      leverage: result.config.leverage,
      riskPerTrade: result.config.riskPerTrade,
      trades: result.metrics.trades,
      wins: result.metrics.wins,
      losses: result.metrics.losses,
      winRate: result.metrics.winRate,
      netPnl: result.metrics.netPnl,
      roiPercent: result.metrics.roiPercent,
      maxDrawdownPercent: result.metrics.maxDrawdownPercent,
      profitFactor: Number.isFinite(result.metrics.profitFactor) ? result.metrics.profitFactor : null,
      equity: result.equity,
      recentTrades: result.recentTrades,
    },
  });
}

export async function getTradingHistory(limit = 25) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 25));
  const [runs, backtests] = await Promise.all([
    prisma.tradingFuturesRunHistory.findMany({
      take: safeLimit,
      orderBy: { creadoEn: "desc" },
      select: {
        id: true,
        creadoEn: true,
        source: true,
        status: true,
        symbol: true,
        interval: true,
        dryRun: true,
        decision: true,
        message: true,
        error: true,
      },
    }),
    prisma.tradingFuturesBacktestHistory.findMany({
      take: safeLimit,
      orderBy: { creadoEn: "desc" },
      select: {
        id: true,
        creadoEn: true,
        source: true,
        status: true,
        symbol: true,
        interval: true,
        trades: true,
        winRate: true,
        roiPercent: true,
        netPnl: true,
      },
    }),
  ]);

  return { runs, backtests };
}

export async function getSchedulerConfig() {
  const defaults = tradingConfig;
  return prisma.tradingFuturesSchedulerConfig.upsert({
    where: { id: "futures" },
    update: {},
    create: {
      id: "futures",
      intervalMinutes: defaults.scheduler.intervalMinutes,
      runInDryMode: defaults.binance.dryRun,
      testnet: defaults.binance.testnet,
      symbol: defaults.binance.symbol,
      interval: defaults.binance.interval,
      leverage: Math.trunc(defaults.binance.leverage),
      riskPerTrade: defaults.binance.riskPerTrade,
      paperBalance: defaults.binance.paperBalance,
      marginType: defaults.binance.marginType,
      fastEma: Math.trunc(defaults.binance.fastEma),
      slowEma: Math.trunc(defaults.binance.slowEma),
      rsiPeriod: Math.trunc(defaults.binance.rsiPeriod),
      atrPeriod: Math.trunc(defaults.binance.atrPeriod),
      stopAtrMult: defaults.binance.stopAtrMult,
      tpAtrMult: defaults.binance.tpAtrMult,
      candlesForBacktesting: defaults.scheduler.candlesForBacktesting,
    },
  });
}

export async function updateSchedulerConfig(payload: SchedulerConfigPayload) {
  const current = await getSchedulerConfig();

  const updated = await prisma.tradingFuturesSchedulerConfig.update({
    where: { id: current.id },
    data: {
      enabled: payload.enabled ?? current.enabled,
      intervalMinutes: Math.max(1, Math.min(720, Number(payload.intervalMinutes ?? current.intervalMinutes))),
      runInDryMode: payload.runInDryMode ?? current.runInDryMode,
      testnet: payload.testnet ?? current.testnet,
      symbol: payload.symbol?.toUpperCase().trim() || current.symbol,
      interval: payload.interval?.trim() || current.interval,
      leverage: sanitizeInt(payload.leverage) ?? current.leverage,
      riskPerTrade: sanitizeNumber(payload.riskPerTrade) ?? current.riskPerTrade,
      paperBalance: sanitizeNumber(payload.paperBalance) ?? current.paperBalance,
      marginType:
        String(payload.marginType || current.marginType).toUpperCase() === "CROSSED" ? "CROSSED" : "ISOLATED",
      fastEma: sanitizeInt(payload.fastEma) ?? current.fastEma,
      slowEma: sanitizeInt(payload.slowEma) ?? current.slowEma,
      rsiPeriod: sanitizeInt(payload.rsiPeriod) ?? current.rsiPeriod,
      atrPeriod: sanitizeInt(payload.atrPeriod) ?? current.atrPeriod,
      stopAtrMult: sanitizeNumber(payload.stopAtrMult) ?? current.stopAtrMult,
      tpAtrMult: sanitizeNumber(payload.tpAtrMult) ?? current.tpAtrMult,
      candlesForBacktesting:
        Math.max(120, Math.min(1200, Number(payload.candlesForBacktesting ?? current.candlesForBacktesting))),
    },
  });

  return updated;
}

export function schedulerConfigToOverrides(config: Awaited<ReturnType<typeof getSchedulerConfig>>): FuturesBotOverrides {
  return {
    symbol: config.symbol || undefined,
    interval: config.interval || undefined,
    leverage: config.leverage ?? undefined,
    riskPerTrade: config.riskPerTrade ?? undefined,
    paperBalance: config.paperBalance ?? undefined,
    marginType: config.marginType === "CROSSED" ? "CROSSED" : "ISOLATED",
    fastEma: config.fastEma ?? undefined,
    slowEma: config.slowEma ?? undefined,
    rsiPeriod: config.rsiPeriod ?? undefined,
    atrPeriod: config.atrPeriod ?? undefined,
    stopAtrMult: config.stopAtrMult ?? undefined,
    tpAtrMult: config.tpAtrMult ?? undefined,
    testnet: config.testnet,
    dryRun: config.runInDryMode,
  };
}
