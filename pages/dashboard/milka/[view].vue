<script setup lang="ts">
import { ArrowRight, Cookie, Music4, WandSparkles } from "lucide-vue-next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import MilkaCookiesPanel from "@/components/dashboard/MilkaCookiesPanel.vue"
import MilkaMusicLibraryPanel from "@/components/dashboard/MilkaMusicLibraryPanel.vue"
import MilkaMusicTransformPanel from "@/components/dashboard/MilkaMusicTransformPanel.vue"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Services, Components */
const route = useRoute()

/** DefineModel, Ref, Computed */
interface EnlaceVistaMilka {
  key: string
  label: string
  to: string
  description: string
}

const currentView = computed(() => {
  const raw = Array.isArray(route.params.view)
    ? route.params.view[0]
    : route.params.view
  if (raw === "cookies") {
    return {
      title: "Milka: cookies",
      description:
        "Procesa cookies exportadas de YouTube Music y genera las variables del servidor.",
    }
  }

  if (raw === "transformar") {
    return {
      title: "Milka: transformar archivo",
      description: "Genera versiones Slow + Reverb desde un archivo de audio.",
    }
  }

  return {
    title: "Milka: canciones",
    description:
      "Biblioteca de YouTube Music con seleccion de canciones y reproductor.",
  }
})

const activeView = computed(() => {
  const raw = Array.isArray(route.params.view)
    ? route.params.view[0]
    : route.params.view
  if (raw === "cookies") {
    return "cookies"
  }

  if (raw === "transformar") {
    return "transformar"
  }

  return "musica"
})

const viewLinks: EnlaceVistaMilka[] = [
  {
    key: "musica",
    label: "Canciones",
    to: "/dashboard/milka/musica",
    description: "Listado de canciones y reproductor de YouTube Music.",
  },
  {
    key: "transformar",
    label: "Transformar",
    to: "/dashboard/milka/transformar",
    description: "Slow + Reverb desde un archivo cargado.",
  },
  {
    key: "cookies",
    label: "Cookies",
    to: "/dashboard/milka/cookies",
    description: "Parser de cookies para configurar YouTube Music.",
  },
]

/** Vue */
definePageMeta({
  layout: "dashboard",
})
</script>

<template>
  <section class="space-y-6">
    <Card
      class="border-white/10 bg-card/80 shadow-xl shadow-cyan-950/10 backdrop-blur-xl"
    >
      <CardHeader>
        <Badge
          variant="outline"
          class="border-rose-300/25 bg-rose-300/10 text-rose-100"
        >
          <component
            :is="
              activeView === 'transformar'
                ? WandSparkles
                : activeView === 'cookies'
                  ? Cookie
                  : Music4
            "
            class="size-3"
          />
          Milka
        </Badge>
        <CardTitle class="text-3xl font-bold tracking-tight lg:text-4xl">
          {{ currentView.title }}
        </CardTitle>
        <CardDescription class="max-w-3xl text-sm leading-relaxed">
          {{ currentView.description }}
        </CardDescription>
      </CardHeader>
    </Card>

    <MilkaMusicLibraryPanel v-if="activeView === 'musica'" />
    <MilkaMusicTransformPanel v-if="activeView === 'transformar'" />
    <MilkaCookiesPanel v-if="activeView === 'cookies'" />

    <div class="grid gap-4 md:grid-cols-3">
      <Card
        v-for="item in viewLinks"
        :key="item.key"
        class="border-white/10 bg-card/80 backdrop-blur-xl transition hover:border-cyan-300/35"
        :class="activeView === item.key ? 'ring-2 ring-primary/40' : ''"
      >
        <CardHeader>
          <CardTitle class="text-xl">{{ item.label }}</CardTitle>
          <CardDescription>{{ item.description }}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            as-child
            :variant="activeView === item.key ? 'default' : 'outline'"
            class="w-full rounded-xl"
          >
            <NuxtLink :to="item.to">
              Abrir
              <ArrowRight class="size-4" />
            </NuxtLink>
          </Button>
        </CardFooter>
      </Card>
    </div>
  </section>
</template>
