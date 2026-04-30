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
  etiqueta: string;
  descripcion: string;
  resumen: string;
  ruta: string;
  icono: Component;
  estado: EstadoPanelDashboard;
  detalle: string;
  funciones: string[];
  integraciones: string[];
  accion: string;
  claseIcono: string;
  claseTarjeta: string;
}

export interface MetricaDashboard {
  etiqueta: string;
  valor: string;
  detalle: string;
  tendencia: string;
  tono: string;
}

export interface ProcesoDashboard {
  titulo: string;
  descripcion: string;
  resultado: string;
}
