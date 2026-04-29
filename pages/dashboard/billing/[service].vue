<script setup lang="ts">
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
} from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

definePageMeta({
  layout: "dashboard",
});

type BillingPeriodKey = "7d" | "30d" | "90d";
type BillingServiceKey = "firebase" | "gemini";

type BillingUsageData = {
  currency: string;
  totalCost: number;
  averageDailyCost: number;
  daily: Array<{ date: string; cost: number }>;
  skuBreakdown: Array<{
    serviceName: string;
    skuName: string;
    usageUnit: string | null;
    usageAmount: number;
    cost: number;
  }>;
  usageTotals: Array<{ unit: string; amount: number }>;
  warning: string | null;
};

const route = useRoute();
const { isAuthenticated } = useAuth();

const service = computed(() => {
  const raw = route.params.service;
  return raw === "gemini" ? "gemini" : "firebase";
});

const title = computed(() =>
  service.value === "firebase"
    ? "Costos por uso: Firebase"
    : "Costos por uso: Google Gemini API",
);

const description = computed(() =>
  service.value === "firebase"
    ? "Visualiza consumo y costo diario de servicios Firebase a partir del export de Cloud Billing."
    : "Visualiza consumo y costo diario de Gemini / Generative Language / Vertex AI desde Cloud Billing.",
);

const period = ref<BillingPeriodKey>("30d");
const periodOptions = ["7d", "30d", "90d"] as const;
const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<BillingUsageData | null>(null);

const formatCurrency = (value: number, currencyCode: string) => {
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
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);

const loadData = async () => {
  if (!isAuthenticated.value) {
    data.value = null;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await $fetch<{ ok: true; data: BillingUsageData }>(
      "/api/billing/usage",
      {
        query: {
          service: service.value as BillingServiceKey,
          period: period.value,
        },
      },
    );

    data.value = response.data;
  } catch (reason) {
    error.value =
      reason instanceof Error
        ? reason.message
        : "No se pudo obtener el billing.";
  } finally {
    loading.value = false;
  }
};

watch(
  [service, period, isAuthenticated],
  () => {
    void loadData();
  },
  { immediate: true },
);
</script>

<template>
  <section class="space-y-6">
    <Card
      class="border-white/10 bg-card/80 shadow-xl shadow-cyan-950/10 backdrop-blur-xl"
    >
      <CardHeader class="gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge
              variant="outline"
              class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
            >
              <BarChart3 class="size-3" />
              Billing
            </Badge>
            <CardTitle
              class="mt-3 text-3xl font-bold tracking-tight lg:text-4xl"
            >
              {{ title }}
            </CardTitle>
            <CardDescription class="mt-2 max-w-3xl text-sm leading-relaxed">
              {{ description }}
            </CardDescription>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              as-child
              :variant="service === 'firebase' ? 'default' : 'outline'"
              class="rounded-xl"
            >
              <NuxtLink to="/dashboard/billing/firebase">Firebase</NuxtLink>
            </Button>
            <Button
              as-child
              :variant="service === 'gemini' ? 'default' : 'outline'"
              class="rounded-xl"
            >
              <NuxtLink to="/dashboard/billing/gemini">Gemini</NuxtLink>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>

    <div class="flex flex-wrap gap-2">
      <Button
        v-for="option in periodOptions"
        :key="option"
        type="button"
        :variant="period === option ? 'default' : 'outline'"
        class="rounded-xl"
        @click="period = option"
      >
        {{ option }}
      </Button>
    </div>

    <Alert v-if="!isAuthenticated" class="border-amber-300/20 bg-amber-300/10">
      <AlertCircle class="size-4" />
      <AlertTitle>Sesión requerida</AlertTitle>
      <AlertDescription>
        Inicia sesión con un usuario autorizado para consultar costos.
      </AlertDescription>
    </Alert>
    <Alert v-else-if="error" variant="destructive">
      <AlertCircle class="size-4" />
      <AlertTitle>No se pudo cargar billing</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div class="grid gap-4 md:grid-cols-3">
      <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardDescription>Costo total</CardDescription>
          <CardTitle class="text-2xl">
            {{ formatCurrency(data?.totalCost || 0, data?.currency || "USD") }}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardDescription>Promedio diario</CardDescription>
          <CardTitle class="text-2xl">
            {{
              formatCurrency(
                data?.averageDailyCost || 0,
                data?.currency || "USD",
              )
            }}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardDescription>Estado</CardDescription>
          <CardTitle class="flex items-center gap-2 text-2xl">
            <RefreshCw
              v-if="loading"
              class="size-5 animate-spin text-cyan-300"
            />
            <CheckCircle2 v-else class="size-5 text-emerald-300" />
            {{ loading ? "Cargando..." : data?.warning || "OK" }}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>

    <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Top SKUs por costo</CardTitle>
        <CardDescription
          >Detalle del consumo del periodo seleccionado.</CardDescription
        >
      </CardHeader>
      <CardContent>
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
              <TableCell class="max-w-[360px] whitespace-normal font-medium">{{
                item.skuName
              }}</TableCell>
              <TableCell>{{ item.serviceName }}</TableCell>
              <TableCell class="text-right"
                >{{ formatNumber(item.usageAmount) }}
                {{ item.usageUnit || "" }}</TableCell
              >
              <TableCell class="text-right font-medium">{{
                formatCurrency(item.cost, data?.currency || "USD")
              }}</TableCell>
            </TableRow>
            <TableEmpty
              v-if="!loading && !(data?.skuBreakdown || []).length"
              :colspan="4"
            >
              Sin registros para este periodo.
            </TableEmpty>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card
      v-if="data?.usageTotals?.length"
      class="border-white/10 bg-card/80 backdrop-blur-xl"
    >
      <CardHeader>
        <CardTitle>Totales por unidad</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Badge
          v-for="item in data.usageTotals"
          :key="item.unit"
          variant="secondary"
          class="px-3 py-1 text-sm"
        >
          {{ item.unit }}: {{ formatNumber(item.amount) }}
        </Badge>
      </CardContent>
    </Card>
  </section>
</template>
