<script setup lang="ts">
import {
  ArrowRight,
  Boxes,
  ChartColumn,
  Database,
  ImageIcon,
  Moon,
  Music4,
  Sparkles,
  Sun,
} from "lucide-vue-next";

const { user } = useAuth();
const { isDark, toggleTheme } = useThemeMode();

const navigation = [
  { label: "Resumen", to: "/dashboard", icon: Boxes },
  { label: "Billing", to: "/dashboard/billing/firebase", icon: ChartColumn },
  { label: "MCP", to: "/dashboard/mcp/optimize", icon: Sparkles },
  { label: "Imágenes", to: "/dashboard/images/gallery", icon: ImageIcon },
  { label: "Milka", to: "/dashboard/milka/musica", icon: Music4 },
  { label: "Trading", to: "/dashboard/trading/futures", icon: Database },
];
</script>

<template>
  <div class="min-h-screen bg-transparent text-slate-100">
    <div class="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
      <aside class="panel-shell h-fit p-4 lg:sticky lg:top-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-white"
        >
          davalbra<span class="text-[#137fec]">.</span>
        </NuxtLink>
        <p class="mt-2 text-sm text-slate-400">Dashboard migrado a Nuxt con sesión Firebase.</p>

        <nav class="mt-6 space-y-2">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="flex min-h-11 items-center gap-3 rounded-2xl border border-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-[#137fec]/30 hover:bg-[#137fec]/10 hover:text-white"
          >
            <component :is="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="mt-6 rounded-2xl border border-white/8 bg-black/15 p-3 text-sm text-slate-300">
          <p class="font-medium text-white">{{ user?.email || "Sesión no activa" }}</p>
          <p class="mt-1 text-xs text-slate-400">
            Algunas vistas complejas se dejaron listas como base Nuxt para seguir portándolas sin tocar el runtime.
          </p>
        </div>

        <div class="mt-6 flex items-center justify-between">
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:border-[#137fec]/40"
            @click="toggleTheme"
          >
            <Sun v-if="isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </button>
          <NuxtLink
            to="/storage-test"
            class="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-[#137fec]/40 hover:bg-[#137fec]/10"
          >
            Storage test
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>
      </aside>

      <main class="min-w-0">
        <slot />
      </main>
    </div>
  </div>
</template>
