import pg from "pg"
import type { FoursquareOsJsonObject } from "@/lib/foursquare/os-places"
import { FiltroWebsitePlacesOs } from "@/utils/enums/anums"

export interface FilaExportablePlacesOs {
  rowIdx: number
  row: FoursquareOsJsonObject
}

export interface ResultadoExportacionFilasPlacesOs {
  insertadas: number
  actualizadas: number
  omitidas: number
}

export interface TablaMaestraPlacesOs {
  tableName: string
  country: string
  website: FiltroWebsitePlacesOs
  label: string
  totalRows: number
  lastExportedRows: number
  createdAt: string
  updatedAt: string
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

interface FilaTablaMaestraPlacesOs {
  table_name: string
  country: string
  website_filter: FiltroWebsitePlacesOs
  label: string
  total_rows: number
  last_exported_rows: number
  created_at: Date
  updated_at: Date
}

interface FilaNombreTablaPlacesOs {
  table_name: string
}

interface FilaTotalPlacesOs {
  total: number
}

interface FilaMapaPlacesOs {
  fsq_place_id: string
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
  updated_at: Date | null
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const tablaMaestraPlacesOs = "places_os_tablas_exportadas"

export const maximoFilasExportacionPlacesOs = 500

export function normalizarPaisPlacesOs(valor: string | null) {
  return (valor || "").trim().toUpperCase()
}

export function normalizarWebsitePlacesOs(
  valor: string | null,
): FiltroWebsitePlacesOs {
  if (valor === FiltroWebsitePlacesOs.SIN_WEBSITE) {
    return FiltroWebsitePlacesOs.SIN_WEBSITE
  }

  if (valor === FiltroWebsitePlacesOs.TODOS) {
    return FiltroWebsitePlacesOs.TODOS
  }

  return FiltroWebsitePlacesOs.CON_WEBSITE
}

export function normalizarLimitePlacesOs(
  valor: number | null,
  limitePorDefecto: number,
  limiteMaximo: number,
) {
  if (!Number.isFinite(valor) || !valor || valor < 1) {
    return limitePorDefecto
  }

  return Math.min(Math.floor(valor), limiteMaximo)
}

function normalizarSegmentoTablaPlacesOs(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function obtenerSegmentoWebsitePlacesOs(website: FiltroWebsitePlacesOs) {
  if (website === FiltroWebsitePlacesOs.CON_WEBSITE) {
    return "con_website"
  }

  if (website === FiltroWebsitePlacesOs.SIN_WEBSITE) {
    return "sin_website"
  }

  return "todos_los_websites"
}

function obtenerEtiquetaWebsitePlacesOs(website: FiltroWebsitePlacesOs) {
  if (website === FiltroWebsitePlacesOs.CON_WEBSITE) {
    return "Con website"
  }

  if (website === FiltroWebsitePlacesOs.SIN_WEBSITE) {
    return "Sin website"
  }

  return "Todos los websites"
}

export function construirNombreTablaPlacesOs(input: {
  country: string
  website: FiltroWebsitePlacesOs
}) {
  return `places_os_${normalizarSegmentoTablaPlacesOs(input.country)}_${obtenerSegmentoWebsitePlacesOs(input.website)}`
}

function construirEtiquetaTablaPlacesOs(input: {
  country: string
  website: FiltroWebsitePlacesOs
}) {
  return `${input.country} · ${obtenerEtiquetaWebsitePlacesOs(input.website)}`
}

export function validarIdentificadorTablaPlacesOs(nombreTabla: string) {
  if (!/^places_os_[a-z0-9_]+$/.test(nombreTabla)) {
    throw new Error("Nombre de tabla invalido.")
  }

  return `"${nombreTabla}"`
}

function validarIdentificadorIndicePlacesOs(nombreIndice: string) {
  if (!/^idx_places_os_[a-z0-9_]+$/.test(nombreIndice)) {
    throw new Error("Nombre de indice invalido.")
  }

  return `"${nombreIndice}"`
}

function obtenerTextoPlacesOs(row: FoursquareOsJsonObject, clave: string) {
  const valor = row[clave]

  if (typeof valor === "string") {
    return valor
  }

  if (typeof valor === "number") {
    return String(valor)
  }

  return null
}

function obtenerNumeroPlacesOs(row: FoursquareOsJsonObject, clave: string) {
  const valor = row[clave]

  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor
  }

  if (typeof valor === "string") {
    const numero = Number(valor)

    return Number.isFinite(numero) ? numero : null
  }

  return null
}

function mapearTablaMaestraPlacesOs(
  fila: FilaTablaMaestraPlacesOs,
): TablaMaestraPlacesOs {
  return {
    tableName: fila.table_name,
    country: fila.country,
    website: fila.website_filter,
    label: fila.label,
    totalRows: fila.total_rows,
    lastExportedRows: fila.last_exported_rows,
    createdAt: fila.created_at.toISOString(),
    updatedAt: fila.updated_at.toISOString(),
  }
}

function leerMetadatosNombreTablaPlacesOs(nombreTabla: string) {
  const prefijo = "places_os_"
  const sufijoConWebsite = "_con_website"
  const sufijoSinWebsite = "_sin_website"
  const sufijoTodosWebsites = "_todos_los_websites"
  let website: FiltroWebsitePlacesOs | null = null
  let sufijo = ""

  if (nombreTabla.endsWith(sufijoConWebsite)) {
    website = FiltroWebsitePlacesOs.CON_WEBSITE
    sufijo = sufijoConWebsite
  }

  if (nombreTabla.endsWith(sufijoSinWebsite)) {
    website = FiltroWebsitePlacesOs.SIN_WEBSITE
    sufijo = sufijoSinWebsite
  }

  if (nombreTabla.endsWith(sufijoTodosWebsites)) {
    website = FiltroWebsitePlacesOs.TODOS
    sufijo = sufijoTodosWebsites
  }

  if (!nombreTabla.startsWith(prefijo) || !website || !sufijo) {
    return null
  }

  const country = nombreTabla
    .slice(prefijo.length, nombreTabla.length - sufijo.length)
    .toUpperCase()

  if (!country) {
    return null
  }

  return {
    country,
    website,
  }
}

export async function asegurarTablaMaestraPlacesOs() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${tablaMaestraPlacesOs}" (
      table_name TEXT PRIMARY KEY,
      country TEXT NOT NULL,
      website_filter TEXT NOT NULL,
      label TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      last_exported_rows INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "idx_places_os_tablas_exportadas_country"
    ON "${tablaMaestraPlacesOs}" (country)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "idx_places_os_tablas_exportadas_website"
    ON "${tablaMaestraPlacesOs}" (website_filter)
  `)
}

export async function asegurarTablaDatosPlacesOs(nombreTabla: string) {
  const tabla = validarIdentificadorTablaPlacesOs(nombreTabla)
  const indicePais = validarIdentificadorIndicePlacesOs(
    `idx_${nombreTabla}_country`,
  )
  const indiceWebsite = validarIdentificadorIndicePlacesOs(
    `idx_${nombreTabla}_website`,
  )

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${tabla} (
      fsq_place_id TEXT PRIMARY KEY,
      row_idx BIGINT NOT NULL,
      name TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      country TEXT NOT NULL,
      timezone TEXT,
      website TEXT,
      tel TEXT,
      address TEXT,
      locality TEXT,
      region TEXT,
      payload JSONB NOT NULL,
      exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query(
    `CREATE INDEX IF NOT EXISTS ${indicePais} ON ${tabla} (country)`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS ${indiceWebsite} ON ${tabla} (website)`,
  )
}

async function contarFilasTablaPlacesOs(nombreTabla: string) {
  const tabla = validarIdentificadorTablaPlacesOs(nombreTabla)
  const resultado = await pool.query<FilaTotalPlacesOs>(
    `SELECT count(*)::int AS total FROM ${tabla}`,
  )

  return resultado.rows[0]?.total ?? 0
}

async function registrarTablaDescubiertaPlacesOs(input: {
  nombreTabla: string
  country: string
  website: FiltroWebsitePlacesOs
  totalRows: number
}) {
  await pool.query(
    `
      INSERT INTO "${tablaMaestraPlacesOs}" (
        table_name,
        country,
        website_filter,
        label,
        total_rows,
        last_exported_rows
      )
      VALUES ($1, $2, $3, $4, $5, 0)
      ON CONFLICT (table_name) DO UPDATE SET
        country = EXCLUDED.country,
        website_filter = EXCLUDED.website_filter,
        label = EXCLUDED.label,
        total_rows = EXCLUDED.total_rows,
        updated_at = now()
    `,
    [
      input.nombreTabla,
      input.country,
      input.website,
      construirEtiquetaTablaPlacesOs({
        country: input.country,
        website: input.website,
      }),
      input.totalRows,
    ],
  )
}

export async function actualizarTablaMaestraPlacesOs(input: {
  nombreTabla: string
  country: string
  website: FiltroWebsitePlacesOs
  filasExportadas: number
}) {
  await asegurarTablaMaestraPlacesOs()

  const totalRows = await contarFilasTablaPlacesOs(input.nombreTabla)

  await pool.query(
    `
      INSERT INTO "${tablaMaestraPlacesOs}" (
        table_name,
        country,
        website_filter,
        label,
        total_rows,
        last_exported_rows
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (table_name) DO UPDATE SET
        country = EXCLUDED.country,
        website_filter = EXCLUDED.website_filter,
        label = EXCLUDED.label,
        total_rows = EXCLUDED.total_rows,
        last_exported_rows = EXCLUDED.last_exported_rows,
        updated_at = now()
    `,
    [
      input.nombreTabla,
      input.country,
      input.website,
      construirEtiquetaTablaPlacesOs({
        country: input.country,
        website: input.website,
      }),
      totalRows,
      input.filasExportadas,
    ],
  )
}

export async function sincronizarTablaMaestraPlacesOs() {
  await asegurarTablaMaestraPlacesOs()

  const resultado = await pool.query<FilaNombreTablaPlacesOs>(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name LIKE 'places_os_%'
        AND table_name <> $1
      ORDER BY table_name
    `,
    [tablaMaestraPlacesOs],
  )

  for (const fila of resultado.rows) {
    const metadatos = leerMetadatosNombreTablaPlacesOs(fila.table_name)

    if (!metadatos) {
      continue
    }

    const totalRows = await contarFilasTablaPlacesOs(fila.table_name)
    await registrarTablaDescubiertaPlacesOs({
      nombreTabla: fila.table_name,
      country: metadatos.country,
      website: metadatos.website,
      totalRows,
    })
  }
}

export async function listarTablasPlacesOs(input: {
  country: string
  website: FiltroWebsitePlacesOs | null
}) {
  await sincronizarTablaMaestraPlacesOs()

  const condiciones: string[] = []
  const valores: string[] = []
  let indiceParametro = 1

  if (input.country) {
    condiciones.push(`country = $${indiceParametro}`)
    valores.push(input.country)
    indiceParametro += 1
  }

  if (input.website) {
    condiciones.push(`website_filter = $${indiceParametro}`)
    valores.push(input.website)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""
  const resultado = await pool.query<FilaTablaMaestraPlacesOs>(
    `
      SELECT
        table_name,
        country,
        website_filter,
        label,
        total_rows,
        last_exported_rows,
        created_at,
        updated_at
      FROM "${tablaMaestraPlacesOs}"
      ${where}
      ORDER BY updated_at DESC, table_name ASC
    `,
    valores,
  )

  return resultado.rows.map(mapearTablaMaestraPlacesOs)
}

export async function exportarFilasPlacesOs(input: {
  nombreTabla: string
  filas: FilaExportablePlacesOs[]
}) {
  const tabla = validarIdentificadorTablaPlacesOs(input.nombreTabla)
  const ids: string[] = []

  for (const fila of input.filas) {
    const id = obtenerTextoPlacesOs(fila.row, "fsq_place_id")

    if (id) {
      ids.push(id)
    }
  }

  const existentes = new Set<string>()

  if (ids.length) {
    const resultado = await pool.query<{ fsq_place_id: string }>(
      `SELECT fsq_place_id FROM ${tabla} WHERE fsq_place_id = ANY($1)`,
      [ids],
    )

    for (const fila of resultado.rows) {
      existentes.add(fila.fsq_place_id)
    }
  }

  let insertadas = 0
  let actualizadas = 0
  let omitidas = 0

  for (const fila of input.filas) {
    const id = obtenerTextoPlacesOs(fila.row, "fsq_place_id")

    if (!id) {
      omitidas += 1
      continue
    }

    const yaExiste = existentes.has(id)

    await pool.query(
      `
        INSERT INTO ${tabla} (
          fsq_place_id,
          row_idx,
          name,
          latitude,
          longitude,
          country,
          timezone,
          website,
          tel,
          address,
          locality,
          region,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
        ON CONFLICT (fsq_place_id) DO UPDATE SET
          row_idx = EXCLUDED.row_idx,
          name = EXCLUDED.name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          country = EXCLUDED.country,
          timezone = EXCLUDED.timezone,
          website = EXCLUDED.website,
          tel = EXCLUDED.tel,
          address = EXCLUDED.address,
          locality = EXCLUDED.locality,
          region = EXCLUDED.region,
          payload = EXCLUDED.payload,
          updated_at = now()
      `,
      [
        id,
        fila.rowIdx,
        obtenerTextoPlacesOs(fila.row, "name"),
        obtenerNumeroPlacesOs(fila.row, "latitude"),
        obtenerNumeroPlacesOs(fila.row, "longitude"),
        obtenerTextoPlacesOs(fila.row, "country") || "",
        obtenerTextoPlacesOs(fila.row, "timezone"),
        obtenerTextoPlacesOs(fila.row, "website"),
        obtenerTextoPlacesOs(fila.row, "tel"),
        obtenerTextoPlacesOs(fila.row, "address"),
        obtenerTextoPlacesOs(fila.row, "locality"),
        obtenerTextoPlacesOs(fila.row, "region"),
        JSON.stringify(fila.row),
      ],
    )

    if (yaExiste) {
      actualizadas += 1
    } else {
      insertadas += 1
    }
  }

  return {
    insertadas,
    actualizadas,
    omitidas,
  }
}

async function obtenerTablaMapaPlacesOs(input: {
  nombreTabla: string
  country: string
  website: FiltroWebsitePlacesOs | null
}) {
  await sincronizarTablaMaestraPlacesOs()

  if (input.nombreTabla) {
    const resultado = await pool.query<FilaTablaMaestraPlacesOs>(
      `
        SELECT
          table_name,
          country,
          website_filter,
          label,
          total_rows,
          last_exported_rows,
          created_at,
          updated_at
        FROM "${tablaMaestraPlacesOs}"
        WHERE table_name = $1
        LIMIT 1
      `,
      [input.nombreTabla],
    )

    return resultado.rows[0]
      ? mapearTablaMaestraPlacesOs(resultado.rows[0])
      : null
  }

  const tablas = await listarTablasPlacesOs({
    country: input.country,
    website: input.website,
  })

  return tablas[0] || null
}

function mapearPuntoMapaPlacesOs(input: {
  fila: FilaMapaPlacesOs
  nombreTabla: string
}): PuntoMapaPlacesOs {
  return {
    id: input.fila.fsq_place_id,
    name: input.fila.name,
    latitude: input.fila.latitude,
    longitude: input.fila.longitude,
    country: input.fila.country,
    timezone: input.fila.timezone,
    website: input.fila.website,
    tel: input.fila.tel,
    address: input.fila.address,
    locality: input.fila.locality,
    region: input.fila.region,
    tableName: input.nombreTabla,
    updatedAt: input.fila.updated_at
      ? input.fila.updated_at.toISOString()
      : null,
  }
}

export async function consultarPuntosMapaPlacesOs(input: {
  nombreTabla: string
  country: string
  website: FiltroWebsitePlacesOs | null
  limite: number
  q: string
}) {
  const tablaMaestra = await obtenerTablaMapaPlacesOs(input)

  if (!tablaMaestra) {
    return {
      table: null,
      points: [],
    }
  }

  const tabla = validarIdentificadorTablaPlacesOs(tablaMaestra.tableName)
  const condiciones = ["latitude IS NOT NULL", "longitude IS NOT NULL"]
  const valores: Array<string | number> = []
  let indiceParametro = 1

  if (input.country) {
    condiciones.push(`country = $${indiceParametro}`)
    valores.push(input.country)
    indiceParametro += 1
  }

  if (input.website === FiltroWebsitePlacesOs.CON_WEBSITE) {
    condiciones.push("website IS NOT NULL")
    condiciones.push("website <> ''")
  }

  if (input.website === FiltroWebsitePlacesOs.SIN_WEBSITE) {
    condiciones.push("(website IS NULL OR website = '')")
  }

  if (input.q) {
    condiciones.push(
      `(name ILIKE $${indiceParametro} OR website ILIKE $${indiceParametro} OR locality ILIKE $${indiceParametro} OR region ILIKE $${indiceParametro})`,
    )
    valores.push(`%${input.q}%`)
    indiceParametro += 1
  }

  valores.push(input.limite)

  const resultado = await pool.query<FilaMapaPlacesOs>(
    `
      SELECT
        fsq_place_id,
        name,
        latitude,
        longitude,
        country,
        timezone,
        website,
        tel,
        address,
        locality,
        region,
        updated_at
      FROM ${tabla}
      WHERE ${condiciones.join(" AND ")}
      ORDER BY updated_at DESC, row_idx ASC
      LIMIT $${indiceParametro}
    `,
    valores,
  )

  return {
    table: tablaMaestra,
    points: resultado.rows.map((fila) =>
      mapearPuntoMapaPlacesOs({
        fila,
        nombreTabla: tablaMaestra.tableName,
      }),
    ),
  }
}
