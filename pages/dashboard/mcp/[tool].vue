<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const docsByTool = {
  optimize: {
    label: "optimize_image",
    title: "MCP: Optimizar imágenes",
    description: "Expone la optimización AVIF de imágenes por URL como herramienta MCP.",
    payloadExample: {
      imageUrl: "https://example.com/foto.jpg",
      fileName: "foto.jpg",
      quality: 52,
      effort: 4,
      maxDimension: 2400,
      returnBase64: false,
    },
  },
  billing: {
    label: "billing_usage",
    title: "MCP: Billing usage",
    description: "Expone la consulta de costos Firebase/Gemini como herramienta MCP.",
    payloadExample: {
      service: "firebase",
      period: "30d",
    },
  },
} as const;

const currentTool = computed(() => {
  const raw = Array.isArray(route.params.tool) ? route.params.tool[0] : route.params.tool;
  return raw === "billing" ? docsByTool.billing : docsByTool.optimize;
});

const example = computed(() =>
  JSON.stringify(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: currentTool.value.label,
        arguments: currentTool.value.payloadExample,
      },
    },
    null,
    2,
  ),
);
</script>

<template>
  <section class="space-y-6">
    <header class="panel-shell p-6">
      <div class="flex flex-wrap items-center gap-3">
        <p class="text-sm uppercase tracking-[0.2em] text-[#5faaf3]">MCP</p>
        <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
          {{ currentTool.label }}
        </span>
      </div>
      <h1 class="mt-2 text-3xl font-bold text-white">{{ currentTool.title }}</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{{ currentTool.description }}</p>
    </header>

    <div class="flex flex-wrap gap-2">
      <NuxtLink
        to="/dashboard/mcp/optimize"
        class="rounded-2xl border px-3 py-2 text-sm transition"
        :class="route.params.tool === 'optimize' || !route.params.tool ? 'border-[#137fec]/50 bg-[#137fec]/10 text-white' : 'border-white/10 text-slate-300'"
      >
        optimize_image
      </NuxtLink>
      <NuxtLink
        to="/dashboard/mcp/billing"
        class="rounded-2xl border px-3 py-2 text-sm transition"
        :class="route.params.tool === 'billing' ? 'border-[#137fec]/50 bg-[#137fec]/10 text-white' : 'border-white/10 text-slate-300'"
      >
        billing_usage
      </NuxtLink>
    </div>

    <section class="panel-shell p-6">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Endpoint MCP</p>
      <p class="mt-2 font-mono text-sm text-white">/api/mcp</p>
    </section>

    <section class="panel-shell p-6">
      <p class="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Ejemplo JSON-RPC</p>
      <pre class="overflow-x-auto rounded-2xl bg-black/25 p-4 text-xs text-slate-200">{{ example }}</pre>
    </section>

    <p class="panel-shell p-4 text-sm text-slate-300">
      Si defines <code>MCP_SERVER_TOKEN</code>, envía <code>Authorization: Bearer &lt;token&gt;</code> o
      <code> X-MCP-Token</code> en cada request.
    </p>
  </section>
</template>
