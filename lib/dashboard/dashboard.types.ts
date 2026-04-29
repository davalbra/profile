import type { Component } from "vue";
import type { EstadoPanelDashboard } from "@/utils/enums/anums";

export interface NavegacionDashboard {
  etiqueta: string;
  ruta: string;
  icono: Component;
  subsecciones?: NavegacionDashboard[];
}

export interface ModuloDashboard {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: Component;
  estado: EstadoPanelDashboard;
  progreso: number;
  detalle: string;
  claseIcono: string;
  claseTarjeta: string;
}

export interface MetricaDashboard {
  etiqueta: string;
  valor: string;
  detalle: string;
  tendencia: string;
}

export interface ProcesoDashboard {
  titulo: string;
  descripcion: string;
  progreso: number;
}
