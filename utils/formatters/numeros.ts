export function formatearPorcentaje(porcentaje: number | null): string {
  if (porcentaje === null || Number.isNaN(porcentaje)) return "-"
  return `${porcentaje.toFixed(1)}%`
}

export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(valor)
}

export function formatearNumeroCompacto(valor: number): string {
  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valor)
}

export function formatearMoneda(valor: number, codigoMoneda: string): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: codigoMoneda || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)
  } catch {
    return `${valor.toFixed(2)} ${codigoMoneda || "USD"}`
  }
}
