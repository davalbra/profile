#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const BOT_NAME = "binance-futures-bot";
const TESTNET_URL = "https://testnet.binancefuture.com";
const MAINNET_URL = "https://fapi.binance.com";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.resolve(PROJECT_ROOT, "config/trading-futures.json");
const tradingConfig = loadTradingConfig(CONFIG_PATH);
const binanceConfig = tradingConfig.binance || {};

const env = {
  apiKey: process.env.BINANCE_API_KEY ?? "",
  apiSecret: process.env.BINANCE_API_SECRET ?? "",
  symbol: String(binanceConfig.symbol ?? "BTCUSDT").toUpperCase(),
  interval: String(binanceConfig.interval ?? "15m"),
  leverage: Number(binanceConfig.leverage ?? 5),
  riskPerTrade: Number(binanceConfig.riskPerTrade ?? 0.01),
  fastEma: Number(binanceConfig.fastEma ?? 21),
  slowEma: Number(binanceConfig.slowEma ?? 55),
  rsiPeriod: Number(binanceConfig.rsiPeriod ?? 14),
  atrPeriod: Number(binanceConfig.atrPeriod ?? 14),
  stopAtrMult: Number(binanceConfig.stopAtrMult ?? 1.5),
  tpAtrMult: Number(binanceConfig.tpAtrMult ?? 3),
  minNotional: Number(binanceConfig.minNotional ?? 5),
  paperBalance: Number(binanceConfig.paperBalance ?? 1000),
  recvWindow: Number(binanceConfig.recvWindow ?? 5000),
  dryRun: Boolean(binanceConfig.dryRun ?? true),
  testnet: Boolean(binanceConfig.testnet ?? true),
  baseUrl: String(binanceConfig.futuresBaseUrl ?? "").trim(),
  marginType: String(binanceConfig.marginType ?? "ISOLATED").toUpperCase(),
};

const baseUrl = env.baseUrl || (env.testnet ? TESTNET_URL : MAINNET_URL);

main().catch((error) => {
  console.error(`[${BOT_NAME}] Error:`, error.message);
  process.exitCode = 1;
});

async function main() {
  validateConfig(env);

  logStep(`Mode: ${env.dryRun ? "DRY_RUN" : "LIVE"} | Network: ${env.testnet ? "TESTNET" : "MAINNET"}`);
  logStep(`Pair: ${env.symbol} | Interval: ${env.interval} | Leverage: x${env.leverage}`);

  const [exchangeInfo, klines] = await Promise.all([
    publicRequest("/fapi/v1/exchangeInfo"),
    publicRequest("/fapi/v1/klines", {
      symbol: env.symbol,
      interval: env.interval,
      limit: Math.max(300, env.slowEma + env.atrPeriod + 50),
    }),
  ]);

  const symbolInfo = exchangeInfo.symbols?.find((item) => item.symbol === env.symbol);
  if (!symbolInfo) {
    throw new Error(`Symbol ${env.symbol} no está disponible en Binance Futures.`);
  }

  const marketRules = parseSymbolFilters(symbolInfo);
  const candles = parseKlines(klines);
  const signal = buildSignal(candles, env);

  logStep(
    [
      `Signal: ${signal.decision}`,
      `Close: ${signal.close.toFixed(4)}`,
      `EMA(${env.fastEma}): ${signal.fastEma.toFixed(4)}`,
      `EMA(${env.slowEma}): ${signal.slowEma.toFixed(4)}`,
      `RSI(${env.rsiPeriod}): ${signal.rsi.toFixed(2)}`,
      `ATR(${env.atrPeriod}): ${signal.atr.toFixed(4)}`,
    ].join(" | "),
  );

  if (signal.decision === "HOLD") {
    logStep("No hay señal válida. Se termina la ejecución.");
    return;
  }

  let balance = env.paperBalance;
  const canUseSignedData = Boolean(env.apiKey && env.apiSecret);

  if (canUseSignedData) {
    const account = await signedRequest("GET", "/fapi/v2/account");
    const positions = await signedRequest("GET", "/fapi/v2/positionRisk", { symbol: env.symbol });
    const currentPosition = Array.isArray(positions) ? positions[0] : null;
    const positionAmt = currentPosition ? Math.abs(Number(currentPosition.positionAmt)) : 0;

    if (positionAmt > 0) {
      logStep(`Ya existe posición abierta (${positionAmt}). No se abre una nueva.`);
      return;
    }

    balance = Number(account.availableBalance ?? account.totalWalletBalance ?? 0);
  } else {
    logStep(`Sin API keys: se usa BINANCE_PAPER_BALANCE=${env.paperBalance} para simulación.`);
  }

  if (!Number.isFinite(balance) || balance <= 0) {
    throw new Error("No hay balance disponible para operar.");
  }

  const side = signal.decision === "LONG" ? "BUY" : "SELL";
  const exitSide = side === "BUY" ? "SELL" : "BUY";
  const stopDistance = signal.atr * env.stopAtrMult;
  const riskCapital = balance * env.riskPerTrade;

  if (stopDistance <= 0) {
    throw new Error("Stop distance inválida (ATR muy bajo o configuración incorrecta).");
  }

  const rawQty = (riskCapital / stopDistance) * env.leverage;
  const quantity = roundByStep(rawQty, marketRules.qtyStep, "floor");
  const notional = quantity * signal.close;

  if (quantity <= 0) {
    throw new Error("La cantidad calculada es 0. Ajusta riesgo, leverage o símbolo.");
  }
  if (quantity < marketRules.minQty) {
    throw new Error(`Cantidad ${quantity} menor al mínimo permitido (${marketRules.minQty}).`);
  }
  if (notional < Math.max(env.minNotional, marketRules.minNotional)) {
    throw new Error(
      `Notional ${notional.toFixed(4)} menor al mínimo (${Math.max(env.minNotional, marketRules.minNotional)}).`,
    );
  }

  const stopPriceRaw =
    signal.decision === "LONG"
      ? signal.close - signal.atr * env.stopAtrMult
      : signal.close + signal.atr * env.stopAtrMult;
  const takeProfitRaw =
    signal.decision === "LONG"
      ? signal.close + signal.atr * env.tpAtrMult
      : signal.close - signal.atr * env.tpAtrMult;

  const stopPrice = roundByStep(
    stopPriceRaw,
    marketRules.priceStep,
    signal.decision === "LONG" ? "floor" : "ceil",
  );
  const takeProfitPrice = roundByStep(
    takeProfitRaw,
    marketRules.priceStep,
    signal.decision === "LONG" ? "ceil" : "floor",
  );

  logStep(
    [
      `Balance: ${balance.toFixed(4)} USDT`,
      `Risk capital: ${riskCapital.toFixed(4)} USDT`,
      `Qty: ${quantity}`,
      `Notional: ${notional.toFixed(4)} USDT`,
      `Stop: ${stopPrice}`,
      `TakeProfit: ${takeProfitPrice}`,
    ].join(" | "),
  );

  if (env.dryRun) {
    logStep("DRY_RUN activo: no se enviaron órdenes.");
    return;
  }

  await ensureLeverageAndMargin(env.symbol, env.leverage, env.marginType);

  const entryOrder = await signedRequest("POST", "/fapi/v1/order", {
    symbol: env.symbol,
    side,
    type: "MARKET",
    quantity: quantity.toString(),
  });

  const [stopOrder, tpOrder] = await Promise.all([
    signedRequest("POST", "/fapi/v1/order", {
      symbol: env.symbol,
      side: exitSide,
      type: "STOP_MARKET",
      stopPrice: stopPrice.toString(),
      closePosition: "true",
      workingType: "MARK_PRICE",
    }),
    signedRequest("POST", "/fapi/v1/order", {
      symbol: env.symbol,
      side: exitSide,
      type: "TAKE_PROFIT_MARKET",
      stopPrice: takeProfitPrice.toString(),
      closePosition: "true",
      workingType: "MARK_PRICE",
    }),
  ]);

  logStep(
    `Órdenes enviadas. Entry #${entryOrder.orderId} | Stop #${stopOrder.orderId} | TP #${tpOrder.orderId}`,
  );
}

function validateConfig(config) {
  if (!config.dryRun && (!config.apiKey || !config.apiSecret)) {
    throw new Error("BINANCE_API_KEY y BINANCE_API_SECRET son obligatorios en modo LIVE.");
  }

  const numericFields = [
    ["BINANCE_LEVERAGE", config.leverage],
    ["BINANCE_RISK_PER_TRADE", config.riskPerTrade],
    ["BINANCE_FAST_EMA", config.fastEma],
    ["BINANCE_SLOW_EMA", config.slowEma],
    ["BINANCE_RSI_PERIOD", config.rsiPeriod],
    ["BINANCE_ATR_PERIOD", config.atrPeriod],
    ["BINANCE_STOP_ATR_MULT", config.stopAtrMult],
    ["BINANCE_TP_ATR_MULT", config.tpAtrMult],
    ["BINANCE_PAPER_BALANCE", config.paperBalance],
  ];

  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${field} tiene un valor inválido.`);
    }
  }

  if (config.fastEma >= config.slowEma) {
    throw new Error("BINANCE_FAST_EMA debe ser menor que BINANCE_SLOW_EMA.");
  }
}

function logStep(message) {
  const now = new Date().toISOString();
  console.log(`[${BOT_NAME}] ${now} - ${message}`);
}

function loadTradingConfig(configPath) {
  try {
    const text = fs.readFileSync(configPath, "utf8");
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `No se pudo leer la configuración en ${configPath}. Crea config/trading-futures.json. Detalle: ${error.message}`,
    );
  }
}

function parseKlines(rawKlines) {
  return rawKlines.map((entry) => ({
    openTime: Number(entry[0]),
    open: Number(entry[1]),
    high: Number(entry[2]),
    low: Number(entry[3]),
    close: Number(entry[4]),
    volume: Number(entry[5]),
    closeTime: Number(entry[6]),
  }));
}

function buildSignal(candles, config) {
  if (candles.length < config.slowEma + config.atrPeriod + 5) {
    throw new Error("No hay suficientes velas para calcular indicadores.");
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const fast = ema(closes, config.fastEma);
  const slow = ema(closes, config.slowEma);
  const rsiValues = rsi(closes, config.rsiPeriod);
  const atrValues = atr(highs, lows, closes, config.atrPeriod);

  const i = closes.length - 1;
  const p = i - 1;

  const fastNow = fast[i];
  const fastPrev = fast[p];
  const slowNow = slow[i];
  const slowPrev = slow[p];
  const rsiNow = rsiValues[i];
  const atrNow = atrValues[i];
  const closeNow = closes[i];

  if (
    [fastNow, fastPrev, slowNow, slowPrev, rsiNow, atrNow, closeNow].some(
      (value) => value === null || value === undefined || !Number.isFinite(value),
    )
  ) {
    throw new Error("Indicadores incompletos. Revisa el historial de velas.");
  }

  const crossedUp = fastPrev <= slowPrev && fastNow > slowNow;
  const crossedDown = fastPrev >= slowPrev && fastNow < slowNow;

  const longSignal = crossedUp && rsiNow >= 52 && rsiNow <= 70 && closeNow > fastNow;
  const shortSignal = crossedDown && rsiNow >= 30 && rsiNow <= 48 && closeNow < fastNow;

  let decision = "HOLD";
  if (longSignal) decision = "LONG";
  if (shortSignal) decision = "SHORT";

  return {
    decision,
    close: closeNow,
    fastEma: fastNow,
    slowEma: slowNow,
    rsi: rsiNow,
    atr: atrNow,
  };
}

function ema(values, period) {
  const result = Array(values.length).fill(null);
  if (values.length < period) return result;

  const multiplier = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i += 1) seed += values[i];
  let prev = seed / period;
  result[period - 1] = prev;

  for (let i = period; i < values.length; i += 1) {
    prev = values[i] * multiplier + prev * (1 - multiplier);
    result[i] = prev;
  }

  return result;
}

function rsi(values, period) {
  const result = Array(values.length).fill(null);
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

function atr(highs, lows, closes, period) {
  const result = Array(highs.length).fill(null);
  if (highs.length <= period) return result;

  const trueRanges = highs.map((high, i) => {
    if (i === 0) return high - lows[i];
    return Math.max(high - lows[i], Math.abs(high - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  });

  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += trueRanges[i];
  let prevAtr = sum / period;
  result[period - 1] = prevAtr;

  for (let i = period; i < trueRanges.length; i += 1) {
    prevAtr = (prevAtr * (period - 1) + trueRanges[i]) / period;
    result[i] = prevAtr;
  }

  return result;
}

function parseSymbolFilters(symbolInfo) {
  const lotFilter =
    symbolInfo.filters.find((f) => f.filterType === "MARKET_LOT_SIZE") ||
    symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE");
  const priceFilter = symbolInfo.filters.find((f) => f.filterType === "PRICE_FILTER");
  const minNotionalFilter = symbolInfo.filters.find((f) => f.filterType === "MIN_NOTIONAL");

  if (!lotFilter || !priceFilter) {
    throw new Error(`No se pudieron leer los filtros de trading para ${symbolInfo.symbol}.`);
  }

  return {
    minQty: Number(lotFilter.minQty),
    qtyStep: Number(lotFilter.stepSize),
    priceStep: Number(priceFilter.tickSize),
    minNotional: Number(minNotionalFilter?.notional ?? 0),
  };
}

function roundByStep(value, step, mode = "floor") {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  const precision = decimalsFromStep(step);
  const factor = value / step;
  let roundedFactor = factor;

  if (mode === "floor") roundedFactor = Math.floor(factor);
  else if (mode === "ceil") roundedFactor = Math.ceil(factor);
  else roundedFactor = Math.round(factor);

  return Number((roundedFactor * step).toFixed(precision));
}

function decimalsFromStep(step) {
  const text = step.toString();
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  const decimals = text.split(".")[1];
  if (!decimals) return 0;
  return decimals.replace(/0+$/, "").length;
}

function toQueryString(params) {
  return new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = String(value);
      }
      return acc;
    }, {}),
  ).toString();
}

function sign(query) {
  return crypto.createHmac("sha256", env.apiSecret).update(query).digest("hex");
}

async function publicRequest(path, params = {}) {
  const query = toQueryString(params);
  const url = `${baseUrl}${path}${query ? `?${query}` : ""}`;
  const response = await fetch(url);
  const payload = await safeJson(response);

  if (!response.ok) {
    throw new Error(`Binance public API error ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function signedRequest(method, path, params = {}) {
  if (!env.apiKey || !env.apiSecret) {
    throw new Error("Faltan BINANCE_API_KEY/BINANCE_API_SECRET para requests firmados.");
  }

  const withTimestamp = {
    ...params,
    recvWindow: env.recvWindow,
    timestamp: Date.now(),
  };
  const query = toQueryString(withTimestamp);
  const signature = sign(query);
  const signedQuery = `${query}&signature=${signature}`;

  const url =
    method === "GET" || method === "DELETE"
      ? `${baseUrl}${path}?${signedQuery}`
      : `${baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": env.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" || method === "DELETE" ? undefined : signedQuery,
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(`Binance signed API error ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function ensureLeverageAndMargin(symbol, leverage, marginType) {
  try {
    await signedRequest("POST", "/fapi/v1/marginType", { symbol, marginType });
  } catch (error) {
    const message = String(error?.message ?? "");
    if (!message.includes("-4046")) {
      throw error;
    }
  }

  await signedRequest("POST", "/fapi/v1/leverage", { symbol, leverage });
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
