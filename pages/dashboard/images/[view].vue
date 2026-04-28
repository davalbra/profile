<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const copyByView = {
  gallery: {
    title: "Galería de imágenes",
    description: "La base Nuxt ya está lista para portar la subida, rename y administración visual de la galería.",
  },
  copies: {
    title: "Copias con n8n",
    description: "Esta vista quedó preparada para reconectar el flujo de copias y la respuesta visual del webhook.",
  },
  optimize: {
    title: "Optimización AVIF",
    description: "La lógica backend de optimización puede migrarse encima de esta base sin mantener Next como runtime.",
  },
} as const;

const currentView = computed(() => {
  const raw = Array.isArray(route.params.view) ? route.params.view[0] : route.params.view;
  if (raw === "copies") return copyByView.copies;
  if (raw === "optimize") return copyByView.optimize;
  return copyByView.gallery;
});
</script>

<template>
  <section class="space-y-6">
    <header class="panel-shell p-6">
      <p class="text-sm uppercase tracking-[0.2em] text-[#5faaf3]">Imágenes</p>
      <h1 class="mt-2 text-3xl font-bold text-white">{{ currentView.title }}</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{{ currentView.description }}</p>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <NuxtLink to="/dashboard/images/gallery" class="panel-shell p-5 text-sm text-slate-200 transition hover:border-[#137fec]/35">
        Galería
      </NuxtLink>
      <NuxtLink to="/dashboard/images/copies" class="panel-shell p-5 text-sm text-slate-200 transition hover:border-[#137fec]/35">
        Copias n8n
      </NuxtLink>
      <NuxtLink to="/dashboard/images/optimize" class="panel-shell p-5 text-sm text-slate-200 transition hover:border-[#137fec]/35">
        Optimización
      </NuxtLink>
    </div>

    <section class="panel-shell p-6 text-sm text-slate-300">
      Esta familia de pantallas fue reubicada dentro del runtime Nuxt para continuar el porting sin
      dependencias React. La lógica existente del repositorio puede migrarse aquí progresivamente.
    </section>
  </section>
</template>
