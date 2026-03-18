"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Play, RefreshCcw, RotateCcw, Save } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TradingDecision = "LONG" | "SHORT" | "HOLD";

type BotRunData = {
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
  message: string;
};

type BacktestData = {
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
  recentTrades: Array<{
    side: "LONG" | "SHORT";
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    pnlPercent: number;
    reason: "STOP_LOSS" | "TAKE_PROFIT" | "EOD";
  }>;
};

type IndicatorsData = {
  config: {
    symbol: string;
    interval: string;
    candles: number;
  };
  latest: {
    decision: TradingDecision;
    close: number;
    fastEma: number;
    slowEma: number;
    rsi: number;
    atr: number;
  };
  points: Array<{
    openTime: number;
    closeTime: number;
    close: number;
    fastEma: number | null;
    slowEma: number | null;
    rsi: number | null;
    atr: number | null;
    signal: TradingDecision;
  }>;
};

type SchedulerConfig = {
  id: string;
  enabled: boolean;
  intervalMinutes: number;
  runInDryMode: boolean;
  testnet: boolean;
  symbol: string | null;
  interval: string | null;
  leverage: number | null;
  riskPerTrade: number | null;
  paperBalance: number | null;
  marginType: "ISOLATED" | "CROSSED";
  fastEma: number | null;
  slowEma: number | null;
  rsiPeriod: number | null;
  atrPeriod: number | null;
  stopAtrMult: number | null;
  tpAtrMult: number | null;
  candlesForBacktesting: number;
  ultimoIntentoEn: string | null;
  ultimaEjecucionEn: string | null;
  ultimaDecision: string | null;
  ultimoEstado: "SUCCESS" | "FAILED" | null;
  ultimoError: string | null;
};

type HistoryData = {
  runs: Array<{
    id: string;
    creadoEn: string;
    source: "MANUAL" | "CRON";
    status: "SUCCESS" | "FAILED";
    symbol: string;
    interval: string;
    dryRun: boolean;
    decision: string;
    message: string | null;
    error: string | null;
  }>;
  backtests: Array<{
    id: string;
    creadoEn: string;
    source: "MANUAL" | "CRON";
    status: "SUCCESS" | "FAILED";
    symbol: string;
    interval: string;
    trades: number;
    winRate: number;
    roiPercent: number;
    netPnl: number;
  }>;
};

type RequestConfig = {
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
  paperBalance: number;
  candlesLimit: number;
  dryRun: boolean;
  testnet: boolean;
  marginType: "ISOLATED" | "CROSSED";
};

const intervalOptions = ["1m", "5m", "15m", "1h", "4h", "1d"];

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${formatNumber(Math.abs(value), 2)}`;
}

function formatDateTime(value: string | number | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatChartTime(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function FuturesTradingPanel() {
  const { user, error: authError } = useAuth();

  const [config, setConfig] = useState<RequestConfig>({
    symbol: "BTCUSDT",
    interval: "15m",
    leverage: 5,
    riskPerTrade: 0.01,
    fastEma: 21,
    slowEma: 55,
    rsiPeriod: 14,
    atrPeriod: 14,
    stopAtrMult: 1.5,
    tpAtrMult: 3,
    paperBalance: 1000,
    candlesLimit: 300,
    dryRun: true,
    testnet: true,
    marginType: "ISOLATED",
  });

  const [scheduler, setScheduler] = useState<SchedulerConfig | null>(null);

  const [runLoading, setRunLoading] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [schedulerSaving, setSchedulerSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [runData, setRunData] = useState<BotRunData | null>(null);
  const [backtestData, setBacktestData] = useState<BacktestData | null>(null);
  const [indicatorsData, setIndicatorsData] = useState<IndicatorsData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);

  const signalBadgeVariant = useMemo(() => {
    if (!runData?.signal) return "outline" as const;
    if (runData.signal.decision === "LONG") return "default" as const;
    if (runData.signal.decision === "SHORT") return "destructive" as const;
    return "outline" as const;
  }, [runData?.signal]);

  const chartData = useMemo(() => {
    return (indicatorsData?.points || []).map((point) => ({
      ...point,
      label: formatChartTime(point.closeTime),
    }));
  }, [indicatorsData?.points]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/trading/futures/history?limit=20", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: HistoryData }
        | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error || "No se pudo cargar historial.");
      }
      setHistoryData(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar historial.");
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const loadScheduler = useCallback(async () => {
    if (!user) return;
    setSchedulerLoading(true);
    try {
      const response = await fetch("/api/trading/futures/scheduler", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: SchedulerConfig }
        | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error || "No se pudo cargar scheduler.");
      }
      setScheduler(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar scheduler.");
    } finally {
      setSchedulerLoading(false);
    }
  }, [user]);

  const loadIndicators = useCallback(async () => {
    if (!user) return;
    setIndicatorsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trading/futures/indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          symbol: config.symbol,
          interval: config.interval,
          leverage: config.leverage,
          riskPerTrade: config.riskPerTrade,
          fastEma: config.fastEma,
          slowEma: config.slowEma,
          rsiPeriod: config.rsiPeriod,
          atrPeriod: config.atrPeriod,
          stopAtrMult: config.stopAtrMult,
          tpAtrMult: config.tpAtrMult,
          paperBalance: config.paperBalance,
          candlesLimit: config.candlesLimit,
          testnet: config.testnet,
          marginType: config.marginType,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: IndicatorsData }
        | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error || "No se pudieron cargar indicadores.");
      }
      setIndicatorsData(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar indicadores.");
    } finally {
      setIndicatorsLoading(false);
    }
  }, [config, user]);

  useEffect(() => {
    if (!user) {
      setRunData(null);
      setBacktestData(null);
      setIndicatorsData(null);
      setHistoryData(null);
      setScheduler(null);
      return;
    }

    void Promise.all([loadHistory(), loadScheduler(), loadIndicators()]);
  }, [loadHistory, loadIndicators, loadScheduler, user]);

  async function runBot() {
    if (!user) return;
    setRunLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trading/futures/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          symbol: config.symbol,
          interval: config.interval,
          leverage: config.leverage,
          riskPerTrade: config.riskPerTrade,
          fastEma: config.fastEma,
          slowEma: config.slowEma,
          rsiPeriod: config.rsiPeriod,
          atrPeriod: config.atrPeriod,
          stopAtrMult: config.stopAtrMult,
          tpAtrMult: config.tpAtrMult,
          paperBalance: config.paperBalance,
          dryRun: config.dryRun,
          testnet: config.testnet,
          marginType: config.marginType,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: BotRunData }
        | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error || "No se pudo ejecutar el bot.");
      }
      setRunData(payload.data);
      await Promise.all([loadHistory(), loadIndicators()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo ejecutar el bot.");
    } finally {
      setRunLoading(false);
    }
  }

  async function runBacktest() {
    if (!user) return;
    setBacktestLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trading/futures/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          symbol: config.symbol,
          interval: config.interval,
          leverage: config.leverage,
          riskPerTrade: config.riskPerTrade,
          fastEma: config.fastEma,
          slowEma: config.slowEma,
          rsiPeriod: config.rsiPeriod,
          atrPeriod: config.atrPeriod,
          stopAtrMult: config.stopAtrMult,
          tpAtrMult: config.tpAtrMult,
          paperBalance: config.paperBalance,
          candlesLimit: config.candlesLimit,
          testnet: config.testnet,
          marginType: config.marginType,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: BacktestData }
        | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error || "No se pudo ejecutar el backtesting.");
      }
      setBacktestData(payload.data);
      await Promise.all([loadHistory(), loadIndicators()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo ejecutar el backtesting.");
    } finally {
      setBacktestLoading(false);
    }
  }

  async function saveScheduler() {
    if (!user || !scheduler) return;
    setSchedulerSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/trading/futures/scheduler", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          enabled: scheduler.enabled,
          intervalMinutes: scheduler.intervalMinutes,
          runInDryMode: scheduler.runInDryMode,
          testnet: scheduler.testnet,
          symbol: scheduler.symbol || config.symbol,
          interval: scheduler.interval || config.interval,
          leverage: scheduler.leverage ?? config.leverage,
          riskPerTrade: scheduler.riskPerTrade ?? config.riskPerTrade,
          paperBalance: scheduler.paperBalance ?? config.paperBalance,
          marginType: scheduler.marginType,
          fastEma: scheduler.fastEma ?? config.fastEma,
          slowEma: scheduler.slowEma ?? config.slowEma,
          rsiPeriod: scheduler.rsiPeriod ?? config.rsiPeriod,
          atrPeriod: scheduler.atrPeriod ?? config.atrPeriod,
          stopAtrMult: scheduler.stopAtrMult ?? config.stopAtrMult,
          tpAtrMult: scheduler.tpAtrMult ?? config.tpAtrMult,
          candlesForBacktesting: scheduler.candlesForBacktesting,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: SchedulerConfig }
        | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error || "No se pudo guardar el scheduler.");
      }
      setScheduler(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar scheduler.");
    } finally {
      setSchedulerSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Trading de Futuros (Binance)</CardTitle>
          <CardDescription>
            Señales en tiempo real, backtesting histórico, scheduler automático y gráficas de indicadores EMA/RSI/ATR.
          </CardDescription>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="symbol">Símbolo</Label>
            <Input
              id="symbol"
              value={config.symbol}
              onChange={(event) => setConfig((prev) => ({ ...prev, symbol: event.target.value.toUpperCase() }))}
              placeholder="BTCUSDT"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Intervalo</Label>
            <Select value={config.interval} onValueChange={(value) => setConfig((prev) => ({ ...prev, interval: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Intervalo" />
              </SelectTrigger>
              <SelectContent>
                {intervalOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leverage">Leverage</Label>
            <Input
              id="leverage"
              type="number"
              min={1}
              step={1}
              value={config.leverage}
              onChange={(event) => setConfig((prev) => ({ ...prev, leverage: Number(event.target.value) || 1 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="risk">Riesgo por trade</Label>
            <Input
              id="risk"
              type="number"
              min={0.001}
              max={1}
              step={0.001}
              value={config.riskPerTrade}
              onChange={(event) => setConfig((prev) => ({ ...prev, riskPerTrade: Number(event.target.value) || 0.01 }))}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="fastEma">Fast EMA</Label>
            <Input
              id="fastEma"
              type="number"
              min={2}
              step={1}
              value={config.fastEma}
              onChange={(event) => setConfig((prev) => ({ ...prev, fastEma: Number(event.target.value) || 21 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slowEma">Slow EMA</Label>
            <Input
              id="slowEma"
              type="number"
              min={3}
              step={1}
              value={config.slowEma}
              onChange={(event) => setConfig((prev) => ({ ...prev, slowEma: Number(event.target.value) || 55 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rsiPeriod">RSI Period</Label>
            <Input
              id="rsiPeriod"
              type="number"
              min={2}
              step={1}
              value={config.rsiPeriod}
              onChange={(event) => setConfig((prev) => ({ ...prev, rsiPeriod: Number(event.target.value) || 14 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="atrPeriod">ATR Period</Label>
            <Input
              id="atrPeriod"
              type="number"
              min={2}
              step={1}
              value={config.atrPeriod}
              onChange={(event) => setConfig((prev) => ({ ...prev, atrPeriod: Number(event.target.value) || 14 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="candles">Velas</Label>
            <Input
              id="candles"
              type="number"
              min={120}
              max={1200}
              step={10}
              value={config.candlesLimit}
              onChange={(event) => setConfig((prev) => ({ ...prev, candlesLimit: Number(event.target.value) || 300 }))}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="stopAtr">Stop ATR</Label>
            <Input
              id="stopAtr"
              type="number"
              min={0.1}
              step={0.1}
              value={config.stopAtrMult}
              onChange={(event) => setConfig((prev) => ({ ...prev, stopAtrMult: Number(event.target.value) || 1.5 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpAtr">TP ATR</Label>
            <Input
              id="tpAtr"
              type="number"
              min={0.1}
              step={0.1}
              value={config.tpAtrMult}
              onChange={(event) => setConfig((prev) => ({ ...prev, tpAtrMult: Number(event.target.value) || 3 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paperBalance">Paper Balance</Label>
            <Input
              id="paperBalance"
              type="number"
              min={10}
              step={10}
              value={config.paperBalance}
              onChange={(event) => setConfig((prev) => ({ ...prev, paperBalance: Number(event.target.value) || 1000 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Margin</Label>
            <Select
              value={config.marginType}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, marginType: value as "ISOLATED" | "CROSSED" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Margin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ISOLATED">ISOLATED</SelectItem>
                <SelectItem value="CROSSED">CROSSED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modo</Label>
            <Select value={config.dryRun ? "dry" : "live"} onValueChange={(value) => setConfig((prev) => ({ ...prev, dryRun: value === "dry" }))}>
              <SelectTrigger>
                <SelectValue placeholder="Modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dry">Dry Run</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Red</Label>
            <Select value={config.testnet ? "testnet" : "mainnet"} onValueChange={(value) => setConfig((prev) => ({ ...prev, testnet: value === "testnet" }))}>
              <SelectTrigger>
                <SelectValue placeholder="Red" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="testnet">Testnet</SelectItem>
                <SelectItem value="mainnet">Mainnet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end min-w-0">
            <Button className="w-full min-w-0" onClick={() => void runBot()} disabled={!user || runLoading || backtestLoading || indicatorsLoading}>
              {runLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Ejecutar Run
            </Button>
          </div>
          <div className="flex items-end min-w-0">
            <Button variant="outline" className="w-full min-w-0" onClick={() => void runBacktest()} disabled={!user || runLoading || backtestLoading || indicatorsLoading}>
              {backtestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Backtest
            </Button>
          </div>
          <div className="flex items-end min-w-0">
            <Button variant="outline" className="w-full min-w-0" onClick={() => void loadIndicators()} disabled={!user || runLoading || backtestLoading || indicatorsLoading}>
              {indicatorsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Indicadores
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!user ? <p className="text-sm text-muted-foreground">Inicia sesión para usar el módulo de trading.</p> : null}

        {runData ? (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Resultado Run</p>
              <Badge variant={signalBadgeVariant}>{runData.signal.decision}</Badge>
              <Badge variant="outline">{runData.config.network}</Badge>
              <Badge variant="outline">{runData.config.dryRun ? "DRY_RUN" : "LIVE"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{runData.message}</p>
          </div>
        ) : null}

        {backtestData ? (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Trades</p>
              <p className="mt-1 text-xl font-semibold">{backtestData.metrics.trades}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Win Rate</p>
              <p className="mt-1 text-xl font-semibold">{formatNumber(backtestData.metrics.winRate, 2)}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net PnL</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(backtestData.metrics.netPnl)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Max Drawdown</p>
              <p className="mt-1 text-xl font-semibold">{formatNumber(backtestData.metrics.maxDrawdownPercent, 2)}%</p>
            </div>
          </div>
        ) : null}

        {indicatorsData ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Gráfica de Indicadores</p>
              <Badge variant="outline">
                {indicatorsData.config.symbol} {indicatorsData.config.interval}
              </Badge>
              <Badge variant="outline">{indicatorsData.config.candles} velas</Badge>
              <Badge variant={indicatorsData.latest.decision === "SHORT" ? "destructive" : indicatorsData.latest.decision === "LONG" ? "default" : "outline"}>
                Señal: {indicatorsData.latest.decision}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Close</p>
                <p className="text-lg font-semibold">{formatNumber(indicatorsData.latest.close, 2)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">EMA Fast / Slow</p>
                <p className="text-lg font-semibold">
                  {formatNumber(indicatorsData.latest.fastEma, 2)} / {formatNumber(indicatorsData.latest.slowEma, 2)}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">RSI</p>
                <p className="text-lg font-semibold">{formatNumber(indicatorsData.latest.rsi, 2)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">ATR</p>
                <p className="text-lg font-semibold">{formatNumber(indicatorsData.latest.atr, 2)}</p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm text-muted-foreground">Precio + EMA</p>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" minTickGap={30} />
                    <YAxis domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="close" stroke="#2563eb" dot={false} strokeWidth={1.7} name="Close" />
                    <Line type="monotone" dataKey="fastEma" stroke="#16a34a" dot={false} strokeWidth={1.5} name="EMA Fast" />
                    <Line type="monotone" dataKey="slowEma" stroke="#f97316" dot={false} strokeWidth={1.5} name="EMA Slow" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm text-muted-foreground">RSI</p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" minTickGap={30} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="6 6" />
                    <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="6 6" />
                    <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" dot={false} strokeWidth={1.6} name="RSI" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm text-muted-foreground">ATR</p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" minTickGap={30} />
                    <YAxis domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="atr" stroke="#0ea5e9" dot={false} strokeWidth={1.6} name="ATR" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Scheduler automático</p>
              <p className="text-xs text-muted-foreground">Ejecuta run en background cada X minutos y guarda historial.</p>
            </div>
            <Button variant="outline" onClick={() => void saveScheduler()} disabled={!scheduler || schedulerSaving || schedulerLoading || !user}>
              {schedulerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar scheduler
            </Button>
          </div>
          {schedulerLoading ? <p className="text-sm text-muted-foreground">Cargando scheduler...</p> : null}
          {scheduler ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={scheduler.enabled ? "enabled" : "disabled"}
                  onValueChange={(value) => setScheduler((prev) => (prev ? { ...prev, enabled: value === "enabled" } : prev))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intervalMinutes">Cada (min)</Label>
                <Input
                  id="intervalMinutes"
                  type="number"
                  min={1}
                  max={720}
                  value={scheduler.intervalMinutes}
                  onChange={(event) => setScheduler((prev) => (prev ? { ...prev, intervalMinutes: Number(event.target.value) || 15 } : prev))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modo scheduler</Label>
                <Select
                  value={scheduler.runInDryMode ? "dry" : "live"}
                  onValueChange={(value) => setScheduler((prev) => (prev ? { ...prev, runInDryMode: value === "dry" } : prev))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dry">Dry Run</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Red scheduler</Label>
                <Select
                  value={scheduler.testnet ? "testnet" : "mainnet"}
                  onValueChange={(value) => setScheduler((prev) => (prev ? { ...prev, testnet: value === "testnet" } : prev))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testnet">Testnet</SelectItem>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          {scheduler ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Último intento</p>
                <p className="text-sm font-medium">{formatDateTime(scheduler.ultimoIntentoEn)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Última ejecución</p>
                <p className="text-sm font-medium">{formatDateTime(scheduler.ultimaEjecucionEn)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                <p className="text-sm font-medium">
                  {scheduler.ultimoEstado || "-"} {scheduler.ultimaDecision ? `| ${scheduler.ultimaDecision}` : ""}
                </p>
              </div>
            </div>
          ) : null}
          {scheduler?.ultimoError ? <p className="text-xs text-destructive">{scheduler.ultimoError}</p> : null}
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Historial guardado (Prisma)</p>
            <Button variant="outline" onClick={() => void loadHistory()} disabled={!user || historyLoading}>
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Actualizar
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm text-muted-foreground">Runs</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Src</TableHead>
                    <TableHead>Decisión</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historyData?.runs || []).length > 0 ? (
                    (historyData?.runs || []).slice(0, 10).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDateTime(row.creadoEn)}</TableCell>
                        <TableCell>{row.source}</TableCell>
                        <TableCell>{row.decision}</TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Sin datos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm text-muted-foreground">Backtests</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>WinRate</TableHead>
                    <TableHead>ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historyData?.backtests || []).length > 0 ? (
                    (historyData?.backtests || []).slice(0, 10).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDateTime(row.creadoEn)}</TableCell>
                        <TableCell>{row.trades}</TableCell>
                        <TableCell>{formatNumber(row.winRate, 2)}%</TableCell>
                        <TableCell>{formatNumber(row.roiPercent, 2)}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Sin datos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
