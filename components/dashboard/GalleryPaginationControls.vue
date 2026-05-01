<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tamanosPaginaGaleria } from "@/utils/constants/imagenes";
import type { TamanoPaginaGaleria } from "@/utils/enums/anums";

const props = withDefaults(
  defineProps<{
    totalItems: number;
    page: number;
    pageSize: TamanoPaginaGaleria;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  pageChange: [page: number];
  pageSizeChange: [pageSize: TamanoPaginaGaleria];
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)));
const clampedPage = computed(() => Math.min(Math.max(props.page, 1), totalPages.value));
const from = computed(() => (props.totalItems === 0 ? 0 : (clampedPage.value - 1) * props.pageSize + 1));
const to = computed(() => Math.min(clampedPage.value * props.pageSize, props.totalItems));
const canPrev = computed(() => clampedPage.value > 1 && !props.disabled);
const canNext = computed(() => clampedPage.value < totalPages.value && !props.disabled);

function manejarCambioTamanoPagina(tamanoPagina: TamanoPaginaGaleria) {
  emit("pageSizeChange", tamanoPagina);
}

function manejarPaginaAnterior() {
  emit("pageChange", clampedPage.value - 1);
}

function manejarPaginaSiguiente() {
  emit("pageChange", clampedPage.value + 1);
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-xs text-muted-foreground">
        Mostrando {{ from }}-{{ to }} de {{ totalItems }}
      </p>
      <span class="text-xs text-muted-foreground">Solicitud:</span>
      <Badge
        v-for="option in tamanosPaginaGaleria"
        :key="option"
        :variant="option === pageSize ? 'default' : 'outline'"
        :class="disabled ? 'opacity-60' : ''"
      >
        <button
          type="button"
          class="cursor-pointer"
          :disabled="disabled || option === pageSize"
          @click="manejarCambioTamanoPagina(option)"
        >
          {{ option }}
        </button>
      </Badge>
    </div>

    <div class="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        :disabled="!canPrev"
        @click="manejarPaginaAnterior"
      >
        <ChevronLeft class="size-4" />
        Anterior
      </Button>
      <p class="text-xs text-muted-foreground">
        Página {{ clampedPage }} de {{ totalPages }}
      </p>
      <Button
        size="sm"
        variant="outline"
        :disabled="!canNext"
        @click="manejarPaginaSiguiente"
      >
        Siguiente
        <ChevronRight class="size-4" />
      </Button>
    </div>
  </div>
</template>
