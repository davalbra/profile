<script setup lang="ts">
import {
  FilterX,
  Globe2,
  Layers3,
  LocateFixed,
  MapPin,
  RefreshCw,
} from "lucide-vue-next"
import "maplibre-gl/dist/maplibre-gl.css"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useScrapRepositorio } from "@/store/repository/scrap"
import type { PuntoMapaPlacesOs, TablaPlacesOsGuardada } from "@/types/scrap"
import { FiltroWebsitePlacesOs } from "@/utils/enums/anums"
import type { Map, Marker, Popup } from "maplibre-gl"

interface OpcionPaisMapa {
  value: string
  label: string
}

interface CentroMapaPlacesOs {
  longitude: number
  latitude: number
  zoom: number
}

/** Services, Components */
const scrapRepositorio = useScrapRepositorio()

/** DefineModel, Ref, Computed */
const contenedorMapa = ref<HTMLDivElement | null>(null)
const tablas = ref<TablaPlacesOsGuardada[]>([])
const puntos = ref<PuntoMapaPlacesOs[]>([])
const tablaActiva = ref<TablaPlacesOsGuardada | null>(null)
const puntoSeleccionado = ref<PuntoMapaPlacesOs | null>(null)
const pais = ref("")
const website = ref<FiltroWebsitePlacesOs>(FiltroWebsitePlacesOs.CON_WEBSITE)
const tablaSeleccionada = ref("")
const limite = ref("250")
const busqueda = ref("")
const cargandoTablas = ref(false)
const cargandoMapa = ref(false)
const mapaListo = ref(false)
const errorTablas = ref(false)
const errorMapa = ref(false)

let moduloMapLibre: typeof import("maplibre-gl") | null = null
let mapaPlacesOs: Map | null = null
let marcadoresMapa: Marker[] = []
let popupActivo: Popup | null = null
let observadorTamanoMapa: ResizeObserver | null = null

const estiloMapa = "https://tiles.openfreemap.org/styles/liberty"
const fuenteTerreno = "terreno_places_os"
const terrenoMapterhorn = "https://tiles.mapterhorn.com/tilejson.json"

const opcionesPais = computed<OpcionPaisMapa[]>(() => {
  const codigos: string[] = []

  for (const tabla of tablas.value) {
    if (!codigos.includes(tabla.country)) {
      codigos.push(tabla.country)
    }
  }

  return codigos
    .sort((izquierda, derecha) => izquierda.localeCompare(derecha))
    .map((codigo) => ({
      value: codigo,
      label: obtenerEtiquetaPais(codigo),
    }))
})

const tablasFiltradas = computed(() =>
  tablas.value.filter(
    (tabla) =>
      (!pais.value || tabla.country === pais.value) &&
      tabla.website === website.value,
  ),
)

const limiteNumerico = computed(() => Number(limite.value) || 250)
const totalPuntos = computed(() => puntos.value.length)
const puntoDestacado = computed(
  () => puntoSeleccionado.value || puntos.value[0] || null,
)
const puedeConsultar = computed(
  () => Boolean(tablaSeleccionada.value) && !cargandoMapa.value,
)
const centroInicial = computed<CentroMapaPlacesOs>(() => {
  if (puntos.value.length) {
    const suma = puntos.value.reduce(
      (acumulado, punto) => ({
        longitude: acumulado.longitude + punto.longitude,
        latitude: acumulado.latitude + punto.latitude,
      }),
      {
        longitude: 0,
        latitude: 0,
      },
    )

    return {
      longitude: suma.longitude / puntos.value.length,
      latitude: suma.latitude / puntos.value.length,
      zoom: 6,
    }
  }

  return {
    longitude: -78.4678,
    latitude: -0.1807,
    zoom: 5,
  }
})

/** Functions */
async function cargarModuloMapLibre() {
  if (!moduloMapLibre) {
    moduloMapLibre = await import("maplibre-gl")
  }

  return moduloMapLibre
}

function obtenerEtiquetaPais(codigo: string) {
  const nombres = new Intl.DisplayNames(["es"], { type: "region" })

  return nombres.of(codigo) || codigo
}

function formatearNumero(valor: number | null) {
  if (typeof valor !== "number") {
    return "-"
  }

  return new Intl.NumberFormat("en-US").format(valor)
}

function obtenerPaisInicial(items: OpcionPaisMapa[]) {
  return (
    items.find((item) => item.value === "EC")?.value || items[0]?.value || ""
  )
}

function seleccionarTablaDesdeFiltros() {
  const existeTablaSeleccionada = tablasFiltradas.value.some(
    (tabla) => tabla.tableName === tablaSeleccionada.value,
  )

  if (!existeTablaSeleccionada) {
    tablaSeleccionada.value = tablasFiltradas.value[0]?.tableName || ""
  }
}

async function cargarTablas() {
  cargandoTablas.value = true
  errorTablas.value = false

  try {
    const respuesta = await scrapRepositorio.obtenerTablasPlacesOs({
      pais: "",
      website: null,
    })
    tablas.value = respuesta.data.data.tables

    if (!pais.value) {
      pais.value = obtenerPaisInicial(opcionesPais.value)
    }

    seleccionarTablaDesdeFiltros()
  } catch {
    errorTablas.value = true
  } finally {
    cargandoTablas.value = false
  }
}

async function cargarMapa() {
  if (!tablaSeleccionada.value) {
    puntos.value = []
    tablaActiva.value = null
    puntoSeleccionado.value = null
    actualizarMarcadores()
    return
  }

  cargandoMapa.value = true
  errorMapa.value = false

  try {
    const respuesta = await scrapRepositorio.obtenerMapaPlacesOs({
      tableName: tablaSeleccionada.value,
      pais: pais.value,
      website: website.value,
      limite: limiteNumerico.value,
      q: busqueda.value.trim(),
    })
    puntos.value = respuesta.data.data.points
    tablaActiva.value = respuesta.data.data.table
    puntoSeleccionado.value = puntos.value[0] || null
    actualizarMarcadores()
  } catch {
    errorMapa.value = true
    puntos.value = []
    tablaActiva.value = null
    puntoSeleccionado.value = null
    actualizarMarcadores()
  } finally {
    cargandoMapa.value = false
  }
}

function limpiarFiltros() {
  pais.value = obtenerPaisInicial(opcionesPais.value)
  website.value = FiltroWebsitePlacesOs.CON_WEBSITE
  busqueda.value = ""
  limite.value = "250"
  seleccionarTablaDesdeFiltros()
  void cargarMapa()
}

function manejarFiltroTabla() {
  seleccionarTablaDesdeFiltros()
  void cargarMapa()
}

function crearContenidoPopup(punto: PuntoMapaPlacesOs) {
  const contenedor = document.createElement("div")
  contenedor.className = "min-w-[220px] space-y-1 text-slate-900"

  const titulo = document.createElement("p")
  titulo.className = "font-semibold"
  titulo.textContent = punto.name || "Ubicacion guardada"

  const websiteTexto = document.createElement("p")
  websiteTexto.className = "break-all font-mono text-xs text-cyan-700"
  websiteTexto.textContent = punto.website || "Sin website"

  const ubicacion = document.createElement("p")
  ubicacion.className = "text-xs text-slate-600"
  ubicacion.textContent = `${punto.locality || "-"}, ${punto.region || punto.country}`

  contenedor.appendChild(titulo)
  contenedor.appendChild(websiteTexto)
  contenedor.appendChild(ubicacion)

  return contenedor
}

function crearElementoMarcador(punto: PuntoMapaPlacesOs) {
  const elemento = document.createElement("button")
  elemento.type = "button"
  elemento.className = "places-os-map-marker"
  elemento.setAttribute(
    "aria-label",
    punto.name || punto.website || "Ubicacion Places OS",
  )
  elemento.addEventListener("click", () => {
    puntoSeleccionado.value = punto
  })

  return elemento
}

async function actualizarMarcadores() {
  const mapa = mapaPlacesOs

  limpiarMarcadores()

  if (!mapa) {
    return
  }

  const modulo = await cargarModuloMapLibre()
  const limites = new modulo.LngLatBounds()
  let totalLimites = 0

  for (const punto of puntos.value) {
    const marcador = new modulo.Marker({
      element: crearElementoMarcador(punto),
      anchor: "bottom",
    })
      .setLngLat({
        lng: punto.longitude,
        lat: punto.latitude,
      })
      .setPopup(
        new modulo.Popup({
          closeButton: false,
          offset: 18,
          maxWidth: "320px",
        }).setDOMContent(crearContenidoPopup(punto)),
      )
      .addTo(mapa)

    marcadoresMapa.push(marcador)
    limites.extend({
      lng: punto.longitude,
      lat: punto.latitude,
    })
    totalLimites += 1
  }

  if (totalLimites) {
    mapa.fitBounds(limites, {
      padding: {
        top: 90,
        right: 90,
        bottom: 130,
        left: 90,
      },
      maxZoom: 13.5,
      duration: 900,
    })
    mapa.easeTo({
      pitch: 62,
      bearing: -22,
      duration: 900,
    })
  } else {
    mapa.easeTo({
      center: {
        lng: centroInicial.value.longitude,
        lat: centroInicial.value.latitude,
      },
      zoom: centroInicial.value.zoom,
      pitch: 58,
      bearing: -18,
      duration: 700,
    })
  }
}

function limpiarMarcadores() {
  for (const marcador of marcadoresMapa) {
    marcador.remove()
  }

  marcadoresMapa = []

  if (popupActivo) {
    popupActivo.remove()
    popupActivo = null
  }
}

function configurarTerreno() {
  const mapa = mapaPlacesOs

  if (!mapa || mapa.getSource(fuenteTerreno)) {
    return
  }

  mapa.addSource(fuenteTerreno, {
    type: "raster-dem",
    url: terrenoMapterhorn,
    tileSize: 256,
  })

  mapa.setTerrain({
    source: fuenteTerreno,
    exaggeration: 1.15,
  })
}

function observarTamanoMapa() {
  const contenedor = contenedorMapa.value

  if (!contenedor || observadorTamanoMapa) {
    return
  }

  observadorTamanoMapa = new ResizeObserver(() => {
    mapaPlacesOs?.resize()
  })
  observadorTamanoMapa.observe(contenedor)
  window.requestAnimationFrame(() => {
    mapaPlacesOs?.resize()
  })
}

async function inicializarMapa() {
  const contenedor = contenedorMapa.value

  if (!contenedor || mapaPlacesOs) {
    return
  }

  const modulo = await cargarModuloMapLibre()
  const mapa = new modulo.Map({
    container: contenedor,
    style: estiloMapa,
    center: {
      lng: centroInicial.value.longitude,
      lat: centroInicial.value.latitude,
    },
    zoom: centroInicial.value.zoom,
    pitch: 58,
    bearing: -18,
    maxPitch: 85,
    attributionControl: {
      compact: true,
    },
  })

  mapa.addControl(
    new modulo.NavigationControl({
      visualizePitch: true,
      showZoom: true,
      showCompass: true,
    }),
    "top-right",
  )
  mapa.addControl(new modulo.FullscreenControl(), "top-right")
  mapa.on("load", () => {
    mapaListo.value = true
    configurarTerreno()
    void actualizarMarcadores()
  })

  mapaPlacesOs = mapa
  observarTamanoMapa()
}

function destruirMapa() {
  limpiarMarcadores()
  observadorTamanoMapa?.disconnect()
  observadorTamanoMapa = null
  mapaPlacesOs?.remove()
  mapaPlacesOs = null
  mapaListo.value = false
}

async function iniciarMapa() {
  await inicializarMapa()
  await cargarTablas()
  await cargarMapa()
}

/** Vue */
watch([pais, website], () => {
  seleccionarTablaDesdeFiltros()
})

watch(tablaSeleccionada, () => {
  void cargarMapa()
})

onMounted(() => {
  void iniciarMapa()
})

onBeforeUnmount(() => {
  destruirMapa()
})
</script>

<template>
  <section class="space-y-3 text-white">
    <div
      class="grid gap-2 rounded-lg border border-white/10 bg-black/35 p-3 backdrop-blur-xl xl:grid-cols-[minmax(160px,1fr)_190px_minmax(260px,1.2fr)_130px_minmax(180px,1fr)_auto_auto]"
    >
      <NativeSelect v-model="pais" class="w-full" :disabled="cargandoTablas">
        <NativeSelectOption value="">Todos los paises</NativeSelectOption>
        <NativeSelectOption
          v-for="item in opcionesPais"
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

      <NativeSelect
        v-model="tablaSeleccionada"
        class="w-full"
        :disabled="cargandoTablas || !tablasFiltradas.length"
      >
        <NativeSelectOption value="">Sin tabla guardada</NativeSelectOption>
        <NativeSelectOption
          v-for="tabla in tablasFiltradas"
          :key="tabla.tableName"
          :value="tabla.tableName"
        >
          {{ tabla.tableName }}
        </NativeSelectOption>
      </NativeSelect>

      <NativeSelect v-model="limite" class="w-full">
        <NativeSelectOption value="100">100 puntos</NativeSelectOption>
        <NativeSelectOption value="250">250 puntos</NativeSelectOption>
        <NativeSelectOption value="500">500 puntos</NativeSelectOption>
        <NativeSelectOption value="1000">1000 puntos</NativeSelectOption>
      </NativeSelect>

      <Input
        v-model="busqueda"
        placeholder="Buscar"
        @keyup.enter="cargarMapa"
      />

      <Button
        type="button"
        :disabled="!puedeConsultar"
        class="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
        @click="manejarFiltroTabla"
      >
        <RefreshCw :class="['size-4', cargandoMapa && 'animate-spin']" />
        Filtrar
      </Button>

      <Button type="button" variant="outline" @click="limpiarFiltros">
        <FilterX class="size-4" />
        Limpiar
      </Button>
    </div>

    <div
      v-if="errorTablas || errorMapa"
      class="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
    >
      No se pudieron consultar los datos guardados en Neon.
    </div>

    <div
      class="relative h-[680px] min-h-[680px] overflow-hidden rounded-lg border border-white/10 bg-[#020617]"
    >
      <div ref="contenedorMapa" class="h-full w-full" />

      <div
        class="pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2"
      >
        <Badge
          variant="outline"
          class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100 backdrop-blur"
        >
          <Globe2 class="size-3.5" />
          MapLibre GL
        </Badge>
        <Badge
          variant="outline"
          class="border-emerald-300/25 bg-emerald-300/10 text-emerald-100 backdrop-blur"
        >
          <Layers3 class="size-3.5" />
          {{ tablaActiva?.tableName || "sin tabla" }}
        </Badge>
        <Badge
          variant="outline"
          class="border-amber-300/25 bg-amber-300/10 text-amber-100 backdrop-blur"
        >
          <MapPin class="size-3.5" />
          {{ formatearNumero(totalPuntos) }} puntos
        </Badge>
      </div>

      <div
        class="pointer-events-none absolute right-3 bottom-3 w-[min(380px,calc(100%-1.5rem))] rounded-lg border border-white/10 bg-black/65 p-3 text-sm backdrop-blur-xl"
      >
        <div class="flex items-center gap-2 text-cyan-100">
          <LocateFixed class="size-4" />
          <p class="truncate font-semibold">
            {{ puntoDestacado?.name || "Sin puntos guardados" }}
          </p>
        </div>
        <p class="mt-2 truncate font-mono text-xs text-slate-300">
          {{ puntoDestacado?.website || tablaActiva?.label || "-" }}
        </p>
        <p class="mt-2 text-xs text-slate-500">
          {{ puntoDestacado?.locality || "-" }},
          {{ puntoDestacado?.region || puntoDestacado?.country || "-" }}
        </p>
      </div>
    </div>

    <div class="grid gap-2 md:grid-cols-3">
      <div class="rounded-lg border border-white/10 bg-black/25 p-3">
        <p class="text-xs text-slate-500">Tabla maestra</p>
        <p class="mt-1 truncate font-mono text-sm text-cyan-100">
          places_os_tablas_exportadas
        </p>
      </div>
      <div class="rounded-lg border border-white/10 bg-black/25 p-3">
        <p class="text-xs text-slate-500">Filas en tabla</p>
        <p class="mt-1 font-mono text-sm text-emerald-100">
          {{ formatearNumero(tablaActiva?.totalRows || null) }}
        </p>
      </div>
      <div class="rounded-lg border border-white/10 bg-black/25 p-3">
        <p class="text-xs text-slate-500">Ultima exportacion</p>
        <p class="mt-1 font-mono text-sm text-slate-300">
          {{ formatearNumero(tablaActiva?.lastExportedRows || null) }} filas
        </p>
      </div>
    </div>
  </section>
</template>

<style>
.places-os-map-marker {
  width: 18px;
  height: 18px;
  cursor: pointer;
  border: 2px solid rgba(236, 253, 245, 0.95);
  border-radius: 9999px;
  background: #22d3ee;
  box-shadow:
    0 0 0 5px rgba(34, 211, 238, 0.2),
    0 12px 28px rgba(8, 47, 73, 0.45);
  transform: translateY(-2px);
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    background 140ms ease;
}

.places-os-map-marker:hover,
.places-os-map-marker:focus-visible {
  background: #34d399;
  box-shadow:
    0 0 0 7px rgba(52, 211, 153, 0.24),
    0 16px 34px rgba(6, 78, 59, 0.5);
  outline: none;
  transform: translateY(-5px) scale(1.12);
}

.maplibregl-popup-content {
  border-radius: 8px;
  padding: 10px 12px;
}

.maplibregl-ctrl-group {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(12px);
}

.maplibregl-ctrl button {
  color: #e0f2fe;
}
</style>
