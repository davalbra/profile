<script setup lang="ts">
import { DatabaseZap, FilterX, UploadCloud } from "lucide-vue-next"
import { toast } from "vue-sonner"
import { computed, onMounted, ref } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useScrapRepositorio } from "@/store/repository/scrap"
import type { PaisPlacesOs, ResultadoExportacionPlacesOs } from "@/types/scrap"
import {
  abrirAlertaProceso,
  cerrarAlertaProceso,
} from "@/utils/alertas/proceso"
import { FiltroWebsitePlacesOs } from "@/utils/enums/anums"

/** Services, Components */
const scrapRepositorio = useScrapRepositorio()

/** DefineModel, Ref, Computed */
const paises = ref<PaisPlacesOs[]>([])
const pais = ref("")
const website = ref<FiltroWebsitePlacesOs>(FiltroWebsitePlacesOs.CON_WEBSITE)
const limite = ref("100")
const resultado = ref<ResultadoExportacionPlacesOs | null>(null)
const cargandoPaises = ref(false)
const exportando = ref(false)
const errorPaises = ref(false)
const errorExportacion = ref<string | null>(null)

const paisSeleccionado = computed(
  () => paises.value.find((item) => item.value === pais.value) || null,
)
const nombreTablaPrevisto = computed(() => {
  const segmentoWebsite =
    website.value === FiltroWebsitePlacesOs.CON_WEBSITE
      ? "con_website"
      : website.value === FiltroWebsitePlacesOs.SIN_WEBSITE
        ? "sin_website"
        : "todos_los_websites"

  return pais.value
    ? `places_os_${pais.value.toLowerCase()}_${segmentoWebsite}`
    : "-"
})
const puedeExportar = computed(() => Boolean(pais.value) && !exportando.value)

/** Functions */
function obtenerPaisInicial(items: PaisPlacesOs[]) {
  return (
    items.find((item) => item.value === "EC")?.value || items[0]?.value || ""
  )
}

async function cargarPaises() {
  cargandoPaises.value = true
  errorPaises.value = false

  try {
    const respuesta = await scrapRepositorio.obtenerPaisesPlacesOs()
    paises.value = respuesta.data.data.countries

    if (!pais.value) {
      pais.value = obtenerPaisInicial(paises.value)
    }
  } catch {
    errorPaises.value = true
  } finally {
    cargandoPaises.value = false
  }
}

function limpiarExportacion() {
  pais.value = obtenerPaisInicial(paises.value)
  website.value = FiltroWebsitePlacesOs.CON_WEBSITE
  limite.value = "100"
  resultado.value = null
  errorExportacion.value = null
}

async function exportarPlacesOs() {
  if (!pais.value) {
    errorExportacion.value = "Selecciona un pais para exportar."
    return
  }

  exportando.value = true
  errorExportacion.value = null
  resultado.value = null
  abrirAlertaProceso("Exportando Places OS a Neon")

  try {
    const respuesta = await scrapRepositorio.exportarPlacesOs({
      pais: pais.value,
      website: website.value,
      limite: Number(limite.value) || 100,
    })
    resultado.value = respuesta.data.data
    toast.success("Places OS exportado a Neon.")
  } catch {
    errorExportacion.value = "No se pudo exportar Places OS hacia Neon."
  } finally {
    cerrarAlertaProceso()
    exportando.value = false
  }
}

/** Vue */
onMounted(() => {
  void cargarPaises()
})
</script>

<template>
  <Card class="border-white/10 bg-black/35 text-white backdrop-blur-xl">
    <CardHeader class="px-4 py-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <DatabaseZap class="size-4 shrink-0 text-emerald-100" />
          <div class="min-w-0">
            <CardTitle class="text-base">Exportar Places OS a Neon</CardTitle>
            <p class="mt-1 truncate font-mono text-xs text-slate-400">
              {{ nombreTablaPrevisto }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            class="border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
          >
            Neon
          </Badge>
          <Badge
            variant="outline"
            class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          >
            {{ paisSeleccionado?.label || "pais pendiente" }}
          </Badge>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4 px-4 pb-4">
      <div
        v-if="errorPaises"
        class="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
      >
        No se pudieron cargar los paises.
      </div>

      <div
        v-if="errorExportacion"
        class="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
      >
        {{ errorExportacion }}
      </div>

      <div
        class="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_190px_140px_auto_auto]"
      >
        <NativeSelect v-model="pais" class="w-full" :disabled="cargandoPaises">
          <NativeSelectOption value="">Selecciona pais</NativeSelectOption>
          <NativeSelectOption
            v-for="item in paises"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }} ({{ item.value }})
          </NativeSelectOption>
        </NativeSelect>

        <NativeSelect v-model="website" class="w-full">
          <NativeSelectOption :value="FiltroWebsitePlacesOs.CON_WEBSITE">
            Con website
          </NativeSelectOption>
          <NativeSelectOption :value="FiltroWebsitePlacesOs.SIN_WEBSITE">
            Sin website
          </NativeSelectOption>
          <NativeSelectOption :value="FiltroWebsitePlacesOs.TODOS">
            Todos
          </NativeSelectOption>
        </NativeSelect>

        <NativeSelect v-model="limite" class="w-full">
          <NativeSelectOption value="50">50 filas</NativeSelectOption>
          <NativeSelectOption value="100">100 filas</NativeSelectOption>
          <NativeSelectOption value="250">250 filas</NativeSelectOption>
          <NativeSelectOption value="500">500 filas</NativeSelectOption>
        </NativeSelect>

        <Button
          type="button"
          :disabled="!puedeExportar"
          class="bg-emerald-300 text-slate-950 hover:bg-emerald-200"
          @click="exportarPlacesOs"
        >
          <UploadCloud :class="['size-4', exportando && 'animate-pulse']" />
          Exportar
        </Button>

        <Button type="button" variant="outline" @click="limpiarExportacion">
          <FilterX class="size-4" />
          Limpiar
        </Button>
      </div>

      <div
        class="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-slate-400"
      >
        tabla destino:
        <span class="text-emerald-100">{{
          resultado?.tableName || nombreTablaPrevisto
        }}</span>
      </div>

      <div v-if="resultado" class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-md border border-white/10 bg-black/20 p-3">
          <p class="text-xs text-slate-500">Leidas</p>
          <p class="mt-1 font-mono text-lg text-white">
            {{ resultado.fetchedRows }}
          </p>
        </div>
        <div class="rounded-md border border-white/10 bg-black/20 p-3">
          <p class="text-xs text-slate-500">Insertadas</p>
          <p class="mt-1 font-mono text-lg text-emerald-100">
            {{ resultado.insertedRows }}
          </p>
        </div>
        <div class="rounded-md border border-white/10 bg-black/20 p-3">
          <p class="text-xs text-slate-500">Actualizadas</p>
          <p class="mt-1 font-mono text-lg text-cyan-100">
            {{ resultado.updatedRows }}
          </p>
        </div>
        <div class="rounded-md border border-white/10 bg-black/20 p-3">
          <p class="text-xs text-slate-500">Omitidas</p>
          <p class="mt-1 font-mono text-lg text-amber-100">
            {{ resultado.skippedRows }}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
