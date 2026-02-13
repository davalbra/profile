import { Bot, BrainCircuit, Code, Database, Network, Smartphone, Workflow } from "lucide-react";
import type { FeaturedDeployment, Service, StackGroup } from "@/components/landing/types";

export const githubUsername = "davalbra";

export const pinnedRepos = ["davalbra", "profile", "lynxInit", "rsbuild-plugin-tailwindcss"];

export const services: Service[] = [
  {
    title: "Integraciones de IA",
    description: "OpenAI, Claude y Gemini con herramientas, llamada de funciones y asistentes.",
    icon: BrainCircuit,
  },
  {
    title: "Datos y RAG",
    description: "Vectorización, búsqueda semántica y pgvector sobre Postgres/Neon.",
    icon: Database,
  },
  {
    title: "Automatización",
    description: "Flujos con n8n, webhooks e integración entre sistemas empresariales.",
    icon: Workflow,
  },
  {
    title: "Aplicaciones Integrales",
    description: "Next.js / React / Vue con APIs robustas en Node.",
    icon: Code,
  },
  {
    title: "Móvil",
    description: "Kotlin + Jetpack Compose con Retrofit y Room.",
    icon: Smartphone,
  },
];

export const stackGroups: StackGroup[] = [
  {
    name: "Interfaz",
    items: [
      { label: "Vue", color: "111&logo=vuedotjs&logoColor=white" },
      { label: "React", color: "111&logo=react&logoColor=white" },
      { label: "Next.js", color: "111&logo=nextdotjs&logoColor=white" },
      { label: "TypeScript", color: "111&logo=typescript&logoColor=white" },
    ],
  },
  {
    name: "Backend y Datos",
    items: [
      { label: "Node.js", color: "111&logo=nodedotjs&logoColor=white" },
      { label: "PostgreSQL", color: "111&logo=postgresql&logoColor=white" },
      { label: "Neon", color: "111&logo=neon&logoColor=white" },
      { label: "Prisma", color: "111&logo=prisma&logoColor=white" },
    ],
  },
  {
    name: "IA y Automatización",
    items: [
      { label: "OpenAI", color: "111&logo=openai&logoColor=white" },
      { label: "Claude", color: "111&logo=anthropic&logoColor=white" },
      { label: "Gemini", color: "111&logo=googlegemini&logoColor=white" },
      { label: "n8n", color: "111&logo=n8n&logoColor=white" },
    ],
  },
];

export const heatmapLevels = [
  "border border-slate-700/70 bg-[#101922]",
  "bg-[#137fec]/25",
  "bg-[#137fec]/45",
  "bg-[#137fec]/70",
  "bg-[#137fec]",
];

export const featuredDeployments: FeaturedDeployment[] = [
  {
    title: "Asistente de WhatsApp con IA",
    description:
      "Agente conversacional para WhatsApp con retención de contexto, análisis de imágenes y agenda automatizada.",
    icon: Bot,
    repoUrl: "https://github.com/davalbra",
    demoUrl: "https://www.davalbra.cloud/",
    tags: [
      { name: "Python", className: "text-blue-300" },
      { name: "OpenAI API", className: "text-emerald-300" },
      { name: "Twilio", className: "text-purple-300" },
      { name: "AWS Lambda", className: "text-orange-300" },
    ],
    iconShellClassName: "border-[#137fec]/30 bg-[#137fec]/20",
    iconClassName: "text-[#5faaf3]",
    cardPatternClassName:
      "bg-gradient-to-br from-slate-800 to-[#101922] [background-image:radial-gradient(rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:20px_20px]",
  },
  {
    title: "Orquestador de Pipeline de Datos",
    description:
      "Framework ETL escalable para datos a gran escala con flujos automáticos de extracción, transformación y carga.",
    icon: Network,
    repoUrl: "https://github.com/davalbra",
    demoUrl: "https://www.davalbra.cloud/",
    tags: [
      { name: "Apache Airflow", className: "text-pink-300" },
      { name: "Docker", className: "text-cyan-300" },
      { name: "SQL", className: "text-yellow-300" },
    ],
    iconShellClassName: "border-sky-500/30 bg-sky-500/15",
    iconClassName: "text-sky-400",
    cardPatternClassName:
      "bg-gradient-to-bl from-slate-900 via-[#0b5cb0]/20 to-slate-900 [background-image:linear-gradient(45deg,transparent_25%,rgba(148,163,184,0.16)_50%,transparent_75%,transparent_100%)] [background-size:4px_4px]",
  },
];
