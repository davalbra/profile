<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const currentView = computed(() => {
  const raw = Array.isArray(route.params.view) ? route.params.view[0] : route.params.view;
  return raw === "cookies"
    ? {
        title: "Milka: limpieza de cookies",
        description: "Base Nuxt lista para volver a montar utilidades de sesión/cookies del flujo privado.",
      }
    : {
        title: "Milka: música y lyrics",
        description: "Base Nuxt lista para portar paneles de audio, letras y sincronización.",
      };
});
</script>

<template>
  <section class="space-y-6">
    <header class="panel-shell p-6">
      <p class="text-sm uppercase tracking-[0.2em] text-[#5faaf3]">Milka</p>
      <h1 class="mt-2 text-3xl font-bold text-white">{{ currentView.title }}</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{{ currentView.description }}</p>
    </header>
  </section>
</template>
