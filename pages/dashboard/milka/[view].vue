<script setup lang="ts">
import { ArrowRight, Music4 } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const currentView = computed(() => {
  const raw = Array.isArray(route.params.view)
    ? route.params.view[0]
    : route.params.view;
  return raw === "cookies"
    ? {
        title: "Milka: limpieza de cookies",
        description:
          "Base Nuxt lista para volver a montar utilidades de sesión/cookies del flujo privado.",
      }
    : {
        title: "Milka: música y lyrics",
        description:
          "Paneles de audio, letras y sincronización listos para operación interna.",
      };
});

const activeView = computed(() => {
  const raw = Array.isArray(route.params.view)
    ? route.params.view[0]
    : route.params.view;
  return raw === "cookies" ? "cookies" : "musica";
});

const viewLinks = [
  {
    key: "musica",
    label: "Música y lyrics",
    to: "/dashboard/milka/musica",
    description:
      "Audio, letras y sincronización para operar la suite privada.",
  },
  {
    key: "cookies",
    label: "Cookies",
    to: "/dashboard/milka/cookies",
    description: "Utilidades de sesión y limpieza listas para reconectar.",
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
          class="border-rose-300/25 bg-rose-300/10 text-rose-100"
        >
          <Music4 class="size-3" />
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

    <div class="grid gap-4 md:grid-cols-2">
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
