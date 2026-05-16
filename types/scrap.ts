import type { FiltroWebsitePlacesOs } from "@/utils/enums/anums"

export type ValorCampoPlacesOs =
  | string
  | number
  | boolean
  | null
  | ValorCampoPlacesOs[]
  | RegistroPlacesOs

export interface RegistroPlacesOs {
  [clave: string]: ValorCampoPlacesOs
}

export interface FilaPlacesOs {
  rowIdx: number
  row: RegistroPlacesOs
}

export interface FiltroFilasPlacesOs {
  q: string
  country: string
  timezone: string
  website: FiltroWebsitePlacesOs
}

export interface ConsultaFilasPlacesOs {
  page: number
  pageSize: number
  q: string
  country: string
  timezone: string
  website: FiltroWebsitePlacesOs
}

export interface DatosFilasPlacesOs {
  sourceLabel: string
  sourceUrl: string
  official: boolean
  dataset: string
  tableName: string
  page: number
  pageSize: number
  offset: number
  totalRows: number | null
  hasNextPage: boolean
  filters: FiltroFilasPlacesOs
  queryMode: "rows" | "filter" | "search" | "server_filter"
  rateLimited: boolean
  warning: string | null
  scannedRows: number | null
  rows: FilaPlacesOs[]
}

export interface RespuestaFilasPlacesOs {
  ok: boolean
  data: DatosFilasPlacesOs
}

export interface PaisPlacesOs {
  value: string
  label: string
  timezones: string[]
  tableName: string
}

export interface RespuestaPaisesPlacesOs {
  ok: boolean
  data: {
    countries: PaisPlacesOs[]
  }
}

export interface ConsultaExportacionPlacesOs {
  pais: string
  website: FiltroWebsitePlacesOs
  limite: number
}

export interface ResultadoExportacionPlacesOs {
  tableName: string
  country: string
  website: FiltroWebsitePlacesOs
  requestedLimit: number
  fetchedRows: number
  insertedRows: number
  updatedRows: number
  skippedRows: number
}

export interface RespuestaExportacionPlacesOs {
  ok: boolean
  data: ResultadoExportacionPlacesOs
}

export interface TablaPlacesOsGuardada {
  tableName: string
  country: string
  website: FiltroWebsitePlacesOs
  label: string
  totalRows: number
  lastExportedRows: number
  createdAt: string
  updatedAt: string
}

export interface ConsultaTablasPlacesOs {
  pais: string
  website: FiltroWebsitePlacesOs | null
}

export interface RespuestaTablasPlacesOs {
  ok: boolean
  data: {
    tables: TablaPlacesOsGuardada[]
  }
}

export interface PuntoMapaPlacesOs {
  id: string
  name: string | null
  latitude: number
  longitude: number
  country: string
  timezone: string | null
  website: string | null
  tel: string | null
  address: string | null
  locality: string | null
  region: string | null
  tableName: string
  updatedAt: string | null
}

export interface ConsultaMapaPlacesOs {
  tableName: string
  pais: string
  website: FiltroWebsitePlacesOs
  limite: number
  q: string
}

export interface RespuestaMapaPlacesOs {
  ok: boolean
  data: {
    table: TablaPlacesOsGuardada | null
    points: PuntoMapaPlacesOs[]
    totalPoints: number
    filters: {
      country: string
      website: FiltroWebsitePlacesOs
      limite: number
      q: string
    }
  }
}
