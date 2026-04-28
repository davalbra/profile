import {
  Boxes,
  ChartColumn,
  ImageIcon,
  Music4,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
} from "lucide-vue-next";
import type {
  MetricaDashboard,
  ModuloDashboard,
  NavegacionDashboard,
  ProcesoDashboard,
} from "@/lib/dashboard/dashboard.types";
import { EstadoPanelDashboard } from "@/utils/enums/anums";

export const navegacionDashboard: NavegacionDashboard[] = [
  {
    etiqueta: "Resumen",
    ruta: "/dashboard",
    icono: Boxes,
  },
  {
    etiqueta: "Billing",
    ruta: "/dashboard/billing/firebase",
    icono: ChartColumn,
  },
  {
    etiqueta: "MCP",
    ruta: "/dashboard/mcp/optimize",
    icono: Sparkles,
  },
  {
    etiqueta: "Imágenes",
    ruta: "/dashboard/images/gallery",
    icono: ImageIcon,
  },
  {
    etiqueta: "Milka",
    ruta: "/dashboard/milka/musica",
    icono: Music4,
  },
];

export const modulosDashboard: ModuloDashboard[] = [
  {
    titulo: "Billing",
    descripcion:
      "Costos reales de Firebase y Gemini desde Cloud Billing exportado a BigQuery.",
    ruta: "/dashboard/billing/firebase",
    icono: Wallet,
    estado: EstadoPanelDashboard.ACTIVO,
    progreso: 92,
    detalle: "Control financiero",
    claseIcono: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/20",
    claseTarjeta: "from-emerald-500/20 via-cyan-500/10 to-transparent",
  },
  {
    titulo: "MCP",
    descripcion:
      "Documentación operativa del endpoint `/api/mcp` y herramientas disponibles.",
    ruta: "/dashboard/mcp/optimize",
    icono: Workflow,
    estado: EstadoPanelDashboard.ACTIVO,
    progreso: 88,
    detalle: "Automatización",
    claseIcono: "bg-cyan-400/15 text-cyan-100 ring-cyan-300/20",
    claseTarjeta: "from-cyan-500/20 via-sky-500/10 to-transparent",
  },
  {
    titulo: "Imágenes",
    descripcion:
      "Galería, optimización y flujo de copias listos para continuar la migración visual.",
    ruta: "/dashboard/images/gallery",
    icono: ImageIcon,
    estado: EstadoPanelDashboard.EN_PROGRESO,
    progreso: 76,
    detalle: "Assets y storage",
    claseIcono: "bg-amber-300/15 text-amber-100 ring-amber-200/20",
    claseTarjeta: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    titulo: "Milka",
    descripcion:
      "Suite de audio y lyrics preparada para portar sobre la nueva base Nuxt.",
    ruta: "/dashboard/milka/musica",
    icono: Music4,
    estado: EstadoPanelDashboard.BASE,
    progreso: 61,
    detalle: "Audio experimental",
    claseIcono: "bg-rose-300/15 text-rose-100 ring-rose-200/20",
    claseTarjeta: "from-rose-500/20 via-fuchsia-500/10 to-transparent",
  },
];

export const metricasDashboard: MetricaDashboard[] = [
  {
    etiqueta: "Módulos",
    valor: "4",
    detalle: "Vistas principales conectadas",
    tendencia: "+2 activas",
  },
  {
    etiqueta: "Runtime",
    valor: "Nuxt 4",
    detalle: "Base SSR con Tailwind 4",
    tendencia: "estable",
  },
  {
    etiqueta: "Sesión",
    valor: "Firebase",
    detalle: "Autenticación centralizada",
    tendencia: "segura",
  },
];

export const procesosDashboard: ProcesoDashboard[] = [
  {
    titulo: "Porting visual",
    descripcion: "Capas de dashboard, navegación y tarjetas migradas a shadcn.",
    progreso: 84,
  },
  {
    titulo: "Servicios internos",
    descripcion:
      "APIs heredadas expuestas con handlers Nuxt y compatibilidad incremental.",
    progreso: 72,
  },
  {
    titulo: "Operación segura",
    descripcion:
      "Firebase, storage, MCP y billing mantienen límites claros por módulo.",
    progreso: 79,
  },
];

export const credencialesDashboard = {
  titulo: "davalbra",
  subtitulo: "Control center",
  descripcion:
    "Dashboard privado para operar módulos, costos y herramientas internas.",
  iniciales: "DA",
  sello: "Nuxt + shadcn",
  accionPrimaria: "Abrir Billing",
  accionSecundaria: "Storage test",
  rutaPrimaria: "/dashboard/billing/firebase",
  rutaSecundaria: "/storage-test",
  indicador: ShieldCheck,
};
