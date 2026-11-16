const PUBLIC_ORIGIN = "https://www.davalbra.cloud"

export function isPublicMetricsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.origin === PUBLIC_ORIGIN && url.pathname === "/"
  } catch {
    return false
  }
}

/** Never report private paths, query strings, fragments or custom events. */
export function filterPublicMetric<T extends { type: string; url: string }>(
  event: T,
  currentUrl: string,
): T | null {
  if (
    !["pageview", "vital"].includes(event.type) ||
    !isPublicMetricsUrl(currentUrl) ||
    !isPublicMetricsUrl(event.url)
  ) {
    return null
  }
  return { ...event, url: `${PUBLIC_ORIGIN}/` }
}
