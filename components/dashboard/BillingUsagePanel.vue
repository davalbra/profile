<script setup lang="ts">
import { AlertCircle, Loader2, RefreshCcw, TrendingDown, TrendingUp } from "lucide-vue-next";
import type { BillingPeriodKey, BillingServiceKey, BillingUsageData } from "@/lib/billing/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const props = defineProps<{
  service: BillingServiceKey;
  title: string;
  description: string;
}>();

const PERIOD_OPTIONS: Array<{ value: BillingPeriodKey; label: string }> = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
];

type ChartPoint = {
  date: string;
  cost: number;
  x: number;
  y: number;
};

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;

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

function getErrorMessage(reason: unknown): string {
  if (typeof reason === "object" && reason && "data" in reason) {
    const data = (reason as { data?: { statusMessage?: string; message?: string } }).data;
    if (data?.statusMessage || data?.message) {
      return data.statusMessage || data.message || "No se pudo obtener el costo por uso.";
    }
  }

  return reason instanceof Error ? reason.message : "No se pudo obtener el costo por uso.";
}

const { user, error: authError } = useAuth();
const period = ref<BillingPeriodKey>("30d");
const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<BillingUsageData | null>(null);

const trendPercent = computed(() => {
  if (!data.value || data.value.daily.length < 2) return null;

  const splitPoint = Math.max(1, Math.floor(data.value.daily.length / 2));
  const firstHalf = data.value.daily.slice(0, splitPoint).reduce((sum, item) => sum + item.cost, 0);
  const secondHalf = data.value.daily.slice(splitPoint).reduce((sum, item) => sum + item.cost, 0);
  if (firstHalf <= 0) return secondHalf > 0 ? 100 : 0;

  return ((secondHalf - firstHalf) / firstHalf) * 100;
});

const trendLabel = computed(() => {
  if (trendPercent.value === null) return "-";
  return `${trendPercent.value >= 0 ? "+" : ""}${formatNumber(trendPercent.value)}%`;
});

const chartPoints = computed<ChartPoint[]>(() => {
  const daily = data.value?.daily || [];
  if (!daily.length) return [];

  const maxCost = Math.max(...daily.map((item) => item.cost), 0);
  const denominator = maxCost > 0 ? maxCost : 1;
  const width = 100;
  const height = 40;
  const topPadding = 3;
  const bottomPadding = 5;
  const usableHeight = height - topPadding - bottomPadding;

  return daily.map((item, index) => ({
    ...item,
    x: daily.length === 1 ? width / 2 : (index / (daily.length - 1)) * width,
    y: topPadding + usableHeight - (item.cost / denominator) * usableHeight,
  }));
});

const linePoints = computed(() => chartPoints.value.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "));
const areaPoints = computed(() => {
  if (!chartPoints.value.length) return "";
  const line = chartPoints.value.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  return `0,40 ${line} 100,40`;
});

const firstChartDate = computed(() => data.value?.daily[0]?.date || null);
const lastChartDate = computed(() => data.value?.daily[data.value.daily.length - 1]?.date || null);

async function loadData(selectedPeriod = period.value) {
  if (!user.value) {
    data.value = null;
    loading.value = false;
    error.value = null;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await $fetch<{ ok: true; data: BillingUsageData }>("/api/billing/usage", {
      method: "GET",
      query: {
        service: props.service,
        period: selectedPeriod,
      },
    });

    data.value = response.data;
  } catch (reason) {
    error.value = getErrorMessage(reason);
  } finally {
    loading.value = false;
  }
}

watch(
  [() => props.service, period, user],
  () => {
    void loadData();
  },
  { immediate: true },
);
</script>

<template>
  <Card>
    <CardHeader class="space-y-4">
      <div>
        <CardTitle>{{ title }}</CardTitle>
        <CardDescription>{{ description }}</CardDescription>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NativeSelect v-model="period" class="w-[220px]">
          <NativeSelectOption
            v-for="option in PERIOD_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </NativeSelectOption>
        </NativeSelect>

        <Button variant="outline" :disabled="loading || !user" @click="loadData(period)">
          <Loader2 v-if="loading" class="size-4 animate-spin" />
          <RefreshCcw v-else class="size-4" />
          Actualizar
        </Button>

        <Badge v-if="data?.warning" variant="outline">{{ data.warning }}</Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <Alert v-if="authError" variant="destructive">
        <AlertCircle class="size-4" />
        <AlertTitle>Error de autenticación</AlertTitle>
        <AlertDescription>{{ authError }}</AlertDescription>
      </Alert>

      <Alert v-if="error" variant="destructive">
        <AlertCircle class="size-4" />
        <AlertTitle>No se pudo cargar billing</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <Alert v-if="!user" class="border-amber-300/20 bg-amber-300/10">
        <AlertCircle class="size-4" />
        <AlertTitle>Sesión requerida</AlertTitle>
        <AlertDescription>Inicia sesión para consultar costos.</AlertDescription>
      </Alert>

      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-lg border p-4">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Costo total</p>
          <p class="mt-1 text-xl font-semibold">
            {{ formatCurrency(data?.totalCost || 0, data?.currency || "USD") }}
          </p>
        </div>
        <div class="rounded-lg border p-4">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Promedio diario</p>
          <p class="mt-1 text-xl font-semibold">
            {{ formatCurrency(data?.averageDailyCost || 0, data?.currency || "USD") }}
          </p>
        </div>
        <div class="rounded-lg border p-4">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Tendencia</p>
          <p class="mt-1 flex items-center gap-2 text-xl font-semibold">
            <TrendingUp v-if="trendPercent !== null && trendPercent >= 0" class="size-5 text-amber-500" />
            <TrendingDown v-else-if="trendPercent !== null" class="size-5 text-emerald-500" />
            {{ trendLabel }}
          </p>
        </div>
      </div>

      <div class="rounded-lg border p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm text-muted-foreground">Costo diario</p>
          <p v-if="firstChartDate && lastChartDate" class="text-xs text-muted-foreground">
            {{ formatDate(firstChartDate) }} - {{ formatDate(lastChartDate) }}
          </p>
        </div>

        <div v-if="chartPoints.length" class="h-[260px] w-full">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="size-full overflow-visible rounded-md">
            <defs>
              <linearGradient id="billing-cost-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stop-color="var(--primary)" stop-opacity="0.5" />
                <stop offset="95%" stop-color="var(--primary)" stop-opacity="0.05" />
              </linearGradient>
            </defs>
            <line x1="0" y1="35" x2="100" y2="35" class="stroke-muted" stroke-width="0.4" />
            <line x1="0" y1="22" x2="100" y2="22" class="stroke-muted" stroke-width="0.25" stroke-dasharray="1 1" />
            <line x1="0" y1="9" x2="100" y2="9" class="stroke-muted" stroke-width="0.25" stroke-dasharray="1 1" />
            <polygon :points="areaPoints" fill="url(#billing-cost-fill)" />
            <polyline :points="linePoints" fill="none" class="stroke-primary" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div v-else class="flex h-[260px] items-center justify-center rounded-md bg-muted/30 text-sm text-muted-foreground">
          Sin datos diarios para este periodo.
        </div>
      </div>

      <div class="rounded-lg border p-4">
        <p class="mb-3 text-sm text-muted-foreground">Top SKUs por costo</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead class="text-right">Uso</TableHead>
              <TableHead class="text-right">Costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="item in data?.skuBreakdown || []"
              :key="`${item.serviceName}-${item.skuName}-${item.usageUnit || '-'}`"
            >
              <TableCell class="max-w-[360px] whitespace-normal font-medium">{{ item.skuName }}</TableCell>
              <TableCell class="max-w-[220px] whitespace-normal">{{ item.serviceName }}</TableCell>
              <TableCell class="text-right">
                {{ formatNumber(item.usageAmount) }} {{ item.usageUnit || "" }}
              </TableCell>
              <TableCell class="text-right font-medium">
                {{ formatCurrency(item.cost, data?.currency || "USD") }}
              </TableCell>
            </TableRow>
            <TableEmpty v-if="!loading && !(data?.skuBreakdown || []).length" :colspan="4">
              Sin registros para este periodo.
            </TableEmpty>
          </TableBody>
        </Table>
      </div>

      <div v-if="data?.usageTotals?.length" class="flex flex-wrap gap-2">
        <Badge v-for="item in data.usageTotals" :key="item.unit" variant="secondary">
          {{ item.unit }}: {{ formatNumber(item.amount) }}
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>
