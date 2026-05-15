<script setup lang="ts">
import {Database} from "lucide-vue-next"
import {Badge} from "@/components/ui/badge"

definePageMeta({
  layout: "dashboard",
})
</script>

<template>
  <section class="space-y-3">
    <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white backdrop-blur-xl"
    >
      <div class="flex min-w-0 items-center gap-3">
        <div
            class="flex size-9 shrink-0 items-center justify-center rounded-md bg-cyan-300/15 text-cyan-100"
        >
          <Database class="size-4"/>
        </div>
        <div class="min-w-0">
          <h1 class="text-lg font-semibold leading-none">Scrap</h1>
          <p class="mt-1 truncate font-mono text-xs text-slate-400">
            /api/scrap/foursquare-os/rows
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <Badge
            variant="outline"
            class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
        >
          places_os
        </Badge>
        <Badge
            variant="outline"
            class="border-amber-300/25 bg-amber-300/10 text-amber-100"
        >
          preview publico
        </Badge>
      </div>
    </div>

    <DashboardScrapPlacesOsRowsTable/>
  </section>
</template>
