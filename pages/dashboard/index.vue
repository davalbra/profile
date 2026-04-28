<script setup lang="ts">
import { ImageIcon, Music4, Sparkles, Wallet } from "lucide-vue-next";

definePageMeta({
  layout: "dashboard",
});

const modules = [
  {
    title: "Billing",
    description: "Consulta costos reales de Firebase y Gemini desde Cloud Billing exportado a BigQuery.",
    to: "/dashboard/billing/firebase",
    icon: Wallet,
  },
  {
    title: "MCP",
    description: "Documentación operativa del endpoint `/api/mcp` y herramientas disponibles.",
    to: "/dashboard/mcp/optimize",
    icon: Sparkles,
  },
  {
    title: "Imágenes",
    description: "Base de migración creada para portar galería, optimización y flujo de copias.",
    to: "/dashboard/images/gallery",
    icon: ImageIcon,
  },
  {
    title: "Milka",
    description: "Suite de audio/lyrics pendiente de portar visualmente sobre la nueva base Nuxt.",
    to: "/dashboard/milka/musica",
    icon: Music4,
  },
];
</script>

<template>
  <section class="space-y-6">
    <header class="panel-shell p-6">
      <p class="text-sm uppercase tracking-[0.2em] text-[#5faaf3]">Dashboard</p>
      <h1 class="mt-2 text-3xl font-bold text-white">Base Nuxt activa</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
        El proyecto ya corre sobre Nuxt 4, Vue 3, Tailwind 4 y la configuración de runtime alineada con
        `lavepresto-nuxt`. Desde aquí continúas el porting visual módulo por módulo sin tocar la base.
      </p>
    </header>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="module in modules"
        :key="module.to"
        :to="module.to"
        class="panel-shell group p-5 transition hover:-translate-y-1 hover:border-[#137fec]/35"
      >
        <component :is="module.icon" class="h-5 w-5 text-[#5faaf3]" />
        <h2 class="mt-4 text-lg font-semibold text-white">{{ module.title }}</h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">{{ module.description }}</p>
      </NuxtLink>
    </div>
  </section>
</template>
