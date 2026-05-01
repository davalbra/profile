<script setup lang="ts">
import type { BillingServiceKey } from "@/lib/billing/types"

/** Services, Components */
const route = useRoute()

/** DefineModel, Ref, Computed */
const service = computed<BillingServiceKey>(() => {
  const raw = route.params.service
  return raw === "gemini" ? "gemini" : "firebase"
})

const title = computed(() =>
  service.value === "firebase"
    ? "Costos por uso: Firebase"
    : "Costos por uso: Google Gemini API",
)

const description = computed(() =>
  service.value === "firebase"
    ? "Visualiza el consumo de tus servicios Firebase basado en export de Cloud Billing a BigQuery."
    : "Visualiza consumo y costo de Gemini API desde Cloud Billing, incluyendo SKUs detectados como Gemini, Generative Language o Vertex AI.",
)

/** Vue */
definePageMeta({
  layout: "dashboard",
})
</script>

<template>
  <section class="space-y-6">
    <DashboardBillingUsagePanel
      :service="service"
      :title="title"
      :description="description"
    />
  </section>
</template>
