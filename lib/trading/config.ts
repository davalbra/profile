import rawTradingConfig from "@/config/trading-futures.json";

type TradingConfigFile = {
  binance: {
    testnet: boolean;
    dryRun: boolean;
    futuresBaseUrl: string;
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
    marginType: "ISOLATED" | "CROSSED";
    paperBalance: number;
    backtestCandlesLimit: number;
    indicatorsCandlesLimit: number;
  };
  scheduler: {
    intervalMinutes: number;
    candlesForBacktesting: number;
  };
};

function sanitizeMarginType(value: string): "ISOLATED" | "CROSSED" {
  return value.toUpperCase() === "CROSSED" ? "CROSSED" : "ISOLATED";
}

const normalized: TradingConfigFile = {
  binance: {
    testnet: Boolean(rawTradingConfig.binance?.testnet ?? true),
    dryRun: Boolean(rawTradingConfig.binance?.dryRun ?? true),
    futuresBaseUrl: String(rawTradingConfig.binance?.futuresBaseUrl ?? "").trim(),
    symbol: String(rawTradingConfig.binance?.symbol ?? "BTCUSDT").toUpperCase().trim(),
    interval: String(rawTradingConfig.binance?.interval ?? "15m").trim(),
    leverage: Number(rawTradingConfig.binance?.leverage ?? 5),
    riskPerTrade: Number(rawTradingConfig.binance?.riskPerTrade ?? 0.01),
    fastEma: Number(rawTradingConfig.binance?.fastEma ?? 21),
    slowEma: Number(rawTradingConfig.binance?.slowEma ?? 55),
    rsiPeriod: Number(rawTradingConfig.binance?.rsiPeriod ?? 14),
    atrPeriod: Number(rawTradingConfig.binance?.atrPeriod ?? 14),
    stopAtrMult: Number(rawTradingConfig.binance?.stopAtrMult ?? 1.5),
    tpAtrMult: Number(rawTradingConfig.binance?.tpAtrMult ?? 3),
    minNotional: Number(rawTradingConfig.binance?.minNotional ?? 5),
    recvWindow: Number(rawTradingConfig.binance?.recvWindow ?? 5000),
    marginType: sanitizeMarginType(String(rawTradingConfig.binance?.marginType ?? "ISOLATED")),
    paperBalance: Number(rawTradingConfig.binance?.paperBalance ?? 1000),
    backtestCandlesLimit: Number(rawTradingConfig.binance?.backtestCandlesLimit ?? 500),
    indicatorsCandlesLimit: Number(rawTradingConfig.binance?.indicatorsCandlesLimit ?? 300),
  },
  scheduler: {
    intervalMinutes: Number(rawTradingConfig.scheduler?.intervalMinutes ?? 15),
    candlesForBacktesting: Number(rawTradingConfig.scheduler?.candlesForBacktesting ?? 500),
  },
};

export const tradingConfig = normalized;
