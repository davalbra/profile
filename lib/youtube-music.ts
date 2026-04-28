import { createHash } from "node:crypto"

const YTM_DOMAIN = "https://music.youtube.com"
const YTM_BROWSE_ENDPOINT = `${YTM_DOMAIN}/youtubei/v1/browse`
const YTM_NEXT_ENDPOINT = `${YTM_DOMAIN}/youtubei/v1/next`
const YTM_SEARCH_ENDPOINT = `${YTM_DOMAIN}/youtubei/v1/search`
const YTM_DEFAULT_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30"
const YTM_DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
const YTM_LIBRARY_SONGS_BROWSE_ID = "FEmusic_liked_videos"

export class YouTubeMusicConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "YouTubeMusicConfigError"
  }
}

export type YouTubeMusicSong = {
  videoId: string
  title: string
  artists: Array<{ name: string; id?: string | null }>
  album: string | null
  duration: string | null
  thumbnailUrl: string | null
}

type BootstrapConfig = {
  apiKey: string
  clientVersion: string
  visitorData: string
}

export type YouTubeMusicEnvConfig = {
  cookie: string
  userAgent: string
  accountId: string | null
}

export function getYouTubeMusicEnvConfig(): YouTubeMusicEnvConfig {
  const cookie = process.env.YTMUSIC_COOKIE?.trim() || ""
  if (!cookie) {
    throw new YouTubeMusicConfigError("Falta YTMUSIC_COOKIE en el entorno del servidor.")
  }

  return {
    cookie,
    userAgent: process.env.YTMUSIC_USER_AGENT?.trim() || YTM_DEFAULT_USER_AGENT,
    accountId: process.env.YTMUSIC_ACCOUNT_ID?.trim() || null,
  }
}

function extractCookieValue(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(";")
  for (const cookiePart of cookies) {
    const [cookieName, ...cookieValue] = cookiePart.trim().split("=")
    if (cookieName === name) {
      return cookieValue.join("=") || null
    }
  }

  return null
}

function buildAuthorizationHeader(cookieHeader: string): string {
  const sapisid =
    extractCookieValue(cookieHeader, "__Secure-3PAPISID") ||
    extractCookieValue(cookieHeader, "SAPISID")

  if (!sapisid) {
    throw new YouTubeMusicConfigError(
      "La cookie debe incluir __Secure-3PAPISID o SAPISID para autenticar peticiones de YouTube Music."
    )
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const hash = createHash("sha1")
    .update(`${timestamp} ${sapisid} ${YTM_DOMAIN}`, "utf8")
    .digest("hex")

  return `SAPISIDHASH ${timestamp}_${hash}`
}

function mergeCookieHeader(cookieHeader: string): string {
  return cookieHeader.includes("SOCS=") ? cookieHeader : `SOCS=CAI; ${cookieHeader}`
}

function extractJsonConfig(html: string): Partial<BootstrapConfig> {
  const config: Partial<BootstrapConfig> = {}
  const matches = html.matchAll(/ytcfg\.set\s*\(\s*({[\s\S]*?})\s*\)\s*;/g)

  for (const match of matches) {
    const raw = match[1]
    if (!raw) {
      continue
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (typeof parsed.INNERTUBE_API_KEY === "string" && !config.apiKey) {
        config.apiKey = parsed.INNERTUBE_API_KEY
      }
      if (typeof parsed.INNERTUBE_CLIENT_VERSION === "string" && !config.clientVersion) {
        config.clientVersion = parsed.INNERTUBE_CLIENT_VERSION
      }
      if (typeof parsed.VISITOR_DATA === "string" && !config.visitorData) {
        config.visitorData = parsed.VISITOR_DATA
      }
    } catch {
      continue
    }
  }

  return config
}

async function getBootstrapConfig(env: YouTubeMusicEnvConfig): Promise<BootstrapConfig> {
  const response = await fetch(YTM_DOMAIN, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      cookie: mergeCookieHeader(env.cookie),
      "user-agent": env.userAgent,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`No se pudo cargar la pagina base de YouTube Music (${response.status}).`)
  }

  const html = await response.text()
  const extracted = extractJsonConfig(html)

  return {
    apiKey: extracted.apiKey || YTM_DEFAULT_API_KEY,
    clientVersion: extracted.clientVersion || `1.${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.01.00`,
    visitorData: extracted.visitorData || "",
  }
}

function getEndpointUrl(endpoint: "browse" | "next" | "search", apiKey: string) {
  const base =
    endpoint === "browse"
      ? YTM_BROWSE_ENDPOINT
      : endpoint === "next"
        ? YTM_NEXT_ENDPOINT
        : YTM_SEARCH_ENDPOINT

  return `${base}?alt=json&key=${apiKey}`
}

export async function sendYouTubeMusicRequest(
  endpoint: "browse" | "next" | "search",
  body: Record<string, unknown>,
  options?: {
    useMobileClient?: boolean
  }
) {
  const env = getYouTubeMusicEnvConfig()
  const bootstrap = await getBootstrapConfig(env)
  const client = options?.useMobileClient
    ? {
        clientName: "ANDROID_MUSIC",
        clientVersion: "7.21.50",
      }
    : {
        clientName: "WEB_REMIX",
        clientVersion: bootstrap.clientVersion,
      }

  const response = await fetch(getEndpointUrl(endpoint, bootstrap.apiKey), {
    method: "POST",
    headers: {
      accept: "*/*",
      authorization: buildAuthorizationHeader(env.cookie),
      cookie: mergeCookieHeader(env.cookie),
      "content-type": "application/json",
      origin: YTM_DOMAIN,
      "user-agent": env.userAgent,
      "x-goog-authuser": "0",
      "x-goog-visitor-id": bootstrap.visitorData,
      "x-origin": YTM_DOMAIN,
    },
    body: JSON.stringify({
      ...body,
      context: {
        client: {
          ...client,
          hl: "es",
        },
        user: env.accountId
          ? {
              onBehalfOfUser: env.accountId,
            }
          : {},
      },
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(
      `YouTube Music respondio ${response.status}. ${responseText.slice(0, 180) || "Sin detalle adicional."}`
    )
  }

  return (await response.json()) as Record<string, unknown>
}

function findValuesByKey(value: unknown, key: string, results: unknown[] = []): unknown[] {
  if (!value || typeof value !== "object") {
    return results
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findValuesByKey(item, key, results)
    }
    return results
  }

  const record = value as Record<string, unknown>
  if (key in record) {
    results.push(record[key])
  }

  for (const nestedValue of Object.values(record)) {
    findValuesByKey(nestedValue, key, results)
  }

  return results
}

function textFromNode(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as { simpleText?: unknown; runs?: Array<{ text?: unknown }> }
  if (typeof record.simpleText === "string") {
    return record.simpleText
  }

  if (Array.isArray(record.runs)) {
    const text = record.runs
      .map((run) => (typeof run.text === "string" ? run.text : ""))
      .join("")
      .trim()
    return text || null
  }

  return null
}

function parseArtists(column: unknown): Array<{ name: string; id?: string | null }> {
  if (!column || typeof column !== "object") {
    return []
  }

  const runs = (column as { runs?: Array<Record<string, unknown>> }).runs
  if (!Array.isArray(runs)) {
    const fallback = textFromNode(column)
    return fallback ? [{ name: fallback }] : []
  }

  const artists: Array<{ name: string; id?: string | null }> = []
  for (const run of runs) {
    const text = typeof run.text === "string" ? run.text.trim() : ""
    if (!text || text === " • ") {
      continue
    }

    const pageType = ((run.navigationEndpoint as Record<string, unknown> | undefined)?.browseEndpoint as
      | Record<string, unknown>
      | undefined)?.browseEndpointContextSupportedConfigs as Record<string, unknown> | undefined

    const musicConfig = pageType?.browseEndpointContextMusicConfig as Record<string, unknown> | undefined
    const resolvedPageType = typeof musicConfig?.pageType === "string" ? musicConfig.pageType : ""
    const browseId =
      typeof ((run.navigationEndpoint as Record<string, unknown> | undefined)?.browseEndpoint as Record<
        string,
        unknown
      > | undefined)?.browseId === "string"
        ? (((run.navigationEndpoint as Record<string, unknown> | undefined)?.browseEndpoint as Record<
            string,
            unknown
          >).browseId as string)
        : null

    if (
      resolvedPageType === "MUSIC_PAGE_TYPE_ARTIST" ||
      resolvedPageType === "MUSIC_PAGE_TYPE_USER_CHANNEL" ||
      resolvedPageType === "MUSIC_PAGE_TYPE_UNKNOWN"
    ) {
      artists.push({ name: text, id: browseId })
    }
  }

  if (artists.length > 0) {
    return artists
  }

  const fallback = textFromNode(column)
  return fallback ? [{ name: fallback }] : []
}

function pickBestThumbnail(thumbnails: unknown): string | null {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
    return null
  }

  const ordered = thumbnails
    .filter((thumbnail): thumbnail is { url?: string; width?: number; height?: number } => typeof thumbnail === "object" && thumbnail !== null)
    .sort((a, b) => (Number(b.width || 0) * Number(b.height || 0)) - (Number(a.width || 0) * Number(a.height || 0)))

  return typeof ordered[0]?.url === "string" ? ordered[0].url : null
}

function parseSongRenderer(renderer: Record<string, unknown>): YouTubeMusicSong | null {
  const flexColumns = Array.isArray(renderer.flexColumns) ? renderer.flexColumns : []
  const titleColumn = (flexColumns[0] as Record<string, unknown> | undefined)?.musicResponsiveListItemFlexColumnRenderer as
    | Record<string, unknown>
    | undefined
  const artistsColumn = (flexColumns[1] as Record<string, unknown> | undefined)?.musicResponsiveListItemFlexColumnRenderer as
    | Record<string, unknown>
    | undefined
  const albumColumn = (flexColumns[2] as Record<string, unknown> | undefined)?.musicResponsiveListItemFlexColumnRenderer as
    | Record<string, unknown>
    | undefined
  const fixedColumns = Array.isArray(renderer.fixedColumns) ? renderer.fixedColumns : []
  const durationColumn = (fixedColumns[0] as Record<string, unknown> | undefined)?.musicResponsiveListItemFixedColumnRenderer as
    | Record<string, unknown>
    | undefined

  const title = textFromNode(titleColumn?.text)
  const videoIdValues = findValuesByKey(renderer, "videoId")
  const videoId = videoIdValues.find((value): value is string => typeof value === "string") || null

  if (!title || !videoId) {
    return null
  }

  const thumbnailCandidates =
    ((renderer.thumbnail as Record<string, unknown> | undefined)?.musicThumbnailRenderer as Record<string, unknown> | undefined)
      ?.thumbnail as Record<string, unknown> | undefined

  const thumbnails = Array.isArray(thumbnailCandidates?.thumbnails) ? thumbnailCandidates.thumbnails : []

  return {
    videoId,
    title,
    artists: parseArtists(artistsColumn?.text),
    album: textFromNode(albumColumn?.text),
    duration: textFromNode(durationColumn?.text),
    thumbnailUrl: pickBestThumbnail(thumbnails),
  }
}

export async function getYouTubeMusicLibrarySongs(limit = 25): Promise<YouTubeMusicSong[]> {
  const payload = await sendYouTubeMusicRequest("browse", {
    browseId: YTM_LIBRARY_SONGS_BROWSE_ID,
  })
  const renderers = findValuesByKey(payload, "musicResponsiveListItemRenderer")
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object")
    .map(parseSongRenderer)
    .filter((song): song is YouTubeMusicSong => song !== null)

  const uniqueSongs = Array.from(new Map(renderers.map((song) => [song.videoId, song])).values())
  return uniqueSongs.slice(0, limit)
}
