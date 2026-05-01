<script setup lang="ts">
import { ArrowLeft, Home, SearchX } from "lucide-vue-next"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

definePageMeta({
  layout: "dashboard",
})

const ruta = useRoute()

if (import.meta.server) {
  setResponseStatus(404)
}
</script>

<template>
  <section class="grid min-h-[calc(100vh-9rem)] place-items-center">
    <Card
      class="w-full max-w-2xl border-white/10 bg-black/35 text-white shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"
    >
      <CardHeader class="gap-4">
        <div
          class="grid size-14 place-items-center rounded-2xl bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-300/20"
        >
          <SearchX class="size-7" />
        </div>
        <div>
          <p
            class="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/75"
          >
            Error 404
          </p>
          <CardTitle class="mt-2 text-3xl">Página no encontrada</CardTitle>
          <CardDescription class="mt-3 text-base leading-7 text-slate-300">
            La ruta
            <span class="font-medium text-white">{{ ruta.path }}</span> no
            existe dentro del dashboard.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 sm:flex-row">
        <Button as-child class="rounded-2xl">
          <NuxtLink to="/dashboard">
            <Home class="size-4" />
            Ir al dashboard
          </NuxtLink>
        </Button>
        <Button
          as-child
          variant="outline"
          class="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <NuxtLink to="/">
            <ArrowLeft class="size-4" />
            Volver al inicio
          </NuxtLink>
        </Button>
      </CardContent>
    </Card>
  </section>
</template>
