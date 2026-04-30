<script setup lang="ts">
import { ArrowRight, CheckCircle2, Network, Rocket, Sparkles } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  credencialesDashboard,
  metricasDashboard,
  modulosDashboard,
  procesosDashboard,
} from "@/lib/dashboard/dashboard.data";
import { etiquetaEstadoPanelDashboard } from "@/utils/enums/diccionario";

definePageMeta({
  layout: "dashboard",
});
</script>

<template>
  <section class="space-y-6">
    <Card
      class="relative overflow-hidden border-white/10 bg-black/35 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.24),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.16),transparent_30%)]"
      />
      <CardHeader class="relative gap-5 p-6 lg:p-8">
        <div class="flex flex-wrap items-center gap-3">
          <Badge
            class="border-transparent bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/15"
          >
            <Sparkles class="size-3" />
            MCP e imágenes
          </Badge>
          <Badge
            variant="outline"
            class="border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
          >
            Billing conectado
          </Badge>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <p class="text-sm uppercase tracking-[0.28em] text-cyan-100/75">
              Panel operativo
            </p>
            <CardTitle
              class="mt-3 max-w-4xl text-4xl font-black tracking-tight text-white lg:text-6xl"
            >
              Mapa operativo de todos los módulos del proyecto.
            </CardTitle>
            <CardDescription
              class="mt-4 max-w-2xl text-base leading-8 text-slate-300"
            >
              Este dashboard organiza lo que ya existe en la app: billing de
              Firebase y Gemini, herramientas MCP, tratamiento de imágenes,
              flujos n8n y utilidades privadas de audio/cookies.
            </CardDescription>
          </div>

          <Card class="border-white/10 bg-white/[0.06] text-white shadow-xl">
            <CardHeader class="pb-2">
              <CardDescription class="text-slate-400"
                >Pulso general</CardDescription
              >
              <CardTitle class="flex items-center gap-2 text-3xl">
                <Rocket class="size-7 text-cyan-100" />
                4 módulos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress :model-value="91" class="h-3 bg-white/10" />
              <p class="mt-3 text-sm leading-relaxed text-slate-300">
                Cada sección tiene una función clara, una integración principal
                y una ruta directa para operar sin buscar entre archivos.
              </p>
            </CardContent>
          </Card>
        </div>
      </CardHeader>

      <CardFooter
        class="relative flex flex-col gap-3 border-t border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:justify-between lg:p-6"
      >
        <p class="max-w-3xl text-sm leading-6 text-slate-400">
          {{ credencialesDashboard.descripcion }}
        </p>
        <Button as-child class="w-full rounded-2xl sm:w-auto">
          <NuxtLink :to="credencialesDashboard.rutaPrimaria">
            {{ credencialesDashboard.accionPrimaria }}
            <ArrowRight class="size-4" />
          </NuxtLink>
        </Button>
      </CardFooter>
    </Card>

    <div class="grid gap-4 md:grid-cols-3">
      <Card
        v-for="metrica in metricasDashboard"
        :key="metrica.etiqueta"
        class="border-white/10 bg-black/25 text-white shadow-xl shadow-cyan-950/10 backdrop-blur-xl"
      >
          <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <CardDescription class="text-slate-400">{{
              metrica.etiqueta
            }}</CardDescription>
            <Badge
              variant="outline"
              class="border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
            >
              {{ metrica.tendencia }}
            </Badge>
          </div>
          <CardTitle class="text-3xl" :class="metrica.tono">{{ metrica.valor }}</CardTitle>
        </CardHeader>
        <CardContent class="text-sm text-slate-400">{{
          metrica.detalle
        }}</CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class="grid gap-4 md:grid-cols-2">
        <NuxtLink
          v-for="modulo in modulosDashboard"
          :key="modulo.ruta"
          :to="modulo.ruta"
          class="group block"
        >
          <Card
            class="relative h-full overflow-hidden border-white/10 bg-black/30 text-white shadow-xl shadow-cyan-950/10 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30"
          >
            <div
              :class="[
                'absolute inset-0 bg-gradient-to-br opacity-80 transition group-hover:opacity-100',
                modulo.claseTarjeta,
              ]"
            />
            <CardHeader class="relative">
              <div class="flex items-start justify-between gap-4">
                <span
                  :class="[
                    'grid size-12 place-items-center rounded-2xl ring-1',
                    modulo.claseIcono,
                  ]"
                >
                  <component :is="modulo.icono" class="size-5" />
                </span>
                <Badge
                  variant="outline"
                  class="border-white/15 bg-white/10 text-white"
                >
                  {{ modulo.etiqueta }} · {{ etiquetaEstadoPanelDashboard[modulo.estado] }}
                </Badge>
              </div>
              <CardTitle class="mt-5 text-2xl">{{ modulo.titulo }}</CardTitle>
              <CardDescription
                class="min-h-20 text-sm leading-7 text-slate-300"
              >
                {{ modulo.resumen }}
              </CardDescription>
            </CardHeader>
            <CardContent class="relative space-y-5">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">{{ modulo.detalle }}</span>
                <span class="font-semibold text-white"
                  >{{ modulo.progreso }}%</span
                >
              </div>
              <Progress
                :model-value="modulo.progreso"
                class="h-2.5 bg-white/10"
              />
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Qué resuelve
                </p>
                <ul class="space-y-2 text-sm leading-6 text-slate-300">
                  <li
                    v-for="funcion in modulo.funciones"
                    :key="funcion"
                    class="flex gap-2"
                  >
                    <CheckCircle2 class="mt-1 size-4 shrink-0 text-cyan-200" />
                    <span>{{ funcion }}</span>
                  </li>
                </ul>
              </div>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="integracion in modulo.integraciones"
                  :key="integracion"
                  variant="outline"
                  class="border-white/10 bg-white/[0.06] text-slate-200"
                >
                  {{ integracion }}
                </Badge>
              </div>
            </CardContent>
            <CardFooter
              class="relative justify-between border-t border-white/10 bg-black/10"
            >
              <span class="text-sm text-slate-400">{{ modulo.accion }}</span>
              <ArrowRight
                class="size-4 text-cyan-100 transition group-hover:translate-x-1"
              />
            </CardFooter>
          </Card>
        </NuxtLink>
      </div>

      <Card
        class="border-white/10 bg-black/30 text-white shadow-xl shadow-cyan-950/10 backdrop-blur-xl"
      >
        <CardHeader>
          <Badge
            class="w-fit border-transparent bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/15"
          >
            Operación
          </Badge>
          <CardTitle class="text-2xl">Cómo se conectan</CardTitle>
          <CardDescription class="text-slate-400">
            Lectura rápida de los servicios que sostienen operación,
            automatización, assets y control de costos.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <div
            v-for="proceso in procesosDashboard"
            :key="proceso.titulo"
            class="space-y-3"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="flex items-center gap-2 font-semibold text-white">
                  <Network class="size-4 text-emerald-200" />
                  {{ proceso.titulo }}
                </p>
                <p class="mt-1 text-sm leading-6 text-slate-400">
                  {{ proceso.descripcion }}
                </p>
                <p class="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
                  {{ proceso.resultado }}
                </p>
              </div>
              <span class="text-sm font-semibold text-cyan-100"
                >{{ proceso.progreso }}%</span
              >
            </div>
            <Progress :model-value="proceso.progreso" class="h-2 bg-white/10" />
            <Separator class="bg-white/10 last:hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
