"use client"

import * as React from "react"
import { Check, Copy, Cookie, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  OPTIONAL_COOKIE_NAMES,
  REQUIRED_COOKIE_NAMES,
  parseYouTubeMusicCookieExport,
  type CookieParseResult,
} from "@/lib/youtube-music-cookie-parser"

function CopyButton(props: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(props.value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado" : props.label}
    </Button>
  )
}

export function MilkaCookieCleaner() {
  const [rawInput, setRawInput] = React.useState("")
  const [result, setResult] = React.useState<CookieParseResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  function handleClean() {
    try {
      const parsed = parseYouTubeMusicCookieExport(rawInput)
      setResult(parsed)
      setError(null)
    } catch (currentError) {
      setResult(null)
      setError(currentError instanceof Error ? currentError.message : "No se pudo procesar el export.")
    }
  }

  function handleClear() {
    setRawInput("")
    setResult(null)
    setError(null)
  }

  const envBlock = result ? `${result.envCookieLine}\n${result.envUserAgentLine}` : ""

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Limpiador de cookies</CardTitle>
          <CardDescription>
            Pega aqui el export bruto de la extension. Acepta JSON o texto y te devuelve `YTMUSIC_COOKIE` listo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder="Pega aqui el export completo de cookies o el texto crudo..."
            className="min-h-[320px] w-full rounded-xl border bg-background px-3 py-3 font-mono text-sm outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleClean} disabled={!rawInput.trim()}>
              <Cookie className="size-4" />
              Limpiar export
            </Button>
            <Button type="button" variant="outline" onClick={handleClear} disabled={!rawInput && !result && !error}>
              Limpiar pantalla
            </Button>
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Salida lista para .env</CardTitle>
            <CardDescription>Esto es lo que pegas en `.env.local` o en variables de entorno de Vercel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-4 text-xs whitespace-pre-wrap">
              {envBlock || 'YTMUSIC_COOKIE=""\nYTMUSIC_USER_AGENT=""'}
            </pre>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={envBlock || ""} label="Copiar bloque" />
              <CopyButton value={result?.cookieHeader || ""} label="Copiar cookie" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnostico</CardTitle>
            <CardDescription>Verifica rapido si el export trajo lo minimo necesario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-2 font-medium">Detectadas</p>
              <div className="flex flex-wrap gap-2">
                {(result?.detectedCookies || []).map((cookieName) => (
                  <span key={cookieName} className="rounded-full border px-2 py-1 text-xs">
                    {cookieName}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-medium">Faltantes requeridas</p>
              <div className="flex flex-wrap gap-2">
                {(result?.missingRequiredCookies || REQUIRED_COOKIE_NAMES).map((cookieName) => (
                  <span
                    key={cookieName}
                    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs"
                  >
                    {cookieName}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="flex items-center gap-2 font-medium">
                <ShieldAlert className="size-4" />
                Opcionales utiles
              </p>
              <p className="mt-2 text-muted-foreground">{OPTIONAL_COOKIE_NAMES.join(", ")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
