<script setup lang="ts">
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
  service.value === "firebase" ? "Costos por uso: Firebase" : "Costos por uso: Google Gemini API",
);

const description = computed(() =>
  service.value === "firebase"
    ? "Visualiza consumo y costo diario de servicios Firebase a partir del export de Cloud Billing."
    : "Visualiza consumo y costo diario de Gemini / Generative Language / Vertex AI desde Cloud Billing.",
);

const period = ref<BillingPeriodKey>("30d");
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
    const response = await $fetch<{ ok: true; data: BillingUsageData }>("/api/billing/usage", {
      query: {
        service: service.value as BillingServiceKey,
        period: period.value,
      },
    });

    data.value = response.data;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "No se pudo obtener el billing.";
  } finally {
    loading.value = false;
  }
};

watch([service, period, isAuthenticated], () => {
  void loadData();
}, { immediate: true });
</script>

<template>
  <section class="space-y-6">
    <header class="panel-shell p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.2em] text-[#5faaf3]">Billing</p>
          <h1 class="mt-2 text-3xl font-bold text-white">{{ title }}</h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{{ description }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLink
            to="/dashboard/billing/firebase"
            class="rounded-2xl border px-3 py-2 text-sm transition"
            :class="service === 'firebase' ? 'border-[#137fec]/50 bg-[#137fec]/10 text-white' : 'border-white/10 text-slate-300'"
          >
            Firebase
          </NuxtLink>
          <NuxtLink
            to="/dashboard/billing/gemini"
            class="rounded-2xl border px-3 py-2 text-sm transition"
            :class="service === 'gemini' ? 'border-[#137fec]/50 bg-[#137fec]/10 text-white' : 'border-white/10 text-slate-300'"
          >
            Gemini
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="option in ['7d', '30d', '90d']"
        :key="option"
        type="button"
        class="rounded-2xl border px-3 py-2 text-sm transition"
        :class="period === option ? 'border-[#137fec]/50 bg-[#137fec]/10 text-white' : 'border-white/10 text-slate-300'"
        @click="period = option as BillingPeriodKey"
      >
        {{ option }}
      </button>
    </div>

    <p v-if="!isAuthenticated" class="panel-shell p-4 text-sm text-slate-300">
      Inicia sesión con un usuario autorizado para consultar costos.
    </p>
    <p v-else-if="error" class="panel-shell border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
      {{ error }}
    </p>

    <div class="grid gap-4 md:grid-cols-3">
      <article class="panel-shell p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Costo total</p>
        <p class="mt-2 text-2xl font-semibold text-white">
          {{ formatCurrency(data?.totalCost || 0, data?.currency || 'USD') }}
        </p>
      </article>
      <article class="panel-shell p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Promedio diario</p>
        <p class="mt-2 text-2xl font-semibold text-white">
          {{ formatCurrency(data?.averageDailyCost || 0, data?.currency || 'USD') }}
        </p>
      </article>
      <article class="panel-shell p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Estado</p>
        <p class="mt-2 text-2xl font-semibold text-white">
          {{ loading ? 'Cargando...' : data?.warning || 'OK' }}
        </p>
      </article>
    </div>

    <section class="panel-shell p-6">
      <h2 class="text-lg font-semibold text-white">Top SKUs por costo</h2>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-slate-400">
            <tr class="border-b border-white/10">
              <th class="px-3 py-2">SKU</th>
              <th class="px-3 py-2">Servicio</th>
              <th class="px-3 py-2 text-right">Uso</th>
              <th class="px-3 py-2 text-right">Costo</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in data?.skuBreakdown || []"
              :key="`${item.serviceName}-${item.skuName}-${item.usageUnit || '-'}`"
              class="border-b border-white/5 text-slate-200"
            >
              <td class="px-3 py-2">{{ item.skuName }}</td>
              <td class="px-3 py-2">{{ item.serviceName }}</td>
              <td class="px-3 py-2 text-right">{{ formatNumber(item.usageAmount) }} {{ item.usageUnit || '' }}</td>
              <td class="px-3 py-2 text-right">{{ formatCurrency(item.cost, data?.currency || 'USD') }}</td>
            </tr>
            <tr v-if="!loading && !(data?.skuBreakdown || []).length">
              <td colspan="4" class="px-3 py-6 text-center text-slate-400">Sin registros para este periodo.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="data?.usageTotals?.length" class="panel-shell p-6">
      <h2 class="text-lg font-semibold text-white">Totales por unidad</h2>
      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="item in data.usageTotals"
          :key="item.unit"
          class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200"
        >
          {{ item.unit }}: {{ formatNumber(item.amount) }}
        </span>
      </div>
    </section>
  </section>
</template>
