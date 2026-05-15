<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilterX,
  Rows3,
  Search,
} from "lucide-vue-next"
import {computed, ref, watch} from "vue"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {NativeSelect, NativeSelectOption} from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface FoursquareOsPreviewRow {
  rowIdx: number
  row: Record<string, unknown>
}

interface FoursquareOsPreviewRowsResponse {
  ok: boolean
  data: {
    sourceLabel: string
    sourceUrl: string
    official: boolean
    dataset: string
    tableName: "places_os"
    page: number
    pageSize: number
    offset: number
    totalRows: number | null
    hasNextPage: boolean
    filters: {
      q: string
      country: string
      website: "all" | "with" | "without"
    }
    queryMode: "rows" | "filter" | "search" | "server_filter"
    rateLimited: boolean
    warning: string | null
    scannedRows: number | null
    rows: FoursquareOsPreviewRow[]
  }
}

const page = ref(1)
const pageSize = ref("25")
const searchTerm = ref("")
const countryFilter = ref("")
const websiteFilter = ref("all")
const appliedSearchTerm = ref("")
const appliedCountryFilter = ref("")
const appliedWebsiteFilter = ref("all")
const selectedRowIdx = ref<number | null>(null)

const rowsQuery = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  q: appliedSearchTerm.value,
  country: appliedCountryFilter.value,
  website: appliedWebsiteFilter.value,
}))

const {
  data: rowsResponse,
  pending: loadingRows,
  error: rowsError,
  refresh: refreshRows,
} = useFetch<FoursquareOsPreviewRowsResponse>("/api/scrap/foursquare-os/rows", {
  query: rowsQuery,
  server: false,
})

const rowsData = computed(() => rowsResponse.value?.data || null)
const rawRows = computed(() => rowsData.value?.rows || [])
const numericPageSize = computed(() => Number(pageSize.value) || 25)
const totalRows = computed(() => rowsData.value?.totalRows ?? null)
const totalPages = computed(() =>
    typeof totalRows.value === "number"
        ? Math.max(1, Math.ceil(totalRows.value / numericPageSize.value))
        : null,
)
const currentFrom = computed(() =>
    rawRows.value.length === 0 ? 0 : (page.value - 1) * numericPageSize.value + 1,
)
const currentTo = computed(() =>
    rawRows.value.length === 0 ? 0 : currentFrom.value + rawRows.value.length - 1,
)
const canPrev = computed(() => page.value > 1 && !loadingRows.value)
const canNext = computed(
    () => Boolean(rowsData.value?.hasNextPage) && !loadingRows.value,
)
const totalRowsLabel = computed(() =>
    typeof totalRows.value === "number"
        ? ` de ${formatNumber(totalRows.value)}`
        : "",
)
const queryModeLabel = computed(() => {
  const mode = rowsData.value?.queryMode || "rows"
  const labels = {
    rows: "rows",
    filter: "HF filter",
    search: "HF search",
    server_filter: "endpoint filter",
  }

  return labels[mode]
})

const selectedRow = computed(
    () =>
        rawRows.value.find((row) => row.rowIdx === selectedRowIdx.value) ||
        rawRows.value[0] ||
        null,
)

const selectedRowEntries = computed(() => {
  if (!selectedRow.value) {
    return []
  }

  return Object.entries(selectedRow.value.row).map(([key, value]) => ({
    key,
    value: formatCellValue(value),
  }))
})

watch(pageSize, () => {
  page.value = 1
})

watch(rawRows, () => {
  selectedRowIdx.value = null
})

function getStringValue(row: Record<string, unknown>, key: string) {
  const value = row[key]

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  return ""
}

function formatCellValue(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") {
    return "-"
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "-"
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(6)
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return String(value)
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "-"
  }

  return new Intl.NumberFormat("en-US").format(value)
}

function selectRow(row: FoursquareOsPreviewRow) {
  selectedRowIdx.value = row.rowIdx
}

function resetFilters() {
  searchTerm.value = ""
  countryFilter.value = ""
  websiteFilter.value = "all"
  appliedSearchTerm.value = ""
  appliedCountryFilter.value = ""
  appliedWebsiteFilter.value = "all"
  selectedRowIdx.value = null

  if (page.value !== 1) {
    page.value = 1
    return
  }

  refreshRows()
}

function consultRows() {
  selectedRowIdx.value = null
  appliedSearchTerm.value = searchTerm.value.trim()
  appliedCountryFilter.value = countryFilter.value.trim().toUpperCase()
  appliedWebsiteFilter.value = websiteFilter.value

  if (page.value !== 1) {
    page.value = 1
    return
  }

  refreshRows()
}

function nextPage() {
  if (canNext.value) {
    page.value += 1
  }
}

function previousPage() {
  if (canPrev.value) {
    page.value -= 1
  }
}

function websiteHref(row: Record<string, unknown>) {
  const website = getStringValue(row, "website")

  if (!website) {
    return null
  }

  return website.startsWith("http://") || website.startsWith("https://")
      ? website
      : `https://${website}`
}
</script>

<template>
  <Card class="border-white/10 bg-black/35 text-white backdrop-blur-xl">
    <CardHeader class="px-4 py-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <Rows3 class="size-4 shrink-0 text-cyan-100"/>
          <div class="min-w-0">
            <CardTitle class="text-base">Filas de Places OS</CardTitle>
            <p class="mt-1 truncate text-xs text-slate-400">
              {{ rowsData?.tableName || "places_os" }} ·
              {{ rowsData?.sourceLabel || "cargando" }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Badge
              variant="outline"
              class="border-amber-300/25 bg-amber-300/10 text-amber-100"
          >
            espejo no oficial
          </Badge>
          <Button
              v-if="rowsData?.sourceUrl"
              as-child
              variant="outline"
              size="sm"
          >
            <a
                :href="rowsData.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
            >
              Fuente
              <ExternalLink class="size-4"/>
            </a>
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-3 px-4 pb-4">
      <div
          v-if="rowsError"
          class="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
      >
        No se pudieron consultar las filas.
      </div>

      <div
          v-if="rowsData?.warning"
          class="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100"
      >
        {{ rowsData.warning }}
      </div>

      <div
          class="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_120px_170px_120px_auto_auto]"
      >
        <div class="relative">
          <Search
              class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
          />
          <Input
              v-model="searchTerm"
              class="pl-9"
              placeholder="Buscar"
              @keyup.enter="consultRows"
          />
        </div>

        <Input
            v-model="countryFilter"
            placeholder="Pais: EC, ECU o Ecuador"
            @keyup.enter="consultRows"
        />

        <NativeSelect v-model="websiteFilter" class="w-full">
          <NativeSelectOption value="all"
          >Todos los websites
          </NativeSelectOption
          >
          <NativeSelectOption value="with">Con website</NativeSelectOption>
          <NativeSelectOption value="without">Sin website</NativeSelectOption>
        </NativeSelect>

        <NativeSelect v-model="pageSize" class="w-full">
          <NativeSelectOption value="10">10 filas</NativeSelectOption>
          <NativeSelectOption value="25">25 filas</NativeSelectOption>
          <NativeSelectOption value="50">50 filas</NativeSelectOption>
          <NativeSelectOption value="100">100 filas</NativeSelectOption>
        </NativeSelect>

        <Button
            type="button"
            :disabled="loadingRows"
            class="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
            @click="consultRows"
        >
          <Search :class="['size-4', loadingRows && 'animate-pulse']"/>
          Consultar
        </Button>

        <Button type="button" variant="outline" @click="resetFilters">
          <FilterX class="size-4"/>
          Limpiar
        </Button>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
        <p class="text-slate-400">
          {{ formatNumber(currentFrom) }}-{{
            formatNumber(currentTo)
          }}{{ totalRowsLabel }}
        </p>
        <p class="text-slate-500">consulta: {{ queryModeLabel }}</p>
      </div>

      <div
          class="max-h-[620px] overflow-auto rounded-lg border border-white/10"
      >
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-[#07111c]">
            <TableRow>
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
                v-for="item in rawRows"
                :key="item.rowIdx"
                :class="[
                'cursor-pointer transition-colors hover:bg-white/[0.06]',
                selectedRow?.rowIdx === item.rowIdx && 'bg-white/[0.08]',
              ]"
                @click="selectRow(item)"
            >
              <TableCell class="font-mono text-xs">
                {{ formatCellValue(item.row.date_created) }}
              </TableCell>
              <TableCell class="font-mono text-xs text-slate-400">
                {{ formatNumber(item.rowIdx) }}
              </TableCell>
              <TableCell>
                <p class="font-semibold">
                  {{ formatCellValue(item.row.name) }}
                </p>
                <p class="mt-1 font-mono text-xs text-cyan-100/80">
                  {{ formatCellValue(item.row.fsq_place_id) }}
                </p>
              </TableCell>
              <TableCell class="max-w-[280px] whitespace-normal break-all">
                <a
                    v-if="websiteHref(item.row)"
                    :href="websiteHref(item.row) || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-cyan-100 underline-offset-4 hover:underline"
                    @click.stop
                >
                  {{ formatCellValue(item.row.website) }}
                </a>
                <span v-else class="text-slate-500">-</span>
              </TableCell>
              <TableCell>{{ formatCellValue(item.row.tel) }}</TableCell>
              <TableCell class="max-w-[300px] whitespace-normal">
                <p>{{ formatCellValue(item.row.address) }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ formatCellValue(item.row.locality) }},
                  {{ formatCellValue(item.row.region) }}
                  · {{ formatCellValue(item.row.country) }}
                </p>
              </TableCell>
              <TableCell class="font-mono text-xs">
                {{ formatCellValue(item.row.latitude) }},
                {{ formatCellValue(item.row.longitude) }}
              </TableCell>
              <TableCell class="max-w-[360px] whitespace-normal text-sm">
                {{ formatCellValue(item.row.fsq_category_labels) }}
              </TableCell>
            </TableRow>
            <TableEmpty v-if="!rawRows.length" :colspan="8">
              No hay filas para esta consulta.
            </TableEmpty>
          </TableBody>
        </Table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="font-mono text-xs text-slate-500">
          offset {{ formatNumber(rowsData?.offset || 0) }}
          <span v-if="rowsData?.scannedRows">
            · scan {{ formatNumber(rowsData.scannedRows) }}</span
          >
        </p>
        <div class="flex items-center gap-2">
          <Button
              type="button"
              size="sm"
              variant="outline"
              :disabled="!canPrev"
              @click="previousPage"
          >
            <ChevronLeft class="size-4"/>
            Anterior
          </Button>
          <p class="text-xs text-slate-400">
            Pagina {{
              formatNumber(page)
            }}<span v-if="totalPages"> de {{ formatNumber(totalPages) }}</span>
          </p>
          <Button
              type="button"
              size="sm"
              variant="outline"
              :disabled="!canNext"
              @click="nextPage"
          >
            Siguiente
            <ChevronRight class="size-4"/>
          </Button>
        </div>
      </div>

      <div class="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold">Detalle de fila</p>
            <p class="mt-1 font-mono text-xs text-cyan-100/80">
              row_idx {{ selectedRow ? formatNumber(selectedRow.rowIdx) : "-" }}
            </p>
          </div>
          <Badge
              variant="outline"
              class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          >
            {{ selectedRowEntries.length }} campos
          </Badge>
        </div>

        <div class="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <div
              v-for="entry in selectedRowEntries"
              :key="entry.key"
              class="rounded-md border border-white/10 bg-black/20 p-3"
          >
            <p class="font-mono text-xs font-semibold text-slate-300">
              {{ entry.key }}
            </p>
            <p class="mt-2 break-words text-sm leading-6 text-slate-400">
              {{ entry.value }}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
