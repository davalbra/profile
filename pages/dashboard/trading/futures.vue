<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});
</script>

<template>
  <section class="space-y-6">
    <header class="panel-shell p-6">
      <p class="text-sm uppercase tracking-[0.2em] text-[#5faaf3]">Trading</p>
      <h1 class="mt-2 text-3xl font-bold text-white">Futures</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
        El runtime, Prisma y scripts del bot se conservan. Esta pantalla quedó preparada en Nuxt para
        portar el panel visual y sus requests sin depender de React.
      </p>
    </header>

    <section class="panel-shell p-6 text-sm text-slate-300">
      El script CLI sigue disponible con <code>pnpm trading:futures</code>. La vista gráfica original no fue
      portada completa en esta iteración.
    </section>
  </section>
</template>
