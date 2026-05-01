<script setup lang="ts">
import { Home, RotateCcw } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  error: {
    statusCode?: number;
    statusMessage?: string;
    message?: string;
  };
}>();

const codigo = computed(() => props.error.statusCode || 500);
const titulo = computed(() =>
  codigo.value === 404 ? "Página no encontrada" : "Algo salió mal",
);
const descripcion = computed(
  () =>
    props.error.statusMessage ||
    props.error.message ||
    "No se pudo cargar la página solicitada.",
);

const volverInicio = () => clearError({ redirect: "/" });
const reintentar = () => clearError();
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <main class="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-4 py-10">
      <section
        class="w-full rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl sm:p-8"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Error {{ codigo }}
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {{ titulo }}
        </h1>
        <p class="mt-4 text-base leading-7 text-muted-foreground">
          {{ descripcion }}
        </p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" class="rounded-2xl" @click="volverInicio">
            <Home class="size-4" />
            Ir al inicio
          </Button>
          <Button
            type="button"
            variant="outline"
            class="rounded-2xl"
            @click="reintentar"
          >
            <RotateCcw class="size-4" />
            Reintentar
          </Button>
        </div>
      </section>
    </main>
  </div>
</template>
