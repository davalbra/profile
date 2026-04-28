<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const route = useRoute();
</script>

<template>
  <section class="space-y-6">
    <header class="panel-shell p-6">
      <p class="text-sm uppercase tracking-[0.2em] text-[#5faaf3]">Optimización</p>
      <h1 class="mt-2 text-3xl font-bold text-white">Detalle de imagen</h1>
      <p class="mt-2 text-sm text-slate-400">
        Ruta preparada en Nuxt para el detalle de optimización. Slug actual: <strong>{{ route.params.slug }}</strong>
      </p>
    </header>
  </section>
</template>
