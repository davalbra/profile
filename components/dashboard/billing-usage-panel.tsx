"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {Area, AreaChart, CartesianGrid, XAxis} from "recharts";
import {Loader2, RefreshCcw} from "lucide-react";
import {useAuth} from "@/components/providers/auth-provider";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig} from "@/components/ui/chart";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import type {BillingPeriodKey, BillingServiceKey, BillingUsageData} from "@/lib/billing/types";

type BillingUsagePanelProps = {
    service: BillingServiceKey;
    title: string;
    description: string;
};

const PERIOD_OPTIONS: Array<{ value: BillingPeriodKey; label: string }> = [
    {value: "7d", label: "Últimos 7 días"},
    {value: "30d", label: "Últimos 30 días"},
    {value: "90d", label: "Últimos 90 días"},
];

const chartConfig = {
    cost: {
        label: "Costo",
        color: "var(--primary)",
    },
} satisfies ChartConfig;

function formatDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return new Intl.DateTimeFormat("es-CO", {
        month: "short",
        day: "numeric",
    }).format(parsed);
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: 2,
    }).format(value);
}

function formatCurrency(value: number, currencyCode: string): string {
    try {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: currencyCode || "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currencyCode || "USD"}`;
    }
}

export function BillingUsagePanel({service, title, description}: BillingUsagePanelProps) {
    const {user, error: authError} = useAuth();
    const [period, setPeriod] = useState<BillingPeriodKey>("30d");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<BillingUsageData | null>(null);

    const loadData = useCallback(
        async (selectedPeriod: BillingPeriodKey) => {
            if (!user) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/billing/usage?service=${service}&period=${selectedPeriod}`, {
                    method: "GET",
                    cache: "no-store",
                });
                const payload = (await response.json().catch(() => null)) as
                    | { error?: string; data?: BillingUsageData }
                    | null;

                if (!response.ok) {
                    throw new Error(payload?.error || "No se pudo obtener el costo por uso.");
                }

                setData(payload?.data || null);
            } catch (reason) {
                const message = reason instanceof Error ? reason.message : "No se pudo obtener el costo por uso.";
                setError(message);
            } finally {
                setLoading(false);
            }
        },
        [service, user],
    );

    useEffect(() => {
        if (!user) {
            setData(null);
            setLoading(false);
            setError(null);
            return;
        }

        void loadData(period);
    }, [loadData, period, user]);

    const trendPercent = useMemo(() => {
        if (!data || data.daily.length < 2) {
            return null;
        }

        const splitPoint = Math.max(1, Math.floor(data.daily.length / 2));
        const firstHalf = data.daily.slice(0, splitPoint).reduce((sum, item) => sum + item.cost, 0);
        const secondHalf = data.daily.slice(splitPoint).reduce((sum, item) => sum + item.cost, 0);
        if (firstHalf <= 0) {
            return secondHalf > 0 ? 100 : 0;
        }

        return ((secondHalf - firstHalf) / firstHalf) * 100;
    }, [data]);

    return (
        <Card>
            <CardHeader className="space-y-4">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={period} onValueChange={(value) => setPeriod(value as BillingPeriodKey)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Selecciona periodo"/>
                        </SelectTrigger>
                        <SelectContent>
                            {PERIOD_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => void loadData(period)} disabled={loading || !user}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCcw className="h-4 w-4"/>}
                        Actualizar
                    </Button>
                    {data?.warning ? <Badge variant="outline">{data.warning}</Badge> : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {!user ? <p className="text-sm text-muted-foreground">Inicia sesión para consultar costos.</p> : null}

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Costo total</p>
                        <p className="mt-1 text-xl font-semibold">
                            {formatCurrency(data?.totalCost || 0, data?.currency || "USD")}
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Promedio diario</p>
                        <p className="mt-1 text-xl font-semibold">
                            {formatCurrency(data?.averageDailyCost || 0, data?.currency || "USD")}
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tendencia</p>
                        <p className="mt-1 text-xl font-semibold">
                            {trendPercent === null
                                ? "-"
                                : `${trendPercent >= 0 ? "+" : ""}${formatNumber(trendPercent)}%`}
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="mb-3 text-sm text-muted-foreground">Costo diario</p>
                    <ChartContainer config={chartConfig} className="h-[260px] w-full">
                        <AreaChart data={data?.daily || []}>
                            <defs>
                                <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false}/>
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                minTickGap={28}
                                tickFormatter={(value) => formatDate(String(value))}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) => formatDate(String(value))}
                                        formatter={(value) => formatCurrency(Number(value), data?.currency || "USD")}
                                        indicator="dot"
                                    />
                                }
                            />
                            <Area dataKey="cost" type="monotone" fill="url(#fillCost)" stroke="var(--color-cost)"/>
                        </AreaChart>
                    </ChartContainer>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="mb-3 text-sm text-muted-foreground">Top SKUs por costo</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Servicio</TableHead>
                                <TableHead className="text-right">Uso</TableHead>
                                <TableHead className="text-right">Costo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(data?.skuBreakdown || []).length > 0 ? (
                                (data?.skuBreakdown || []).map((item) => (
                                    <TableRow key={`${item.serviceName}-${item.skuName}-${item.usageUnit || "-"}`}>
                                        <TableCell className="max-w-[360px] truncate" title={item.skuName}>
                                            {item.skuName}
                                        </TableCell>
                                        <TableCell className="max-w-[220px] truncate" title={item.serviceName}>
                                            {item.serviceName}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatNumber(item.usageAmount)} {item.usageUnit || ""}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(item.cost, data?.currency || "USD")}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        Sin registros para este periodo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {data?.usageTotals?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {data.usageTotals.map((item) => (
                            <Badge key={item.unit} variant="secondary">
                                {item.unit}: {formatNumber(item.amount)}
                            </Badge>
                        ))}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
