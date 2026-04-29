<script setup lang="ts">
import { ArrowRight, ImageIcon } from "lucide-vue-next";
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

definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const copyByView = {
  gallery: {
    title: "Galería de imágenes",
    description:
      "La base Nuxt ya está lista para portar la subida, rename y administración visual de la galería.",
  },
  copies: {
    title: "Copias con n8n",
    description:
      "Esta vista quedó preparada para reconectar el flujo de copias y la respuesta visual del webhook.",
  },
  optimize: {
    title: "Optimización AVIF",
    description:
      "La lógica backend de optimización puede migrarse encima de esta base sin mantener Next como runtime.",
  },
} as const;

const currentView = computed(() => {
  const raw = Array.isArray(route.params.view)
    ? route.params.view[0]
    : route.params.view;
  if (raw === "copies") return copyByView.copies;
  if (raw === "optimize") return copyByView.optimize;
  return copyByView.gallery;
});

const activeView = computed(() => {
  const raw = Array.isArray(route.params.view)
    ? route.params.view[0]
    : route.params.view;
  if (raw === "copies" || raw === "optimize") return raw;
  return "gallery";
});

const viewLinks = [
  {
    key: "gallery",
    label: "Galería",
    to: "/dashboard/images/gallery",
    description: "Administración visual y futuras acciones de storage.",
  },
  {
    key: "copies",
    label: "Copias n8n",
    to: "/dashboard/images/copies",
    description: "Reconexión del webhook de copias y respuesta operativa.",
  },
  {
    key: "optimize",
    label: "Optimización",
    to: "/dashboard/images/optimize",
    description: "Pipeline AVIF preparado para continuar el porting.",
  },
] as const;
</script>

<template>
  <section class="space-y-6">
    <Card
      class="border-white/10 bg-card/80 shadow-xl shadow-cyan-950/10 backdrop-blur-xl"
    >
      <CardHeader>
        <Badge
          variant="outline"
          class="border-amber-300/25 bg-amber-300/10 text-amber-100"
        >
          <ImageIcon class="size-3" />
          Imágenes
        </Badge>
        <CardTitle class="text-3xl font-bold tracking-tight lg:text-4xl">
          {{ currentView.title }}
        </CardTitle>
        <CardDescription class="max-w-3xl text-sm leading-relaxed">
          {{ currentView.description }}
        </CardDescription>
      </CardHeader>
    </Card>

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

    <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
      <CardContent class="pt-6 text-sm leading-relaxed text-muted-foreground">
        Esta familia de pantallas fue reubicada dentro del runtime Nuxt para
        continuar el porting sin dependencias React. La lógica existente del
        repositorio puede migrarse aquí progresivamente.
      </CardContent>
    </Card>
  </section>
</template>
