import {
  CapaMapaPlacesOs,
  EstadoPanelDashboard,
  EtiquetaNoEncontrada,
} from "@/utils/enums/anums"

export const etiquetaNoEncontrada: Record<EtiquetaNoEncontrada, string> = {
  [EtiquetaNoEncontrada.DESCONOCIDA]: "Desconocido",
}

export const etiquetaEstadoPanelDashboard: Record<
  EstadoPanelDashboard,
  string
> = {
  [EstadoPanelDashboard.ACTIVO]: "Activo",
  [EstadoPanelDashboard.BASE]: "Base lista",
  [EstadoPanelDashboard.EN_PROGRESO]: "En progreso",
}

export const etiquetaCapaMapaPlacesOs: Record<CapaMapaPlacesOs, string> = {
  [CapaMapaPlacesOs.OSCURO]: "Modo oscuro",
  [CapaMapaPlacesOs.NORMAL]: "Modo normal",
}
