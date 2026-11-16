import assert from "node:assert/strict"
import { filterPublicMetric, isPublicMetricsUrl } from "../utils/public-metrics"

const home = "https://www.davalbra.cloud/"
for (const type of ["pageview", "vital"]) {
  assert.deepEqual(
    filterPublicMetric({ type, url: `${home}?secret=hidden#private` }, home),
    { type, url: home },
  )
  for (const path of [
    "dashboard",
    "dashboard/images/optimize",
    "login",
    "milky",
  ]) {
    assert.equal(filterPublicMetric({ type, url: home + path }, home), null)
    assert.equal(filterPublicMetric({ type, url: home }, home + path), null)
  }
}
assert.equal(filterPublicMetric({ type: "event", url: home }, home), null)
for (const url of [
  "bad-url",
  "http://localhost:3000/",
  "https://preview.vercel.app/",
  "https://davalbra.cloud/",
]) {
  assert.equal(isPublicMetricsUrl(url), false)
}
console.log("Public metrics privacy checks passed")
