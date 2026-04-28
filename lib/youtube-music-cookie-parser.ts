const REQUIRED_COOKIE_NAMES = [
  "__Secure-3PAPISID",
  "SAPISID",
  "SID",
  "HSID",
  "SSID",
  "APISID",
  "LOGIN_INFO",
  "PREF",
  "VISITOR_INFO1_LIVE",
] as const

const OPTIONAL_COOKIE_NAMES = [
  "__Secure-1PAPISID",
  "__Secure-1PSID",
  "__Secure-1PSIDCC",
  "__Secure-1PSIDTS",
  "__Secure-3PSID",
  "__Secure-3PSIDCC",
  "__Secure-3PSIDTS",
  "SIDCC",
  "SOCS",
] as const

export type CookieParseResult = {
  envCookieLine: string
  envUserAgentLine: string
  cookieHeader: string
  detectedCookies: string[]
  missingRequiredCookies: string[]
  userAgent: string | null
}

type LooseRecord = Record<string, unknown>

function isRecord(value: unknown): value is LooseRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function extractUserAgent(raw: string): string | null {
  const patterns = [
    /user-agent["']?\s*[:=]\s*["']([^"'\n]+)["']/i,
    /"userAgent"\s*:\s*"([^"]+)"/i,
    /\bMozilla\/5\.0[^\n]+/i,
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
    if (match?.[0]?.startsWith("Mozilla/5.0")) {
      return match[0].trim()
    }
  }

  return null
}

function normalizeCookieValue(value: string): string {
  return value.trim().replace(/^"(.*)"$/, "$1")
}

function readCookiesFromArray(input: unknown[]): Map<string, string> {
  const cookies = new Map<string, string>()

  for (const item of input) {
    if (!isRecord(item)) {
      continue
    }

    const name = asString(item.name) || asString(item.Name)
    const value = asString(item.value) || asString(item.Value)
    if (name && value) {
      cookies.set(name, normalizeCookieValue(value))
    }
  }

  return cookies
}

function readCookiesFromJson(input: unknown): Map<string, string> {
  if (Array.isArray(input)) {
    return readCookiesFromArray(input)
  }

  if (!isRecord(input)) {
    return new Map()
  }

  const directCookies = readCookiesFromArray(Object.values(input))
  if (directCookies.size > 0) {
    return directCookies
  }

  const nestedCandidates = ["cookies", "Cookies", "data", "entries"]
  for (const candidate of nestedCandidates) {
    const value = input[candidate]
    if (Array.isArray(value)) {
      const nestedCookies = readCookiesFromArray(value)
      if (nestedCookies.size > 0) {
        return nestedCookies
      }
    }
  }

  return new Map()
}

function readCookiesFromText(raw: string): Map<string, string> {
  const cookies = new Map<string, string>()

  for (const chunk of raw.split(/[;\n\r]+/)) {
    const line = chunk.trim()
    if (!line || !line.includes("=")) {
      continue
    }

    const [name, ...rest] = line.split("=")
    const trimmedName = name.trim()
    if (!trimmedName || /\s/.test(trimmedName)) {
      continue
    }

    cookies.set(trimmedName, normalizeCookieValue(rest.join("=")))
  }

  return cookies
}

function detectCookies(raw: string): Map<string, string> {
  const trimmed = raw.trim()
  if (!trimmed) {
    return new Map()
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const jsonCookies = readCookiesFromJson(parsed)
      if (jsonCookies.size > 0) {
        return jsonCookies
      }
    } catch {
      // Fallback to text parsing.
    }
  }

  return readCookiesFromText(trimmed)
}

export function parseYouTubeMusicCookieExport(raw: string): CookieParseResult {
  const cookieMap = detectCookies(raw)
  if (cookieMap.size === 0) {
    throw new Error("No pude detectar cookies validas en el texto pegado.")
  }

  const orderedCookieNames = [...REQUIRED_COOKIE_NAMES, ...OPTIONAL_COOKIE_NAMES].filter((name) =>
    cookieMap.has(name)
  )

  const cookieHeader = orderedCookieNames.map((name) => `${name}=${cookieMap.get(name) || ""}`).join("; ")
  if (!cookieHeader) {
    throw new Error("No encontré ninguna de las cookies necesarias para YouTube Music.")
  }

  const missingRequiredCookies = REQUIRED_COOKIE_NAMES.filter((name) => !cookieMap.has(name))
  const userAgent = extractUserAgent(raw)

  return {
    envCookieLine: `YTMUSIC_COOKIE="${cookieHeader}"`,
    envUserAgentLine: userAgent ? `YTMUSIC_USER_AGENT="${userAgent.replace(/"/g, '\\"')}"` : 'YTMUSIC_USER_AGENT=""',
    cookieHeader,
    detectedCookies: orderedCookieNames,
    missingRequiredCookies,
    userAgent,
  }
}

export { OPTIONAL_COOKIE_NAMES, REQUIRED_COOKIE_NAMES }
