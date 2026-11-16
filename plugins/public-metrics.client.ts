import { inject, pageview } from "@vercel/analytics"
import { injectSpeedInsights } from "@vercel/speed-insights"
import { filterPublicMetric, isPublicMetricsUrl } from "@/utils/public-metrics"

export default defineNuxtPlugin((nuxtApp) => {
  // Only the public production homepage is measured, never preview/dev or tools.
  if (import.meta.dev) return

  let initialized = false
  nuxtApp.hook("page:finish", () => {
    if (!isPublicMetricsUrl(window.location.href)) return

    if (!initialized) {
      inject({
        mode: "production",
        disableAutoTrack: true,
        beforeSend: (event) => filterPublicMetric(event, window.location.href),
      })
      injectSpeedInsights({
        route: "/",
        beforeSend: (event) => filterPublicMetric(event, window.location.href),
      })
      initialized = true
    }

    pageview({ route: "/", path: "/" })
  })
})
