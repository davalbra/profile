import {
  EstadoPanelDashboard,
  EtiquetaNoEncontrada,
} from "@/utils/enums/anums";

export const etiquetaNoEncontrada: Record<EtiquetaNoEncontrada, string> = {
  [EtiquetaNoEncontrada.DESCONOCIDA]: "Desconocido",
};

export const etiquetaEstadoPanelDashboard: Record<
  EstadoPanelDashboard,
  string
> = {
  [EstadoPanelDashboard.ACTIVO]: "Activo",
  [EstadoPanelDashboard.BASE]: "Base lista",
  [EstadoPanelDashboard.EN_PROGRESO]: "En progreso",
};
