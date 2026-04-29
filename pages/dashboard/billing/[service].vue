<script setup lang="ts">
import type { BillingServiceKey } from "@/lib/billing/types";
import { Button } from "@/components/ui/button";

definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const service = computed<BillingServiceKey>(() => {
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
    ? "Visualiza el consumo de tus servicios Firebase basado en export de Cloud Billing a BigQuery."
    : "Visualiza consumo y costo de Gemini API desde Cloud Billing, incluyendo SKUs detectados como Gemini, Generative Language o Vertex AI.",
);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap justify-end gap-2">
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

    <DashboardBillingUsagePanel
      :service="service"
      :title="title"
      :description="description"
    />
  </section>
</template>
