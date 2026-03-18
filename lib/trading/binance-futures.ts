import crypto from "node:crypto";
import { tradingConfig } from "@/lib/trading/config";

const TESTNET_URL = "https://testnet.binancefuture.com";
const MAINNET_URL = "https://fapi.binance.com";

export type TradingDecision = "LONG" | "SHORT" | "HOLD";

export type FuturesBotConfig = {
  apiKey: string;
  apiSecret: string;
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
  minNotional: number;
  recvWindow: number;
  dryRun: boolean;
  testnet: boolean;
  baseUrl: string;
  marginType: "ISOLATED" | "CROSSED";
  paperBalance: number;
};

export type FuturesBotOverrides = Partial<{
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
  dryRun: boolean;
  testnet: boolean;
  marginType: "ISOLATED" | "CROSSED";
  paperBalance: number;
}>;

export type BotRunSummary = {
  config: {
    symbol: string;
    interval: string;
    network: "TESTNET" | "MAINNET";
    dryRun: boolean;
    leverage: number;
    marginType: "ISOLATED" | "CROSSED";
  };
  signal: {
    decision: TradingDecision;
    close: number;
    fastEma: number;
    slowEma: number;
    rsi: number;
    atr: number;
  };
  sizing: {
    balance: number;
    riskCapital: number;
    quantity: number;
    notional: number;
    stopPrice: number;
    takeProfitPrice: number;
  } | null;
  orders:
    | {
        entryOrderId: string | number;
        stopOrderId: string | number;
        takeProfitOrderId: string | number;
      }
    | null;
  message: string;
};

export type BacktestTrade = {
  side: "LONG" | "SHORT";
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  reason: "STOP_LOSS" | "TAKE_PROFIT" | "EOD";
};

export type BacktestSummary = {
  config: {
    symbol: string;
    interval: string;
    candles: number;
    initialBalance: number;
    leverage: number;
    riskPerTrade: number;
  };
  metrics: {
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    netPnl: number;
    roiPercent: number;
    maxDrawdownPercent: number;
    profitFactor: number;
  };
  equity: {
    start: number;
    end: number;
    peak: number;
    trough: number;
  };
  recentTrades: BacktestTrade[];
};

export type IndicatorSeriesPoint = {
  openTime: number;
  closeTime: number;
  close: number;
  fastEma: number | null;
  slowEma: number | null;
  rsi: number | null;
  atr: number | null;
  signal: TradingDecision;
};

export type IndicatorsSummary = {
  config: {
    symbol: string;
    interval: string;
    candles: number;
  };
  latest: IndicatorSnapshot;
  points: IndicatorSeriesPoint[];
};

type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  closeTime: number;
};

type SymbolRules = {
  minQty: number;
  qtyStep: number;
  priceStep: number;
  minNotional: number;
};

type IndicatorSnapshot = {
  decision: TradingDecision;
  close: number;
  fastEma: number;
  slowEma: number;
  rsi: number;
  atr: number;
};

type RunOptions = {
  overrides?: FuturesBotOverrides;
};

type BacktestOptions = {
  overrides?: FuturesBotOverrides;
  candlesLimit?: number;
};

type IndicatorsOptions = {
  overrides?: FuturesBotOverrides;
  candlesLimit?: number;
};

type SignedRequestContext = {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  recvWindow: number;
};

type ExchangeInfoResponse = {
  symbols?: Array<{
    symbol?: string;
    filters: Array<{
      filterType?: string;
      minQty?: string;
      stepSize?: string;
      tickSize?: string;
      notional?: string;
    }>;
  }>;
};

type AccountResponse = {
  availableBalance?: string | number;
  totalWalletBalance?: string | number;
};

type OrderResponse = {
  orderId?: string | number;
};

export function getFuturesBotConfig(overrides: FuturesBotOverrides = {}): FuturesBotConfig {
  const fromFile = tradingConfig.binance;
  const fromConfig: FuturesBotConfig = {
    apiKey: process.env.BINANCE_API_KEY ?? "",
    apiSecret: process.env.BINANCE_API_SECRET ?? "",
    symbol: String(fromFile.symbol ?? "BTCUSDT").toUpperCase(),
    interval: fromFile.interval ?? "15m",
    leverage: Number(fromFile.leverage ?? 5),
    riskPerTrade: Number(fromFile.riskPerTrade ?? 0.01),
    fastEma: Number(fromFile.fastEma ?? 21),
    slowEma: Number(fromFile.slowEma ?? 55),
    rsiPeriod: Number(fromFile.rsiPeriod ?? 14),
    atrPeriod: Number(fromFile.atrPeriod ?? 14),
    stopAtrMult: Number(fromFile.stopAtrMult ?? 1.5),
    tpAtrMult: Number(fromFile.tpAtrMult ?? 3),
    minNotional: Number(fromFile.minNotional ?? 5),
    recvWindow: Number(fromFile.recvWindow ?? 5000),
    dryRun: Boolean(fromFile.dryRun ?? true),
    testnet: Boolean(fromFile.testnet ?? true),
    baseUrl: String(fromFile.futuresBaseUrl || "").trim(),
    marginType: String(fromFile.marginType ?? "ISOLATED").toUpperCase() === "CROSSED" ? "CROSSED" : "ISOLATED",
    paperBalance: Number(fromFile.paperBalance ?? 1000),
  };

  const merged: FuturesBotConfig = {
    ...fromConfig,
    ...overrides,
    symbol: String(overrides.symbol ?? fromConfig.symbol).toUpperCase(),
    marginType:
      String(overrides.marginType ?? fromConfig.marginType).toUpperCase() === "CROSSED" ? "CROSSED" : "ISOLATED",
  };

  merged.baseUrl = fromConfig.baseUrl || (merged.testnet ? TESTNET_URL : MAINNET_URL);

  validateConfig(merged);
  return merged;
}

export async function runFuturesBot(options: RunOptions = {}): Promise<BotRunSummary> {
  const config = getFuturesBotConfig(options.overrides);

  const [exchangeInfo, klines] = await Promise.all([
    publicRequest<ExchangeInfoResponse>(config.baseUrl, "/fapi/v1/exchangeInfo"),
    publicRequest<unknown[]>(config.baseUrl, "/fapi/v1/klines", {
      symbol: config.symbol,
      interval: config.interval,
      limit: Math.max(300, config.slowEma + config.atrPeriod + 50),
    }),
  ]);

  const symbolInfo = exchangeInfo.symbols?.find((item: { symbol?: string }) => item.symbol === config.symbol);
  if (!symbolInfo) {
    throw new Error(`El símbolo ${config.symbol} no está disponible en Binance Futures.`);
  }

  const rules = parseSymbolFilters(symbolInfo);
  const candles = parseKlines(klines);
  const indicators = calculateIndicators(candles, config);
  const signal = snapshotFromIndex(indicators, candles, candles.length - 1);

  const baseResult: BotRunSummary = {
    config: {
      symbol: config.symbol,
      interval: config.interval,
      network: config.testnet ? "TESTNET" : "MAINNET",
      dryRun: config.dryRun,
      leverage: config.leverage,
      marginType: config.marginType,
    },
    signal,
    sizing: null,
    orders: null,
    message: "No hay señal de entrada.",
  };

  if (signal.decision === "HOLD") {
    return baseResult;
  }

  const signedContext: SignedRequestContext = {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    baseUrl: config.baseUrl,
    recvWindow: config.recvWindow,
  };

  const hasKeys = Boolean(config.apiKey && config.apiSecret);
  let balance = config.paperBalance;

  if (hasKeys) {
    const [account, positions] = await Promise.all([
      signedRequest<AccountResponse>(signedContext, "GET", "/fapi/v2/account"),
      signedRequest<Array<{ positionAmt?: string | number }>>(signedContext, "GET", "/fapi/v2/positionRisk", {
        symbol: config.symbol,
      }),
    ]);

    const currentPosition = Array.isArray(positions) ? positions[0] : null;
    const positionAmt = currentPosition ? Math.abs(Number(currentPosition.positionAmt)) : 0;
    if (positionAmt > 0) {
      return {
        ...baseResult,
        message: `Ya existe una posición abierta (${positionAmt}) en ${config.symbol}.`,
      };
    }

    balance = Number(account.availableBalance ?? account.totalWalletBalance ?? 0);
  } else if (!config.dryRun) {
    throw new Error("Faltan BINANCE_API_KEY/BINANCE_API_SECRET para modo LIVE.");
  }

  if (!Number.isFinite(balance) || balance <= 0) {
    throw new Error("No hay balance disponible para operar.");
  }

  const sizing = calculatePositionSizing({
    balance,
    entryPrice: signal.close,
    decision: signal.decision,
    atr: signal.atr,
    rules,
    config,
  });

  const sizingResult = {
    balance,
    riskCapital: sizing.riskCapital,
    quantity: sizing.quantity,
    notional: sizing.notional,
    stopPrice: sizing.stopPrice,
    takeProfitPrice: sizing.takeProfitPrice,
  };

  if (config.dryRun) {
    return {
      ...baseResult,
      sizing: sizingResult,
      message: hasKeys
        ? "DRY_RUN activo: no se enviaron órdenes."
        : "DRY_RUN sin API keys: cálculo realizado con balance virtual (BINANCE_PAPER_BALANCE).",
    };
  }

  await ensureLeverageAndMargin(signedContext, config.symbol, config.leverage, config.marginType);

  const side = signal.decision === "LONG" ? "BUY" : "SELL";
  const exitSide = side === "BUY" ? "SELL" : "BUY";

  const entryOrder = await signedRequest<OrderResponse>(signedContext, "POST", "/fapi/v1/order", {
    symbol: config.symbol,
    side,
    type: "MARKET",
    quantity: sizing.quantity.toString(),
  });

  const [stopOrder, takeProfitOrder] = await Promise.all([
    signedRequest<OrderResponse>(signedContext, "POST", "/fapi/v1/order", {
      symbol: config.symbol,
      side: exitSide,
      type: "STOP_MARKET",
      stopPrice: sizing.stopPrice.toString(),
      closePosition: "true",
      workingType: "MARK_PRICE",
    }),
    signedRequest<OrderResponse>(signedContext, "POST", "/fapi/v1/order", {
      symbol: config.symbol,
      side: exitSide,
      type: "TAKE_PROFIT_MARKET",
      stopPrice: sizing.takeProfitPrice.toString(),
      closePosition: "true",
      workingType: "MARK_PRICE",
    }),
  ]);

  return {
    ...baseResult,
    sizing: sizingResult,
    orders: {
      entryOrderId: entryOrder.orderId ?? "unknown",
      stopOrderId: stopOrder.orderId ?? "unknown",
      takeProfitOrderId: takeProfitOrder.orderId ?? "unknown",
    },
    message: "Órdenes enviadas correctamente a Binance Futures.",
  };
}

export async function backtestFuturesStrategy(options: BacktestOptions = {}): Promise<BacktestSummary> {
  const config = getFuturesBotConfig(options.overrides);
  const candlesLimit = clampNumber(options.candlesLimit ?? tradingConfig.binance.backtestCandlesLimit, 120, 1200);

  const [exchangeInfo, klines] = await Promise.all([
    publicRequest<ExchangeInfoResponse>(config.baseUrl, "/fapi/v1/exchangeInfo"),
    publicRequest<unknown[]>(config.baseUrl, "/fapi/v1/klines", {
      symbol: config.symbol,
      interval: config.interval,
      limit: candlesLimit,
    }),
  ]);

  const symbolInfo = exchangeInfo.symbols?.find((item: { symbol?: string }) => item.symbol === config.symbol);
  if (!symbolInfo) {
    throw new Error(`El símbolo ${config.symbol} no está disponible en Binance Futures.`);
  }

  const rules = parseSymbolFilters(symbolInfo);
  const candles = parseKlines(klines);
  const indicators = calculateIndicators(candles, config);

  const startIndex = Math.max(config.slowEma, config.rsiPeriod + 2, config.atrPeriod + 2);
  if (candles.length <= startIndex + 2) {
    throw new Error("No hay suficientes velas para ejecutar el backtest.");
  }

  const trades: BacktestTrade[] = [];
  let equity = config.paperBalance;
  let peak = equity;
  let trough = equity;

  let position:
    | {
        side: "LONG" | "SHORT";
        entryPrice: number;
        stopPrice: number;
        takeProfitPrice: number;
        quantity: number;
        entryTime: number;
      }
    | null = null;

  for (let i = startIndex; i < candles.length - 1; i += 1) {
    const candle = candles[i];

    if (position) {
      const longPos = position.side === "LONG";
      const stopHit = longPos ? candle.low <= position.stopPrice : candle.high >= position.stopPrice;
      const tpHit = longPos ? candle.high >= position.takeProfitPrice : candle.low <= position.takeProfitPrice;

      if (stopHit || tpHit) {
        const reason: BacktestTrade["reason"] = stopHit ? "STOP_LOSS" : "TAKE_PROFIT";
        const exitPrice = stopHit ? position.stopPrice : position.takeProfitPrice;
        const pnl = calculatePnl(position.side, position.entryPrice, exitPrice, position.quantity);
        equity += pnl;

        trades.push({
          side: position.side,
          entryTime: position.entryTime,
          exitTime: candle.closeTime,
          entryPrice: position.entryPrice,
          exitPrice,
          quantity: position.quantity,
          pnl,
          pnlPercent: position.entryPrice > 0 ? (pnl / (position.entryPrice * position.quantity)) * 100 : 0,
          reason,
        });

        position = null;
      }
    }

    if (!position) {
      const signal = snapshotFromIndex(indicators, candles, i);
      if (signal.decision === "HOLD") {
        peak = Math.max(peak, equity);
        trough = Math.min(trough, equity);
        continue;
      }

      const nextCandle = candles[i + 1];
      const entryPrice = nextCandle.open;
      const side: "LONG" | "SHORT" = signal.decision === "LONG" ? "LONG" : "SHORT";

      const sizing = calculatePositionSizing({
        balance: equity,
        entryPrice,
        decision: side,
        atr: signal.atr,
        rules,
        config,
      });

      if (sizing.quantity <= 0) {
        peak = Math.max(peak, equity);
        trough = Math.min(trough, equity);
        continue;
      }

      position = {
        side,
        entryPrice,
        stopPrice: sizing.stopPrice,
        takeProfitPrice: sizing.takeProfitPrice,
        quantity: sizing.quantity,
        entryTime: nextCandle.openTime,
      };
    }

    peak = Math.max(peak, equity);
    trough = Math.min(trough, equity);
  }

  if (position) {
    const last = candles[candles.length - 1];
    const pnl = calculatePnl(position.side, position.entryPrice, last.close, position.quantity);
    equity += pnl;
    trades.push({
      side: position.side,
      entryTime: position.entryTime,
      exitTime: last.closeTime,
      entryPrice: position.entryPrice,
      exitPrice: last.close,
      quantity: position.quantity,
      pnl,
      pnlPercent: position.entryPrice > 0 ? (pnl / (position.entryPrice * position.quantity)) * 100 : 0,
      reason: "EOD",
    });
    peak = Math.max(peak, equity);
    trough = Math.min(trough, equity);
  }

  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const losses = trades.filter((trade) => trade.pnl < 0).length;
  const grossProfit = trades.filter((trade) => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLossAbs = Math.abs(trades.filter((trade) => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
  const netPnl = equity - config.paperBalance;
  const drawdownPercent = peak > 0 ? ((peak - trough) / peak) * 100 : 0;

  return {
    config: {
      symbol: config.symbol,
      interval: config.interval,
      candles: candles.length,
      initialBalance: config.paperBalance,
      leverage: config.leverage,
      riskPerTrade: config.riskPerTrade,
    },
    metrics: {
      trades: trades.length,
      wins,
      losses,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
      netPnl,
      roiPercent: config.paperBalance > 0 ? (netPnl / config.paperBalance) * 100 : 0,
      maxDrawdownPercent: drawdownPercent,
      profitFactor: grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0,
    },
    equity: {
      start: config.paperBalance,
      end: equity,
      peak,
      trough,
    },
    recentTrades: trades.slice(-15),
  };
}

export async function getFuturesIndicators(options: IndicatorsOptions = {}): Promise<IndicatorsSummary> {
  const config = getFuturesBotConfig(options.overrides);
  const candlesLimit = clampNumber(
    options.candlesLimit ?? tradingConfig.binance.indicatorsCandlesLimit,
    120,
    1200,
  );

  const klines = await publicRequest<unknown[]>(config.baseUrl, "/fapi/v1/klines", {
    symbol: config.symbol,
    interval: config.interval,
    limit: candlesLimit,
  });

  const candles = parseKlines(klines);
  const indicators = calculateIndicators(candles, config);
  const startIndex = Math.max(config.slowEma, config.rsiPeriod, config.atrPeriod);

  const points = candles
    .map<IndicatorSeriesPoint>((candle, index) => {
      const snapshot = index > 0 ? snapshotFromIndex(indicators, candles, index) : null;
      return {
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        close: candle.close,
        fastEma: indicators.fastEma[index],
        slowEma: indicators.slowEma[index],
        rsi: indicators.rsi[index],
        atr: indicators.atr[index],
        signal: snapshot?.decision ?? "HOLD",
      };
    })
    .filter((_, index) => index >= startIndex);

  if (!points.length) {
    throw new Error("No hay suficientes datos para generar la serie de indicadores.");
  }

  const latestIndex = candles.length - 1;
  const latest = snapshotFromIndex(indicators, candles, latestIndex);

  return {
    config: {
      symbol: config.symbol,
      interval: config.interval,
      candles: candles.length,
    },
    latest,
    points,
  };
}

function calculatePnl(side: "LONG" | "SHORT", entry: number, exit: number, quantity: number): number {
  if (side === "LONG") {
    return (exit - entry) * quantity;
  }
  return (entry - exit) * quantity;
}

function calculatePositionSizing({
  balance,
  entryPrice,
  decision,
  atr,
  rules,
  config,
}: {
  balance: number;
  entryPrice: number;
  decision: "LONG" | "SHORT";
  atr: number;
  rules: SymbolRules;
  config: FuturesBotConfig;
}) {
  const stopDistance = atr * config.stopAtrMult;
  if (!Number.isFinite(stopDistance) || stopDistance <= 0) {
    throw new Error("No se pudo calcular stop distance.");
  }

  const riskCapital = balance * config.riskPerTrade;
  const rawQtyByRisk = riskCapital / stopDistance;
  const rawQtyByMargin = (balance * config.leverage) / entryPrice;
  const rawQuantity = Math.max(0, Math.min(rawQtyByRisk, rawQtyByMargin));
  const quantity = roundByStep(rawQuantity, rules.qtyStep, "floor");

  if (quantity <= 0 || quantity < rules.minQty) {
    throw new Error("La cantidad calculada es menor al mínimo permitido.");
  }

  const notional = quantity * entryPrice;
  if (notional < Math.max(config.minNotional, rules.minNotional)) {
    throw new Error("El notional calculado es menor al mínimo requerido.");
  }

  const stopPriceRaw = decision === "LONG" ? entryPrice - stopDistance : entryPrice + stopDistance;
  const takeProfitRaw =
    decision === "LONG" ? entryPrice + atr * config.tpAtrMult : entryPrice - atr * config.tpAtrMult;

  const stopPrice = roundByStep(stopPriceRaw, rules.priceStep, decision === "LONG" ? "floor" : "ceil");
  const takeProfitPrice = roundByStep(
    takeProfitRaw,
    rules.priceStep,
    decision === "LONG" ? "ceil" : "floor",
  );

  return {
    riskCapital,
    quantity,
    notional,
    stopPrice,
    takeProfitPrice,
  };
}

function validateConfig(config: FuturesBotConfig) {
  if (!Number.isFinite(config.leverage) || config.leverage <= 0) {
    throw new Error("BINANCE_LEVERAGE inválido.");
  }
  if (!Number.isFinite(config.riskPerTrade) || config.riskPerTrade <= 0 || config.riskPerTrade > 1) {
    throw new Error("BINANCE_RISK_PER_TRADE inválido. Usa un valor entre 0 y 1.");
  }
  if (!Number.isFinite(config.fastEma) || !Number.isFinite(config.slowEma) || config.fastEma >= config.slowEma) {
    throw new Error("Config EMA inválida: FAST_EMA debe ser menor que SLOW_EMA.");
  }
  if (!Number.isFinite(config.paperBalance) || config.paperBalance <= 0) {
    throw new Error("BINANCE_PAPER_BALANCE inválido.");
  }
  if (!config.symbol) {
    throw new Error("BINANCE_SYMBOL es obligatorio.");
  }
}

function parseKlines(rawKlines: unknown): Candle[] {
  if (!Array.isArray(rawKlines)) {
    throw new Error("Formato de velas inválido recibido desde Binance.");
  }

  return rawKlines.map((entry) => {
    const item = entry as Array<string | number>;
    return {
      openTime: Number(item[0]),
      open: Number(item[1]),
      high: Number(item[2]),
      low: Number(item[3]),
      close: Number(item[4]),
      closeTime: Number(item[6]),
    };
  });
}

function calculateIndicators(candles: Candle[], config: FuturesBotConfig) {
  if (candles.length < config.slowEma + config.atrPeriod + 10) {
    throw new Error("No hay suficientes velas para calcular indicadores.");
  }

  const closes = candles.map((candle) => candle.close);
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);

  return {
    fastEma: ema(closes, config.fastEma),
    slowEma: ema(closes, config.slowEma),
    rsi: rsi(closes, config.rsiPeriod),
    atr: atr(highs, lows, closes, config.atrPeriod),
  };
}

function snapshotFromIndex(
  indicators: {
    fastEma: Array<number | null>;
    slowEma: Array<number | null>;
    rsi: Array<number | null>;
    atr: Array<number | null>;
  },
  candles: Candle[],
  index: number,
): IndicatorSnapshot {
  const previous = index - 1;
  if (previous < 0) {
    throw new Error("No hay suficientes datos para señal.");
  }

  const close = candles[index]?.close;
  const fastNow = indicators.fastEma[index];
  const fastPrev = indicators.fastEma[previous];
  const slowNow = indicators.slowEma[index];
  const slowPrev = indicators.slowEma[previous];
  const rsiNow = indicators.rsi[index];
  const atrNow = indicators.atr[index];

  if (
    [close, fastNow, fastPrev, slowNow, slowPrev, rsiNow, atrNow].some(
      (value) => value === null || value === undefined || !Number.isFinite(value),
    )
  ) {
    return {
      decision: "HOLD",
      close: Number(close ?? 0),
      fastEma: Number(fastNow ?? 0),
      slowEma: Number(slowNow ?? 0),
      rsi: Number(rsiNow ?? 0),
      atr: Number(atrNow ?? 0),
    };
  }

  const crossedUp = Number(fastPrev) <= Number(slowPrev) && Number(fastNow) > Number(slowNow);
  const crossedDown = Number(fastPrev) >= Number(slowPrev) && Number(fastNow) < Number(slowNow);
  const longSignal = crossedUp && Number(rsiNow) >= 52 && Number(rsiNow) <= 70 && Number(close) > Number(fastNow);
  const shortSignal =
    crossedDown && Number(rsiNow) >= 30 && Number(rsiNow) <= 48 && Number(close) < Number(fastNow);

  let decision: TradingDecision = "HOLD";
  if (longSignal) decision = "LONG";
  if (shortSignal) decision = "SHORT";

  return {
    decision,
    close: Number(close),
    fastEma: Number(fastNow),
    slowEma: Number(slowNow),
    rsi: Number(rsiNow),
    atr: Number(atrNow),
  };
}

function ema(values: number[], period: number): Array<number | null> {
  const result = Array<number | null>(values.length).fill(null);
  if (values.length < period) return result;

  const multiplier = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i += 1) seed += values[i];
  let previous = seed / period;
  result[period - 1] = previous;

  for (let i = period; i < values.length; i += 1) {
    previous = values[i] * multiplier + previous * (1 - multiplier);
    result[i] = previous;
  }

  return result;
}

function rsi(values: number[], period: number): Array<number | null> {
  const result = Array<number | null>(values.length).fill(null);
  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

function atr(highs: number[], lows: number[], closes: number[], period: number): Array<number | null> {
  const result = Array<number | null>(highs.length).fill(null);
  if (highs.length <= period) return result;

  const trValues = highs.map((high, index) => {
    if (index === 0) {
      return high - lows[index];
    }
    return Math.max(high - lows[index], Math.abs(high - closes[index - 1]), Math.abs(lows[index] - closes[index - 1]));
  });

  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += trValues[i];
  let previousAtr = sum / period;
  result[period - 1] = previousAtr;

  for (let i = period; i < trValues.length; i += 1) {
    previousAtr = (previousAtr * (period - 1) + trValues[i]) / period;
    result[i] = previousAtr;
  }

  return result;
}

function parseSymbolFilters(symbolInfo: {
  filters: Array<{
    filterType?: string;
    minQty?: string;
    stepSize?: string;
    tickSize?: string;
    notional?: string;
  }>;
}): SymbolRules {
  const lotFilter =
    symbolInfo.filters.find((filter) => filter.filterType === "MARKET_LOT_SIZE") ||
    symbolInfo.filters.find((filter) => filter.filterType === "LOT_SIZE");
  const priceFilter = symbolInfo.filters.find((filter) => filter.filterType === "PRICE_FILTER");
  const minNotionalFilter = symbolInfo.filters.find((filter) => filter.filterType === "MIN_NOTIONAL");

  if (!lotFilter || !priceFilter) {
    throw new Error("No se pudieron leer las reglas del símbolo en Binance.");
  }

  return {
    minQty: Number(lotFilter.minQty ?? "0"),
    qtyStep: Number(lotFilter.stepSize ?? "0"),
    priceStep: Number(priceFilter.tickSize ?? "0"),
    minNotional: Number(minNotionalFilter?.notional ?? "0"),
  };
}

function roundByStep(value: number, step: number, mode: "floor" | "ceil" | "round"): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return value;
  }

  const precision = decimalsFromStep(step);
  const factor = value / step;
  const roundedFactor = mode === "floor" ? Math.floor(factor) : mode === "ceil" ? Math.ceil(factor) : Math.round(factor);
  return Number((roundedFactor * step).toFixed(precision));
}

function decimalsFromStep(step: number): number {
  const text = step.toString();
  if (text.includes("e-")) {
    const [, exponent] = text.split("e-");
    return Number(exponent || "0");
  }
  const decimals = text.split(".")[1];
  return decimals ? decimals.replace(/0+$/, "").length : 0;
}

function toQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const payload = Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = String(value);
    }
    return acc;
  }, {});
  return new URLSearchParams(payload).toString();
}

function signQuery(apiSecret: string, query: string): string {
  return crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
}

async function publicRequest<T = unknown>(
  baseUrl: string,
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const query = toQueryString(params);
  const url = `${baseUrl}${path}${query ? `?${query}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(`Binance public API error ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload as T;
}

async function signedRequest<T = unknown>(
  context: SignedRequestContext,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T> {
  if (!context.apiKey || !context.apiSecret) {
    throw new Error("Faltan credenciales de Binance para request firmado.");
  }

  const query = toQueryString({
    ...params,
    recvWindow: context.recvWindow,
    timestamp: Date.now(),
  });
  const signature = signQuery(context.apiSecret, query);
  const signedQuery = `${query}&signature=${signature}`;
  const url =
    method === "GET" || method === "DELETE" ? `${context.baseUrl}${path}?${signedQuery}` : `${context.baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": context.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" || method === "DELETE" ? undefined : signedQuery,
    cache: "no-store",
  });
  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(`Binance signed API error ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload as T;
}

async function ensureLeverageAndMargin(
  context: SignedRequestContext,
  symbol: string,
  leverage: number,
  marginType: "ISOLATED" | "CROSSED",
) {
  try {
    await signedRequest(context, "POST", "/fapi/v1/marginType", {
      symbol,
      marginType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("-4046")) {
      throw error;
    }
  }

  await signedRequest(context, "POST", "/fapi/v1/leverage", {
    symbol,
    leverage,
  });
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.floor(value);
}
