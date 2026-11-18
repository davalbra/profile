import { readFile } from "node:fs/promises"

const PLACES_PORTAL_ORIGIN = "https://places.foursquare.com"
const DATAHUB_CATALOG_URL =
  "https://spatial-workbench-data-api.foursquare.com/catalog"
const DATAHUB_PRODUCT_TYPE = "places-portal"
const HUGGING_FACE_DATASET_API =
  "https://huggingface.co/api/datasets/foursquare/fsq-os-places/tree/main"
const HUGGING_FACE_FILTER_API = "https://datasets-server.huggingface.co/filter"
const HUGGING_FACE_ROWS_API = "https://datasets-server.huggingface.co/rows"
const HUGGING_FACE_SEARCH_API = "https://datasets-server.huggingface.co/search"
const HUGGING_FACE_PUBLIC_PREVIEW_DATASET = "do-me/foursquare_places_100M"
const ICEBERG_CATALOG_CONFIG_URL =
  "https://catalog.h3-hub.foursquare.com/iceberg/v1/config"
const ZONEINFO_TAB_PATH = "/usr/share/zoneinfo/zone.tab"

export interface FoursquareOsField {
  label: string
  type: string
  description: string | null
}

export interface FoursquareOsDataset {
  key: string
  displayName: string
  tableName: string
  description: string | null
  rowCount: number | null
  columnCount: number | null
  fields: FoursquareOsField[]
}

export interface FoursquareOsReleaseGroup {
  key: "places" | "categories" | "deltas"
  fileCount: number
  totalBytes: number
  firstFilePath: string | null
}

export interface FoursquareOsRelease {
  date: string | null
  path: string | null
  groups: FoursquareOsReleaseGroup[]
  gatedDownload: boolean
}

export interface FoursquareOsTokenStatus {
  configured: boolean
  status: "not_configured" | "authorized" | "unauthorized" | "error"
  httpStatus: number | null
}

export interface FoursquareOsCountryOption {
  value: string
  label: string
  timezones: string[]
  tableName: string
}

export interface FoursquareOsPreviewRowsInput {
  page?: number
  pageSize?: number
  q?: string
  country?: string
  timezone?: string
  website?: string
}

export type FoursquareOsJsonValue =
  | string
  | number
  | boolean
  | null
  | FoursquareOsJsonValue[]
  | FoursquareOsJsonObject

export interface FoursquareOsJsonObject {
  [key: string]: FoursquareOsJsonValue
}

export interface FoursquareOsPreviewFeature {
  name: string
  type: FoursquareOsJsonValue
}

export interface FoursquareOsPreviewRow {
  rowIdx: number
  row: FoursquareOsJsonObject
}

export interface FoursquareOsPreviewRows {
  source: "huggingface_public_mirror"
  sourceLabel: string
  sourceUrl: string
  official: boolean
  dataset: string
  config: string
  split: string
  tableName: string
  page: number
  pageSize: number
  offset: number
  totalRows: number | null
  hasNextPage: boolean
  filters: {
    q: string
    country: string
    timezone: string
    website: "all" | "with" | "without"
  }
  queryMode: "rows" | "filter" | "search" | "server_filter"
  rateLimited: boolean
  warning: string | null
  scannedRows: number | null
  rows: FoursquareOsPreviewRow[]
  features: FoursquareOsPreviewFeature[]
}

interface DatahubDatasetResponse {
  item?: {
    name?: string
    description?: string | null
    datasetProfile?: {
      rowCount?: number
      columnCount?: number
    }
    schemaMetadataFields?: Array<{
      label?: string
      type?: string
      description?: string | null
    }>
  }
}

interface HuggingFaceTreeEntry {
  type: "file" | "directory"
  path: string
  size?: number
}

interface HuggingFaceRowsResponse {
  features?: Array<{
    name?: string
    type?: FoursquareOsJsonValue
  }>
  rows?: Array<{
    row_idx?: number
    row?: FoursquareOsJsonObject
  }>
  num_rows_total?: number
}

interface FoursquareOsTimezoneEntry {
  value: string
  label: string
  countries: string[]
  tableName: string
  comment: string | null
  latitude: number | null
  longitude: number | null
}

const datasetRequests: Array<{
  key: FoursquareOsReleaseGroup["key"]
  displayName: string
}> = [
  {
    key: "places",
    displayName: "OS Places",
  },
  {
    key: "categories",
    displayName: "OS Categories",
  },
  {
    key: "deltas",
    displayName: "OS Deltas",
  },
]

const previewPageSizes = [10, 25, 50, 100]
const localFilterChunkSize = 100
const maxLocalFilterRows = 200
const externalRequestTimeoutMs = 8000
const previewRowsCacheTtlMs = 1000 * 60 * 10
const maxTimezoneFilterRows = 2500
const countryAliases: Record<string, string> = {
  ARG: "AR",
  ARGENTINA: "AR",
  BOL: "BO",
  BOLIVIA: "BO",
  BRA: "BR",
  BRASIL: "BR",
  BRAZIL: "BR",
  CHILE: "CL",
  CHL: "CL",
  COL: "CO",
  COLOMBIA: "CO",
  ECU: "EC",
  ECUADOR: "EC",
  "ESTADOS UNIDOS": "US",
  MEX: "MX",
  MEXICO: "MX",
  PAN: "PA",
  PANAMA: "PA",
  PARAGUAY: "PY",
  PER: "PE",
  PERU: "PE",
  PRY: "PY",
  URUGUAY: "UY",
  URY: "UY",
  USA: "US",
}
const previewRowsCache = new Map<
  string,
  {
    expiresAt: number
    value: FoursquareOsPreviewRows
  }
>()
let timezoneEntriesCache: Promise<FoursquareOsTimezoneEntry[]> | null = null
const releaseGroupKeys: FoursquareOsReleaseGroup["key"][] = [
  "places",
  "categories",
  "deltas",
]

class ExternalRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function normalizeSlugSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function buildFoursquareOsTableName(input: {
  country: string
  timezone: string
  website: FoursquareOsPreviewRows["filters"]["website"]
}) {
  const locationSegment = input.country
    ? normalizeSlugSegment(input.country)
    : input.timezone
      ? normalizeSlugSegment(input.timezone)
      : "todos_los_paises"
  const websiteSegment =
    input.website === "with"
      ? "con_website"
      : input.website === "without"
        ? "sin_website"
        : "todos_los_websites"

  return `places_os_${locationSegment}_${websiteSegment}`
}

function buildTimezoneTableName(input: {
  timezone: string
  website: FoursquareOsPreviewRows["filters"]["website"]
}) {
  const locationSegment = input.timezone
    ? normalizeSlugSegment(input.timezone)
    : "todas_las_zonas"
  const websiteSegment =
    input.website === "with"
      ? "con_website"
      : input.website === "without"
        ? "sin_website"
        : "todos_los_websites"

  return `places_os_${locationSegment}_${websiteSegment}`
}

function parseCoordinatePart(value: string, degreeDigits: number) {
  const sign = value.startsWith("-") ? -1 : 1
  const digits = value.slice(1)
  const degrees = Number(digits.slice(0, degreeDigits))
  const minutes = Number(digits.slice(degreeDigits, degreeDigits + 2))
  const secondsValue = digits.slice(degreeDigits + 2)
  const seconds = secondsValue ? Number(secondsValue) : 0

  if (
    !Number.isFinite(degrees) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  ) {
    return null
  }

  return sign * (degrees + minutes / 60 + seconds / 3600)
}

function parseTimezoneCoordinates(value: string) {
  const match = value.match(/^([+-]\d{4}(?:\d{2})?)([+-]\d{5}(?:\d{2})?)$/)

  if (!match) {
    return null
  }

  const latitude = parseCoordinatePart(match[1], 2)
  const longitude = parseCoordinatePart(match[2], 3)

  if (latitude === null || longitude === null) {
    return null
  }

  return {
    latitude,
    longitude,
  }
}

function buildTimezoneLabel(value: string) {
  return value.replace(/_/g, " ")
}

function buildTimezoneEntryFromIntl(value: string): FoursquareOsTimezoneEntry {
  return {
    value,
    label: buildTimezoneLabel(value),
    countries: [],
    tableName: buildTimezoneTableName({
      timezone: value,
      website: "with",
    }),
    comment: null,
    latitude: null,
    longitude: null,
  }
}

function readIntlTimezoneEntries() {
  if (typeof Intl.supportedValuesOf !== "function") {
    return []
  }

  return Intl.supportedValuesOf("timeZone").map(buildTimezoneEntryFromIntl)
}

async function readTimezoneEntriesFromZoneInfo() {
  const text = await readFile(ZONEINFO_TAB_PATH, "utf8")
  const entriesByZone = new Map<string, FoursquareOsTimezoneEntry>()

  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) {
      continue
    }

    const fields = line.split("\t")
    const country = fields[0]?.trim().toUpperCase() || ""
    const coordinates = parseTimezoneCoordinates(fields[1]?.trim() || "")
    const timezone = fields[2]?.trim() || ""
    const comment = fields.slice(3).join(" ").trim() || null

    if (!country || !timezone) {
      continue
    }

    const existing = entriesByZone.get(timezone)

    if (existing) {
      if (!existing.countries.includes(country)) {
        existing.countries.push(country)
      }
      continue
    }

    entriesByZone.set(timezone, {
      value: timezone,
      label: buildTimezoneLabel(timezone),
      countries: [country],
      tableName: buildTimezoneTableName({
        timezone,
        website: "with",
      }),
      comment,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    })
  }

  return Array.from(entriesByZone.values()).sort((left, right) =>
    left.value.localeCompare(right.value),
  )
}

async function readTimezoneEntries() {
  if (!timezoneEntriesCache) {
    timezoneEntriesCache = readTimezoneEntriesFromZoneInfo().catch(() =>
      readIntlTimezoneEntries(),
    )
  }

  return await timezoneEntriesCache
}

function buildCountryLabel(value: string) {
  const displayNames = new Intl.DisplayNames(["es"], { type: "region" })

  return displayNames.of(value) || value
}

function toCountryOptions(
  timezoneEntries: FoursquareOsTimezoneEntry[],
): FoursquareOsCountryOption[] {
  const timezonesByCountry = new Map<string, string[]>()

  for (const entry of timezoneEntries) {
    for (const country of entry.countries) {
      const timezones = timezonesByCountry.get(country) || []

      if (!timezones.includes(entry.value)) {
        timezones.push(entry.value)
      }

      timezonesByCountry.set(country, timezones)
    }
  }

  return Array.from(timezonesByCountry.entries())
    .map(([country, timezones]) => ({
      value: country,
      label: buildCountryLabel(country),
      timezones: timezones.sort((left, right) => left.localeCompare(right)),
      tableName: buildFoursquareOsTableName({
        country,
        timezone: "",
        website: "with",
      }),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export async function fetchFoursquareOsCountries() {
  const entries = await readTimezoneEntries()

  return toCountryOptions(entries)
}

function readFoursquareOsToken() {
  return (
    process.env.FOURSQUARE_OS_TOKEN?.trim() ||
    process.env.FSQ_PLACES_OS_TOKEN?.trim() ||
    process.env.FSQ_OS_TOKEN?.trim() ||
    ""
  )
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), externalRequestTimeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: init?.signal || controller.signal,
    })
    if (!response.ok) {
      throw new ExternalRequestError(
        `Request failed with ${response.status}`,
        response.status,
      )
    }

    return JSON.parse(await response.text())
  } catch (error) {
    if (error instanceof ExternalRequestError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ExternalRequestError("Request timed out", 504)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchFoursquareOsDataset(
  displayName: string,
): Promise<Omit<FoursquareOsDataset, "key" | "displayName">> {
  const url = new URL(
    `${DATAHUB_CATALOG_URL}/v1/h3-hub/datahub/datasets/${encodeURIComponent(
      displayName,
    )}`,
  )
  url.searchParams.set("productType", DATAHUB_PRODUCT_TYPE)

  const payload = await fetchJson<DatahubDatasetResponse>(url.toString(), {
    headers: {
      Origin: PLACES_PORTAL_ORIGIN,
    },
  })
  const item = payload.item

  if (!item?.name) {
    throw new Error(`Dataset ${displayName} not found`)
  }

  return {
    tableName: item.name,
    description: item.description || null,
    rowCount: item.datasetProfile?.rowCount ?? null,
    columnCount: item.datasetProfile?.columnCount ?? null,
    fields: (item.schemaMetadataFields || [])
      .filter((field) => field.label && !field.label.includes("."))
      .map((field) => ({
        label: field.label || "",
        type: field.type || "UNKNOWN",
        description: field.description || null,
      })),
  }
}

export async function fetchFoursquareOsDatasets() {
  return await Promise.all(
    datasetRequests.map(async (dataset) => ({
      key: dataset.key,
      displayName: dataset.displayName,
      ...(await fetchFoursquareOsDataset(dataset.displayName)),
    })),
  )
}

async function fetchHuggingFaceTree(path: string) {
  const treePath = path.replace(/^\/+/, "")
  return await fetchJson<HuggingFaceTreeEntry[]>(
    `${HUGGING_FACE_DATASET_API}/${treePath}?recursive=false`,
  )
}

function extractReleaseDate(path: string) {
  return path.match(/dt=(\d{4}-\d{2}-\d{2})/)?.[1] || null
}

function normalizePreviewPage(value: number | null) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1
  }

  return Math.floor(value)
}

function normalizePreviewPageSize(value: number | null) {
  if (!Number.isFinite(value) || !value) {
    return 25
  }

  const pageSize = Math.floor(value)
  return previewPageSizes.includes(pageSize) ? pageSize : 25
}

function normalizePreviewSearch(value: string | null) {
  return (value || "").trim().slice(0, 120)
}

function normalizePreviewCountry(value: string | null) {
  const country = (value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()

  if (/^[A-Z]{2}$/.test(country)) {
    return country
  }

  return countryAliases[country] || ""
}

function normalizePreviewTimezone(
  value: string | null,
  timezoneEntries: FoursquareOsTimezoneEntry[],
) {
  const timezone = (value || "").trim()

  if (!timezone) {
    return ""
  }

  return timezoneEntries.some((entry) => entry.value === timezone)
    ? timezone
    : ""
}

function normalizePreviewWebsite(value: string | null) {
  return value === "with" || value === "without" ? value : "all"
}

function escapeFilterValue(value: string) {
  return value.replace(/'/g, "''")
}

function buildCountryWhere(country: string) {
  return `"country"='${escapeFilterValue(country)}'`
}

function getStringValue(row: FoursquareOsJsonObject, key: string) {
  const value = row[key]

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  return ""
}

function getNumberValue(row: FoursquareOsJsonObject, key: string) {
  const value = row[key]

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }

  return null
}

function getCountriesForTimezone(
  timezone: string,
  timezoneEntries: FoursquareOsTimezoneEntry[],
) {
  return (
    timezoneEntries.find((entry) => entry.value === timezone)?.countries || []
  )
}

function getTimezonesForCountry(
  country: string,
  timezoneEntries: FoursquareOsTimezoneEntry[],
) {
  return timezoneEntries.filter((entry) => entry.countries.includes(country))
}

function calculateTimezoneDistance(input: {
  latitude: number
  longitude: number
  timezone: FoursquareOsTimezoneEntry
}) {
  if (input.timezone.latitude === null || input.timezone.longitude === null) {
    return Number.POSITIVE_INFINITY
  }

  const latitudeDistance = input.latitude - input.timezone.latitude
  const rawLongitudeDistance = Math.abs(
    input.longitude - input.timezone.longitude,
  )
  const longitudeDistance = Math.min(
    rawLongitudeDistance,
    360 - rawLongitudeDistance,
  )

  return (
    latitudeDistance * latitudeDistance + longitudeDistance * longitudeDistance
  )
}

function inferRowTimezone(
  row: FoursquareOsJsonObject,
  timezoneEntries: FoursquareOsTimezoneEntry[],
) {
  const directTimezone = getStringValue(row, "timezone")

  if (directTimezone) {
    return directTimezone
  }

  const country = getStringValue(row, "country").toUpperCase()
  const latitude = getNumberValue(row, "latitude")
  const longitude = getNumberValue(row, "longitude")
  const countryTimezones = getTimezonesForCountry(country, timezoneEntries)

  if (!countryTimezones.length) {
    return ""
  }

  if (
    countryTimezones.length === 1 ||
    latitude === null ||
    longitude === null
  ) {
    return countryTimezones[0].value
  }

  let nearestTimezone: FoursquareOsTimezoneEntry | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const timezone of countryTimezones) {
    const distance = calculateTimezoneDistance({
      latitude,
      longitude,
      timezone,
    })

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestTimezone = timezone
    }
  }

  return nearestTimezone?.value || ""
}

function normalizeSearchText(value: FoursquareOsJsonValue): string {
  if (Array.isArray(value)) {
    return value.map(normalizeSearchText).join(" ").toLowerCase()
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(normalizeSearchText).join(" ").toLowerCase()
  }

  return String(value ?? "").toLowerCase()
}

function rowMatchesPreviewFilters(
  row: FoursquareOsJsonObject,
  filters: FoursquareOsPreviewRows["filters"],
  timezoneEntries: FoursquareOsTimezoneEntry[],
) {
  const website = getStringValue(row, "website")
  const matchesWebsite =
    filters.website === "all" ||
    (filters.website === "with" && Boolean(website)) ||
    (filters.website === "without" && !website)
  const matchesSearch =
    !filters.q || normalizeSearchText(row).includes(filters.q.toLowerCase())
  const matchesTimezone =
    !filters.timezone ||
    inferRowTimezone(row, timezoneEntries) === filters.timezone

  return matchesWebsite && matchesSearch && matchesTimezone
}

function enrichPreviewRowsWithTimezone(
  rows: FoursquareOsPreviewRow[],
  timezoneEntries: FoursquareOsTimezoneEntry[],
) {
  return rows.map((item) => {
    const timezone = inferRowTimezone(item.row, timezoneEntries)

    return {
      rowIdx: item.rowIdx,
      row: timezone
        ? {
            ...item.row,
            timezone,
          }
        : item.row,
    }
  })
}

function buildPreviewCacheKey(input: {
  page: number
  pageSize: number
  filters: FoursquareOsPreviewRows["filters"]
}) {
  return JSON.stringify(input)
}

function readPreviewRowsCache(key: string) {
  const cached = previewRowsCache.get(key)

  if (!cached) {
    return null
  }

  if (cached.expiresAt < Date.now()) {
    previewRowsCache.delete(key)
    return null
  }

  return cached.value
}

function writePreviewRowsCache(key: string, value: FoursquareOsPreviewRows) {
  previewRowsCache.set(key, {
    expiresAt: Date.now() + previewRowsCacheTtlMs,
    value,
  })
}

function isRecoverableExternalError(error: Error) {
  return (
    error instanceof ExternalRequestError &&
    (error.status === 429 || error.status === 504)
  )
}

function buildRateLimitedRows(input: {
  page: number
  pageSize: number
  offset: number
  filters: FoursquareOsPreviewRows["filters"]
  queryMode: FoursquareOsPreviewRows["queryMode"]
}): FoursquareOsPreviewRows {
  return {
    source: "huggingface_public_mirror",
    sourceLabel: "Hugging Face public mirror",
    sourceUrl: "https://huggingface.co/datasets/do-me/foursquare_places_100M",
    official: false,
    dataset: HUGGING_FACE_PUBLIC_PREVIEW_DATASET,
    config: "default",
    split: "train",
    tableName: buildFoursquareOsTableName({
      country: input.filters.country,
      timezone: input.filters.timezone,
      website: input.filters.website,
    }),
    page: input.page,
    pageSize: input.pageSize,
    offset: input.offset,
    totalRows: null,
    hasNextPage: false,
    filters: input.filters,
    queryMode: input.queryMode,
    rateLimited: true,
    warning:
      "La fuente externa limito o demoro la consulta. Intenta de nuevo en unos segundos.",
    scannedRows: 0,
    rows: [],
    features: [],
  }
}

export async function fetchLatestFoursquareOsRelease(): Promise<FoursquareOsRelease> {
  const releases = await fetchHuggingFaceTree("release")
  const latest = releases
    .filter((entry) => entry.type === "directory" && entry.path.includes("dt="))
    .sort((left, right) => left.path.localeCompare(right.path))
    .at(-1)

  if (!latest) {
    return {
      date: null,
      path: null,
      groups: [],
      gatedDownload: true,
    }
  }

  const groups = await Promise.all(
    releaseGroupKeys.map(async (key) => {
      const files = await fetchHuggingFaceTree(
        `${latest.path}/${key}/parquet`,
      ).catch(() => [])

      return {
        key,
        fileCount: files.filter((entry) => entry.type === "file").length,
        totalBytes: files.reduce((sum, entry) => sum + (entry.size || 0), 0),
        firstFilePath:
          files.find((entry) => entry.type === "file")?.path || null,
      }
    }),
  )

  return {
    date: extractReleaseDate(latest.path),
    path: latest.path,
    groups,
    gatedDownload: true,
  }
}

export async function fetchFoursquareOsPreviewRows(
  input: FoursquareOsPreviewRowsInput = {},
): Promise<FoursquareOsPreviewRows> {
  const timezoneEntries = await readTimezoneEntries()
  const page = normalizePreviewPage(input.page ?? null)
  const pageSize = normalizePreviewPageSize(input.pageSize ?? null)
  const offset = (page - 1) * pageSize
  const filters: FoursquareOsPreviewRows["filters"] = {
    q: normalizePreviewSearch(input.q ?? null),
    country: normalizePreviewCountry(input.country ?? null),
    timezone: normalizePreviewTimezone(input.timezone ?? null, timezoneEntries),
    website: normalizePreviewWebsite(input.website ?? null),
  }
  const cacheKey = buildPreviewCacheKey({ page, pageSize, filters })
  const cached = readPreviewRowsCache(cacheKey)

  if (cached) {
    return cached
  }

  const localFiltersRequired =
    Boolean(filters.q) || filters.website !== "all" || Boolean(filters.timezone)
  const baseUrl = filters.country
    ? HUGGING_FACE_FILTER_API
    : HUGGING_FACE_ROWS_API
  const queryMode: FoursquareOsPreviewRows["queryMode"] = filters.country
    ? "filter"
    : "rows"

  if (filters.timezone) {
    const rows = await fetchFoursquareOsPreviewRowsWithServerFilters({
      page,
      pageSize,
      filters,
      countryValues: filters.country
        ? [filters.country]
        : getCountriesForTimezone(filters.timezone, timezoneEntries),
      timezoneEntries,
    })
    writePreviewRowsCache(cacheKey, rows)
    return rows
  }

  if (!localFiltersRequired) {
    try {
      const rows = await fetchFoursquareOsPreviewRowsSlice({
        page,
        pageSize,
        offset,
        filters,
        queryMode,
        url: baseUrl,
        timezoneEntries,
      })
      writePreviewRowsCache(cacheKey, rows)
      return rows
    } catch (error) {
      if (error instanceof Error && isRecoverableExternalError(error)) {
        return buildRateLimitedRows({
          page,
          pageSize,
          offset,
          filters,
          queryMode,
        })
      }

      throw error
    }
  }

  if (!filters.country && filters.q && filters.website === "all") {
    try {
      const rows = await fetchFoursquareOsPreviewRowsSlice({
        page,
        pageSize,
        offset,
        filters,
        queryMode: "search",
        url: HUGGING_FACE_SEARCH_API,
        timezoneEntries,
      })
      writePreviewRowsCache(cacheKey, rows)
      return rows
    } catch {
      const rows = await fetchFoursquareOsPreviewRowsWithServerFilters({
        page,
        pageSize,
        filters,
        baseUrl: HUGGING_FACE_ROWS_API,
        timezoneEntries,
      })
      writePreviewRowsCache(cacheKey, rows)
      return rows
    }
  }

  if (!filters.country && !filters.q && filters.website === "with") {
    try {
      const rows = await fetchFoursquareOsPreviewRowsSlice({
        page,
        pageSize,
        offset,
        filters,
        queryMode: "search",
        url: HUGGING_FACE_SEARCH_API,
        searchQuery: "http",
        timezoneEntries,
      })
      writePreviewRowsCache(cacheKey, rows)
      return rows
    } catch (error) {
      if (error instanceof Error && isRecoverableExternalError(error)) {
        return buildRateLimitedRows({
          page,
          pageSize,
          offset,
          filters,
          queryMode: "search",
        })
      }
    }
  }

  const rows = await fetchFoursquareOsPreviewRowsWithServerFilters({
    page,
    pageSize,
    filters,
    baseUrl,
    timezoneEntries,
  })
  writePreviewRowsCache(cacheKey, rows)
  return rows
}

async function fetchFoursquareOsPreviewRowsSlice(input: {
  page: number
  pageSize: number
  offset: number
  filters: FoursquareOsPreviewRows["filters"]
  queryMode: FoursquareOsPreviewRows["queryMode"]
  url: string
  searchQuery?: string
  country?: string
  timezoneEntries: FoursquareOsTimezoneEntry[]
}): Promise<FoursquareOsPreviewRows> {
  const url = new URL(input.url)

  url.searchParams.set("dataset", HUGGING_FACE_PUBLIC_PREVIEW_DATASET)
  url.searchParams.set("config", "default")
  url.searchParams.set("split", "train")
  url.searchParams.set("offset", String(input.offset))
  url.searchParams.set("length", String(input.pageSize))

  if (input.url === HUGGING_FACE_FILTER_API) {
    url.searchParams.set(
      "where",
      buildCountryWhere(input.country || input.filters.country),
    )
  }

  if (input.url === HUGGING_FACE_SEARCH_API) {
    url.searchParams.set("query", input.searchQuery || input.filters.q)
  }

  const payload = await fetchJson<HuggingFaceRowsResponse>(url.toString())
  const rows = (payload.rows || []).map((item) => ({
    rowIdx: item.row_idx ?? 0,
    row: item.row || {},
  }))

  return {
    source: "huggingface_public_mirror",
    sourceLabel: "Hugging Face public mirror",
    sourceUrl: "https://huggingface.co/datasets/do-me/foursquare_places_100M",
    official: false,
    dataset: HUGGING_FACE_PUBLIC_PREVIEW_DATASET,
    config: "default",
    split: "train",
    tableName: buildFoursquareOsTableName({
      country: input.filters.country,
      timezone: input.filters.timezone,
      website: input.filters.website,
    }),
    page: input.page,
    pageSize: input.pageSize,
    offset: input.offset,
    totalRows: payload.num_rows_total ?? null,
    hasNextPage:
      typeof payload.num_rows_total === "number"
        ? input.offset + rows.length < payload.num_rows_total
        : rows.length === input.pageSize,
    filters: input.filters,
    queryMode: input.queryMode,
    rateLimited: false,
    warning: null,
    scannedRows: rows.length,
    rows:
      input.filters.country || input.filters.timezone
        ? enrichPreviewRowsWithTimezone(rows, input.timezoneEntries)
        : rows,
    features: (payload.features || [])
      .filter((feature) => feature.name)
      .map((feature) => ({
        name: feature.name || "",
        type: feature.type ?? null,
      })),
  }
}

async function fetchFoursquareOsPreviewRowsWithServerFilters(input: {
  page: number
  pageSize: number
  filters: FoursquareOsPreviewRows["filters"]
  baseUrl?: string
  countryValues?: string[]
  timezoneEntries: FoursquareOsTimezoneEntry[]
}): Promise<FoursquareOsPreviewRows> {
  const wantedMatches = input.page * input.pageSize + 1
  const matches: FoursquareOsPreviewRow[] = []
  let features: FoursquareOsPreviewFeature[] = []
  let scannedRows = 0
  let sourceTotalRows: number | null = null
  let rateLimited = false
  const maxRowsToScan =
    input.filters.timezone || input.filters.country
      ? maxTimezoneFilterRows
      : maxLocalFilterRows
  const countryValues = input.countryValues?.filter(Boolean) || []
  const sources = countryValues.length
    ? countryValues.map((country) => ({
        baseUrl: HUGGING_FACE_FILTER_API,
        country,
      }))
    : [
        {
          baseUrl: input.baseUrl || HUGGING_FACE_ROWS_API,
          country: input.filters.country,
        },
      ]

  for (const source of sources) {
    let sourceOffset = 0

    while (matches.length < wantedMatches && scannedRows < maxRowsToScan) {
      let slice: FoursquareOsPreviewRows

      try {
        slice = await fetchFoursquareOsPreviewRowsSlice({
          page: 1,
          pageSize: localFilterChunkSize,
          offset: sourceOffset,
          filters: input.filters,
          queryMode:
            source.baseUrl === HUGGING_FACE_FILTER_API ? "filter" : "rows",
          url: source.baseUrl,
          country: source.country,
          timezoneEntries: input.timezoneEntries,
        })
      } catch (error) {
        if (error instanceof Error && isRecoverableExternalError(error)) {
          rateLimited = true
          break
        }

        throw error
      }

      if (!features.length) {
        features = slice.features
      }

      sourceTotalRows = slice.totalRows
      scannedRows += slice.rows.length
      matches.push(
        ...slice.rows.filter((item) =>
          rowMatchesPreviewFilters(
            item.row,
            input.filters,
            input.timezoneEntries,
          ),
        ),
      )

      if (!slice.hasNextPage || !slice.rows.length) {
        break
      }

      sourceOffset += localFilterChunkSize
    }

    if (matches.length >= wantedMatches || scannedRows >= maxRowsToScan) {
      break
    }
  }

  const start = (input.page - 1) * input.pageSize
  const pageRows =
    input.filters.country || input.filters.timezone
      ? enrichPreviewRowsWithTimezone(
          matches.slice(start, start + input.pageSize),
          input.timezoneEntries,
        )
      : matches.slice(start, start + input.pageSize)

  return {
    source: "huggingface_public_mirror",
    sourceLabel: "Hugging Face public mirror",
    sourceUrl: "https://huggingface.co/datasets/do-me/foursquare_places_100M",
    official: false,
    dataset: HUGGING_FACE_PUBLIC_PREVIEW_DATASET,
    config: "default",
    split: "train",
    tableName: buildFoursquareOsTableName({
      country: input.filters.country,
      timezone: input.filters.timezone,
      website: input.filters.website,
    }),
    page: input.page,
    pageSize: input.pageSize,
    offset: start,
    totalRows:
      input.filters.country &&
      !input.filters.timezone &&
      input.filters.website === "all" &&
      !input.filters.q
        ? sourceTotalRows
        : null,
    hasNextPage: matches.length > start + input.pageSize,
    filters: input.filters,
    queryMode: "server_filter",
    rateLimited,
    warning: rateLimited
      ? "La fuente externa limito o demoro la consulta. Se muestran filas parciales si estaban disponibles."
      : null,
    scannedRows,
    rows: pageRows,
    features,
  }
}

export async function checkFoursquareOsToken(): Promise<FoursquareOsTokenStatus> {
  const token = readFoursquareOsToken()

  if (!token) {
    return {
      configured: false,
      status: "not_configured",
      httpStatus: null,
    }
  }

  try {
    const response = await fetch(ICEBERG_CATALOG_CONFIG_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return {
      configured: true,
      status: response.ok ? "authorized" : "unauthorized",
      httpStatus: response.status,
    }
  } catch {
    return {
      configured: true,
      status: "error",
      httpStatus: null,
    }
  }
}
