export function formatearFechaMediaConHora(fechaIso: string | null): string {
  if (!fechaIso) return "-"

  const fecha = new Date(fechaIso)
  if (Number.isNaN(fecha.getTime())) return "-"

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha)
}

export function formatearFechaCorta(fecha: string | null): string {
  if (!fecha) return "-"

  const fechaProcesada = new Date(`${fecha}T00:00:00Z`)
  if (Number.isNaN(fechaProcesada.getTime())) return fecha

  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
  }).format(fechaProcesada)
}

export function formatearFechaRelativa(fechaIso: string): string {
  const diferencia = Date.now() - new Date(fechaIso).getTime()
  const minuto = 60 * 1000
  const hora = 60 * minuto
  const dia = 24 * hora

  if (diferencia < hora) {
    return `hace ${Math.max(1, Math.floor(diferencia / minuto))} min`
  }

  if (diferencia < dia) {
    return `hace ${Math.max(1, Math.floor(diferencia / hora))} h`
  }

  return `hace ${Math.max(1, Math.floor(diferencia / dia))} d`
}
