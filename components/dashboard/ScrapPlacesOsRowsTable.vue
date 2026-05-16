<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilterX,
  Rows3,
  Search,
} from "lucide-vue-next"
import { computed, onMounted, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useScrapRepositorio } from "@/store/repository/scrap"
import type {
  DatosFilasPlacesOs,
  FilaPlacesOs,
  PaisPlacesOs,
  RegistroPlacesOs,
  ValorCampoPlacesOs,
} from "@/types/scrap"
import { FiltroWebsitePlacesOs } from "@/utils/enums/anums"

/** Services, Components */
const scrapRepositorio = useScrapRepositorio()

/** DefineModel, Ref, Computed */
const pagina = ref(1)
const tamanoPagina = ref("25")
const busqueda = ref("")
const pais = ref("")
const website = ref<FiltroWebsitePlacesOs>(FiltroWebsitePlacesOs.CON_WEBSITE)
const busquedaAplicada = ref("")
const paisAplicado = ref("")
const websiteAplicado = ref<FiltroWebsitePlacesOs>(
  FiltroWebsitePlacesOs.CON_WEBSITE,
)
const filaSeleccionadaIndice = ref<number | null>(null)
const paises = ref<PaisPlacesOs[]>([])
const datosFilas = ref<DatosFilasPlacesOs | null>(null)
const cargandoPaises = ref(false)
const cargandoFilas = ref(false)
const errorPaises = ref(false)
const errorFilas = ref(false)

const filas = computed(() => datosFilas.value?.rows || [])
const tamanoPaginaNumerico = computed(() => Number(tamanoPagina.value) || 25)
const totalFilas = computed(() => datosFilas.value?.totalRows ?? null)
const totalPaginas = computed(() =>
  typeof totalFilas.value === "number"
    ? Math.max(1, Math.ceil(totalFilas.value / tamanoPaginaNumerico.value))
    : null,
)
const registroDesde = computed(() =>
  filas.value.length === 0
    ? 0
    : (pagina.value - 1) * tamanoPaginaNumerico.value + 1,
)
const registroHasta = computed(() =>
  filas.value.length === 0 ? 0 : registroDesde.value + filas.value.length - 1,
)
const puedeRetroceder = computed(() => pagina.value > 1 && !cargandoFilas.value)
const puedeAvanzar = computed(
  () => Boolean(datosFilas.value?.hasNextPage) && !cargandoFilas.value,
)
const etiquetaTotalFilas = computed(() =>
  typeof totalFilas.value === "number"
    ? ` de ${formatearNumero(totalFilas.value)}`
    : "",
)
const etiquetaModoConsulta = computed(() => {
  const modo = datosFilas.value?.queryMode || "rows"
  const etiquetas = {
    rows: "rows",
    filter: "HF filter",
    search: "HF search",
    server_filter: "endpoint filter",
  }

  return etiquetas[modo]
})
const filaSeleccionada = computed(
  () =>
    filas.value.find((fila) => fila.rowIdx === filaSeleccionadaIndice.value) ||
    filas.value[0] ||
    null,
)
const camposFilaSeleccionada = computed(() => {
  if (!filaSeleccionada.value) {
    return []
  }

  return Object.entries(filaSeleccionada.value.row).map(([clave, valor]) => ({
    clave,
    valor: formatearCelda(valor),
  }))
})
const paisSeleccionado = computed(
  () => paises.value.find((item) => item.value === pais.value) || null,
)
const paisAplicadoDetalle = computed(
  () => paises.value.find((item) => item.value === paisAplicado.value) || null,
)
const nombreTabla = computed(
  () =>
    datosFilas.value?.tableName ||
    paisAplicadoDetalle.value?.tableName ||
    paisSeleccionado.value?.tableName ||
    "places_os",
)
const etiquetaPais = computed(
  () =>
    paisAplicadoDetalle.value?.label || paisAplicado.value || "pais pendiente",
)
const etiquetaWebsite = computed(() =>
  obtenerEtiquetaWebsite(websiteAplicado.value),
)

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
      paisAplicado.value = pais.value
    }
  } catch {
    errorPaises.value = true
  } finally {
    cargandoPaises.value = false
  }
}

async function consultarFilas() {
  if (!paisAplicado.value) {
    datosFilas.value = null
    return
  }

  cargandoFilas.value = true
  errorFilas.value = false

  try {
    const respuesta = await scrapRepositorio.obtenerFilasPlacesOs({
      page: pagina.value,
      pageSize: tamanoPaginaNumerico.value,
      q: busquedaAplicada.value,
      country: paisAplicado.value,
      timezone: "",
      website: websiteAplicado.value,
    })
    datosFilas.value = respuesta.data.data
  } catch {
    errorFilas.value = true
    datosFilas.value = null
  } finally {
    cargandoFilas.value = false
  }
}

function obtenerTexto(registro: RegistroPlacesOs, clave: string) {
  const valor = registro[clave]

  if (typeof valor === "string") {
    return valor
  }

  if (typeof valor === "number") {
    return String(valor)
  }

  return ""
}

function formatearCelda(valor: ValorCampoPlacesOs | null): string {
  if (valor === null || valor === "") {
    return "-"
  }

  if (Array.isArray(valor)) {
    return valor.length
      ? valor.map((item) => formatearCelda(item)).join(", ")
      : "-"
  }

  if (typeof valor === "number") {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(6)
  }

  if (typeof valor === "object") {
    return JSON.stringify(valor)
  }

  return String(valor)
}

function formatearNumero(valor: number | null) {
  if (typeof valor !== "number") {
    return "-"
  }

  return new Intl.NumberFormat("en-US").format(valor)
}

function seleccionarFila(fila: FilaPlacesOs) {
  filaSeleccionadaIndice.value = fila.rowIdx
}

function aplicarFiltros() {
  filaSeleccionadaIndice.value = null
  busquedaAplicada.value = busqueda.value.trim()
  paisAplicado.value = pais.value
  websiteAplicado.value = website.value

  if (pagina.value !== 1) {
    pagina.value = 1
  }

  void consultarFilas()
}

function limpiarFiltros() {
  busqueda.value = ""
  pais.value = obtenerPaisInicial(paises.value)
  website.value = FiltroWebsitePlacesOs.CON_WEBSITE
  busquedaAplicada.value = ""
  paisAplicado.value = pais.value
  websiteAplicado.value = FiltroWebsitePlacesOs.CON_WEBSITE
  filaSeleccionadaIndice.value = null

  if (pagina.value !== 1) {
    pagina.value = 1
  }

  void consultarFilas()
}

function paginaSiguiente() {
  if (puedeAvanzar.value) {
    pagina.value += 1
    void consultarFilas()
  }
}

function paginaAnterior() {
  if (puedeRetroceder.value) {
    pagina.value -= 1
    void consultarFilas()
  }
}

function obtenerWebsiteHref(registro: RegistroPlacesOs) {
  const valorWebsite = obtenerTexto(registro, "website")

  if (!valorWebsite) {
    return null
  }

  return valorWebsite.startsWith("http://") ||
    valorWebsite.startsWith("https://")
    ? valorWebsite
    : `https://${valorWebsite}`
}

function obtenerEtiquetaWebsite(filtro: FiltroWebsitePlacesOs) {
  if (filtro === FiltroWebsitePlacesOs.CON_WEBSITE) {
    return "Con website"
  }

  if (filtro === FiltroWebsitePlacesOs.SIN_WEBSITE) {
    return "Sin website"
  }

  return "Todos los websites"
}

async function iniciarPlacesOs() {
  await cargarPaises()
  aplicarFiltros()
}

/** Vue */
watch(tamanoPagina, () => {
  pagina.value = 1
  void consultarFilas()
})

watch(filas, () => {
  filaSeleccionadaIndice.value = null
})

onMounted(() => {
  void iniciarPlacesOs()
})
</script>

<template>
  <Card class="border-white/10 bg-black/35 text-white backdrop-blur-xl">
    <CardHeader class="px-4 py-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <Rows3 class="size-4 shrink-0 text-cyan-100" />
          <div class="min-w-0">
            <CardTitle class="text-base">Filas de Places OS</CardTitle>
            <p class="mt-1 truncate font-mono text-xs text-slate-400">
              {{ nombreTabla }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          >
            {{ etiquetaPais }}
          </Badge>
          <Badge
            variant="outline"
            class="border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
          >
            {{ etiquetaWebsite }}
          </Badge>
          <Badge
            variant="outline"
            class="border-amber-300/25 bg-amber-300/10 text-amber-100"
          >
            espejo no oficial
          </Badge>
          <Button
            v-if="datosFilas?.sourceUrl"
            as-child
            variant="outline"
            size="sm"
          >
            <a
              :href="datosFilas.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fuente
              <ExternalLink class="size-4" />
            </a>
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-3 px-4 pb-4">
      <div
        v-if="errorPaises"
        class="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
      >
        No se pudieron cargar los paises.
      </div>

      <div
        v-if="errorFilas"
        class="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
      >
        No se pudieron consultar las filas.
      </div>

      <div
        v-if="datosFilas?.warning"
        class="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100"
      >
        {{ datosFilas.warning }}
      </div>

      <div
        class="grid gap-2 xl:grid-cols-[minmax(240px,1.2fr)_190px_150px_minmax(220px,1fr)_auto_auto]"
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
            Todos los websites
          </NativeSelectOption>
        </NativeSelect>

        <NativeSelect v-model="tamanoPagina" class="w-full">
          <NativeSelectOption value="10">10 filas</NativeSelectOption>
          <NativeSelectOption value="25">25 filas</NativeSelectOption>
          <NativeSelectOption value="50">50 filas</NativeSelectOption>
          <NativeSelectOption value="100">100 filas</NativeSelectOption>
        </NativeSelect>

        <div class="relative">
          <Search
            class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
          />
          <Input
            v-model="busqueda"
            class="pl-9"
            placeholder="Buscar"
            @keyup.enter="aplicarFiltros"
          />
        </div>

        <Button
          type="button"
          :disabled="cargandoFilas || !pais"
          class="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          @click="aplicarFiltros"
        >
          <Search :class="['size-4', cargandoFilas && 'animate-pulse']" />
          Consultar
        </Button>

        <Button type="button" variant="outline" @click="limpiarFiltros">
          <FilterX class="size-4" />
          Limpiar
        </Button>
      </div>

      <div
        class="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-slate-400"
      >
        tabla: <span class="text-cyan-100">{{ nombreTabla }}</span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
        <p class="text-slate-400">
          {{ formatearNumero(registroDesde) }}-{{
            formatearNumero(registroHasta)
          }}{{ etiquetaTotalFilas }}
        </p>
        <p class="text-slate-500">consulta: {{ etiquetaModoConsulta }}</p>
      </div>

      <div
        class="max-h-[620px] overflow-auto rounded-lg border border-white/10"
      >
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-[#07111c]">
            <TableRow>
              <TableHead class="min-w-[120px]">Pais</TableHead>
              <TableHead class="min-w-[150px]">Zona horaria</TableHead>
              <TableHead class="min-w-[120px]">Agregado</TableHead>
              <TableHead class="w-[90px]">Row</TableHead>
              <TableHead class="min-w-[220px]">Empresa</TableHead>
              <TableHead class="min-w-[220px]">Website</TableHead>
              <TableHead class="min-w-[170px]">Telefono</TableHead>
              <TableHead class="min-w-[240px]">Ubicacion</TableHead>
              <TableHead class="min-w-[170px]">Coordenadas</TableHead>
              <TableHead class="min-w-[320px]">Categorias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="fila in filas"
              :key="fila.rowIdx"
              :class="[
                'cursor-pointer transition-colors hover:bg-white/[0.06]',
                filaSeleccionada?.rowIdx === fila.rowIdx && 'bg-white/[0.08]',
              ]"
              @click="seleccionarFila(fila)"
            >
              <TableCell class="font-mono text-xs text-cyan-100">
                {{ formatearCelda(fila.row.country) }}
              </TableCell>
              <TableCell class="font-mono text-xs text-cyan-100">
                {{ formatearCelda(fila.row.timezone) }}
              </TableCell>
              <TableCell class="font-mono text-xs">
                {{ formatearCelda(fila.row.date_created) }}
              </TableCell>
              <TableCell class="font-mono text-xs text-slate-400">
                {{ formatearNumero(fila.rowIdx) }}
              </TableCell>
              <TableCell>
                <p class="font-semibold">
                  {{ formatearCelda(fila.row.name) }}
                </p>
                <p class="mt-1 font-mono text-xs text-cyan-100/80">
                  {{ formatearCelda(fila.row.fsq_place_id) }}
                </p>
              </TableCell>
              <TableCell class="max-w-[280px] whitespace-normal break-all">
                <a
                  v-if="obtenerWebsiteHref(fila.row)"
                  :href="obtenerWebsiteHref(fila.row) || ''"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-cyan-100 underline-offset-4 hover:underline"
                  @click.stop
                >
                  {{ formatearCelda(fila.row.website) }}
                </a>
                <span v-else class="text-slate-500">-</span>
              </TableCell>
              <TableCell>{{ formatearCelda(fila.row.tel) }}</TableCell>
              <TableCell class="max-w-[300px] whitespace-normal">
                <p>{{ formatearCelda(fila.row.address) }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ formatearCelda(fila.row.locality) }},
                  {{ formatearCelda(fila.row.region) }}
                  · {{ formatearCelda(fila.row.country) }}
                </p>
              </TableCell>
              <TableCell class="font-mono text-xs">
                {{ formatearCelda(fila.row.latitude) }},
                {{ formatearCelda(fila.row.longitude) }}
              </TableCell>
              <TableCell class="max-w-[360px] whitespace-normal text-sm">
                {{ formatearCelda(fila.row.fsq_category_labels) }}
              </TableCell>
            </TableRow>
            <TableEmpty v-if="!filas.length" :colspan="10">
              No hay filas para esta consulta.
            </TableEmpty>
          </TableBody>
        </Table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="font-mono text-xs text-slate-500">
          offset {{ formatearNumero(datosFilas?.offset || 0) }}
          <span v-if="datosFilas?.scannedRows">
            · scan {{ formatearNumero(datosFilas.scannedRows) }}</span
          >
        </p>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="!puedeRetroceder"
            @click="paginaAnterior"
          >
            <ChevronLeft class="size-4" />
            Anterior
          </Button>
          <p class="text-xs text-slate-400">
            Pagina {{ formatearNumero(pagina)
            }}<span v-if="totalPaginas">
              de {{ formatearNumero(totalPaginas) }}</span
            >
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="!puedeAvanzar"
            @click="paginaSiguiente"
          >
            Siguiente
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>

      <div class="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold">Detalle de fila</p>
            <p class="mt-1 font-mono text-xs text-cyan-100/80">
              row_idx
              {{
                filaSeleccionada
                  ? formatearNumero(filaSeleccionada.rowIdx)
                  : "-"
              }}
            </p>
          </div>
          <Badge
            variant="outline"
            class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          >
            {{ camposFilaSeleccionada.length }} campos
          </Badge>
        </div>

        <div class="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="campo in camposFilaSeleccionada"
            :key="campo.clave"
            class="rounded-md border border-white/10 bg-black/20 p-3"
          >
            <p class="font-mono text-xs font-semibold text-slate-300">
              {{ campo.clave }}
            </p>
            <p class="mt-2 break-words text-sm leading-6 text-slate-400">
              {{ campo.valor }}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
