import {
  Bot,
  Boxes,
  ChartColumn,
  CircleDollarSign,
  Cookie,
  Flame,
  Headphones,
  ImageIcon,
  Images,
  Music4,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
  Wrench,
  Zap,
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
    subsecciones: [
      {
        etiqueta: "Firebase",
        ruta: "/dashboard/billing/firebase",
        icono: Flame,
      },
      {
        etiqueta: "Google Gemini API",
        ruta: "/dashboard/billing/gemini",
        icono: Bot,
      },
    ],
  },
  {
    etiqueta: "MCP",
    ruta: "/dashboard/mcp/optimize",
    icono: Wrench,
    subsecciones: [
      {
        etiqueta: "Optimizar",
        ruta: "/dashboard/mcp/optimize",
        icono: Zap,
      },
      {
        etiqueta: "Billing",
        ruta: "/dashboard/mcp/billing",
        icono: CircleDollarSign,
      },
    ],
  },
  {
    etiqueta: "Imágenes",
    ruta: "/dashboard/images/optimize",
    icono: ImageIcon,
    subsecciones: [
      {
        etiqueta: "Optimizar",
        ruta: "/dashboard/images/optimize",
        icono: Zap,
      },
      {
        etiqueta: "n8n",
        ruta: "/dashboard/images/copies",
        icono: Sparkles,
      },
      {
        etiqueta: "Galería",
        ruta: "/dashboard/images/gallery",
        icono: Images,
      },
    ],
  },
  {
    etiqueta: "Milka",
    ruta: "/dashboard/milka/musica",
    icono: Headphones,
    subsecciones: [
      {
        etiqueta: "Musica",
        ruta: "/dashboard/milka/musica",
        icono: Music4,
      },
      {
        etiqueta: "Cookies",
        ruta: "/dashboard/milka/cookies",
        icono: Cookie,
      },
    ],
  },
];

export const modulosDashboard: ModuloDashboard[] = [
  {
    titulo: "Billing",
    etiqueta: "FinOps",
    descripcion:
      "Consulta operativa de costos por servicio para evitar revisar Cloud Console manualmente.",
    resumen:
      "Centraliza Firebase y Google Gemini API usando el export de Cloud Billing a BigQuery. Sirve para revisar consumo, detectar variaciones y comparar periodos desde el dashboard.",
    ruta: "/dashboard/billing/firebase",
    icono: Wallet,
    estado: EstadoPanelDashboard.ACTIVO,
    progreso: 92,
    detalle: "Firebase + Gemini",
    funciones: [
      "Lectura de costos por periodo",
      "Separación por servicio y SKU",
      "Base para alertas y auditoría de consumo",
    ],
    integraciones: ["Cloud Billing", "BigQuery", "Firebase", "Gemini API"],
    accion: "Revisar costos",
    claseIcono: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/20",
    claseTarjeta: "from-emerald-500/20 via-cyan-500/10 to-transparent",
  },
  {
    titulo: "MCP",
    etiqueta: "Herramientas IA",
    descripcion:
      "Endpoint JSON-RPC para exponer capacidades del proyecto como herramientas consumibles por agentes.",
    resumen:
      "Publica herramientas MCP para optimizar imágenes y consultar billing. Está pensado para conectar asistentes, automatizaciones o clientes internos sin duplicar lógica.",
    ruta: "/dashboard/mcp/optimize",
    icono: Workflow,
    estado: EstadoPanelDashboard.ACTIVO,
    progreso: 88,
    detalle: "/api/mcp",
    funciones: [
      "Tool `optimize_image` por URL",
      "Tool `billing_usage` por servicio",
      "Autenticación opcional por token",
    ],
    integraciones: ["MCP", "JSON-RPC", "Sharp", "Billing API"],
    accion: "Ver herramientas",
    claseIcono: "bg-cyan-400/15 text-cyan-100 ring-cyan-300/20",
    claseTarjeta: "from-cyan-500/20 via-sky-500/10 to-transparent",
  },
  {
    titulo: "Imágenes",
    etiqueta: "Assets",
    descripcion:
      "Administración de assets: galería, optimización AVIF, descarga segura y copias listas para automatización.",
    resumen:
      "Gestiona imágenes en Firebase Storage, genera versiones optimizadas, prepara JPG cuando un flujo lo requiere y mantiene una galería reutilizable para operaciones n8n.",
    ruta: "/dashboard/images/optimize",
    icono: ImageIcon,
    estado: EstadoPanelDashboard.ACTIVO,
    progreso: 90,
    detalle: "Storage + AVIF + n8n",
    funciones: [
      "Subida, renombrado y eliminación",
      "Optimización AVIF con historial",
      "Copias y conversiones para n8n",
    ],
    integraciones: ["Firebase Storage", "Sharp", "n8n", "Galería"],
    accion: "Gestionar imágenes",
    claseIcono: "bg-amber-300/15 text-amber-100 ring-amber-200/20",
    claseTarjeta: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    titulo: "Milka",
    etiqueta: "Audio privado",
    descripcion:
      "Área experimental para música, audio, lyrics sincronizadas y utilidades de sesión/cookies.",
    resumen:
      "Agrupa pruebas internas de audio y letras sincronizadas, junto con utilidades de cookies que pueden reconectarse al flujo privado cuando haga falta.",
    ruta: "/dashboard/milka/musica",
    icono: Music4,
    estado: EstadoPanelDashboard.BASE,
    progreso: 61,
    detalle: "Música + lyrics",
    funciones: [
      "Consulta de audio por video",
      "Letras y sincronización",
      "Base para limpieza de cookies",
    ],
    integraciones: ["YouTube Music", "Lyrics", "Cookies", "Storage local"],
    accion: "Abrir Milka",
    claseIcono: "bg-rose-300/15 text-rose-100 ring-rose-200/20",
    claseTarjeta: "from-rose-500/20 via-fuchsia-500/10 to-transparent",
  },
];

export const metricasDashboard: MetricaDashboard[] = [
  {
    etiqueta: "MCP",
    valor: "2",
    detalle: "Herramientas JSON-RPC disponibles para agentes y automatizaciones.",
    tendencia: "operativo",
    tono: "text-cyan-100",
  },
  {
    etiqueta: "Imágenes",
    valor: "3 vistas",
    detalle: "Galería, optimización y copias n8n en un mismo flujo.",
    tendencia: "activo",
    tono: "text-amber-100",
  },
  {
    etiqueta: "Billing",
    valor: "2 fuentes",
    detalle: "Firebase y Gemini consultados desde Cloud Billing exportado.",
    tendencia: "conectado",
    tono: "text-emerald-100",
  },
];

export const procesosDashboard: ProcesoDashboard[] = [
  {
    titulo: "MCP operativo",
    descripcion:
      "El endpoint `/api/mcp` documenta y ejecuta herramientas que reutilizan la lógica real del proyecto.",
    progreso: 88,
    resultado: "Automatización lista para agentes",
  },
  {
    titulo: "Tratamiento de imágenes",
    descripcion:
      "Firebase Storage, compresión AVIF, conversión JPG y copias n8n quedan conectadas al dashboard.",
    progreso: 90,
    resultado: "Assets preparados para publicación o flujos",
  },
  {
    titulo: "Control de billing",
    descripcion:
      "Las vistas de Firebase y Gemini reducen la fricción para revisar consumo por servicio.",
    progreso: 92,
    resultado: "Costos visibles sin salir del panel",
  },
];

export const credencialesDashboard = {
  titulo: "davalbra",
  subtitulo: "Project control center",
  descripcion:
    "Dashboard privado para operar MCP, billing, imágenes, automatizaciones n8n y utilidades Milka.",
  iniciales: "DA",
  sello: "Nuxt + shadcn",
  accionPrimaria: "Abrir billing",
  accionSecundaria: "Storage test",
  rutaPrimaria: "/dashboard/billing/firebase",
  rutaSecundaria: "/storage-test",
  indicador: ShieldCheck,
};
