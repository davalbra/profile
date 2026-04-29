<script setup lang="ts">
import { ImageIcon } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const copyByView = {
  gallery: {
    title: "Galería de imágenes",
    description:
      "Sube, previsualiza, renombra y administra imágenes guardadas en Firebase Storage.",
  },
  copies: {
    title: "Copias con n8n",
    description:
      "Selecciona imágenes compatibles, prepara JPG cuando haga falta y envía al webhook de n8n.",
  },
  optimize: {
    title: "Optimización AVIF",
    description:
      "Optimiza imágenes desde galería, n8n u optimizadas y consulta el histórico de ahorro.",
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

const isKnownView = computed(() => ["gallery", "copies", "optimize"].includes(activeView.value));
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

    <DashboardImageGalleryManager v-if="activeView === 'gallery'" />
    <DashboardImageCopiesManager v-else-if="activeView === 'copies'" />
    <DashboardImagesManager v-else-if="activeView === 'optimize'" />
    <Card v-else-if="!isKnownView" class="border-white/10 bg-card/80 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Vista no disponible</CardTitle>
        <CardDescription>Usa galería, copias u optimización.</CardDescription>
      </CardHeader>
    </Card>
  </section>
</template>
