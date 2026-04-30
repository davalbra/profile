<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Clock3,
  Database,
  GitFork,
  Github,
  Globe,
  ImageIcon,
  Layers3,
  Linkedin,
  MonitorSmartphone,
  Moon,
  Music4,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Wallet,
  Workflow,
} from "lucide-vue-next";

useHead({
  title: "davalbra | Control center Nuxt para MCP, billing e imágenes",
  meta: [
    {
      name: "description",
      content:
        "Proyecto Nuxt de davalbra: dashboard privado para MCP, billing Firebase/Gemini, optimización de imágenes, flujos n8n y utilidades Milka.",
    },
  ],
});

const { isDark, toggleTheme } = useThemeMode();
const authModalOpen = ref(false);

const services = [
  {
    title: "Billing Firebase y Gemini",
    eyebrow: "FinOps",
    description:
      "Consulta costos desde Cloud Billing exportado a BigQuery para revisar consumo por servicio sin salir del panel.",
    route: "/dashboard/billing/firebase",
    features: ["Firebase", "Gemini API", "BigQuery"],
    icon: Wallet,
  },
  {
    title: "Herramientas MCP",
    eyebrow: "Agentes",
    description:
      "Endpoint JSON-RPC que expone `optimize_image` y `billing_usage` para automatizaciones o clientes MCP.",
    route: "/dashboard/mcp/optimize",
    features: ["/api/mcp", "JSON-RPC", "Token opcional"],
    icon: Bot,
  },
  {
    title: "Imágenes y galería",
    eyebrow: "Assets",
    description:
      "Sube, renombra, optimiza en AVIF, descarga con permisos y prepara copias JPG para flujos n8n.",
    route: "/dashboard/images/optimize",
    features: ["Firebase Storage", "AVIF/JPG", "n8n"],
    icon: ImageIcon,
  },
  {
    title: "Milka audio y lyrics",
    eyebrow: "Experimental",
    description:
      "Zona privada para música, letras sincronizadas, audio y utilidades de cookies que se pueden reconectar.",
    route: "/dashboard/milka/musica",
    features: ["YouTube Music", "Lyrics", "Cookies"],
    icon: Music4,
  },
  {
    title: "Autenticación privada",
    eyebrow: "Acceso",
    description:
      "Sesión Firebase, roles y validaciones server-side para proteger operaciones sensibles del dashboard.",
    route: "/dashboard",
    features: ["Firebase Auth", "Roles", "Storage seguro"],
    icon: ShieldCheck,
  },
  {
    title: "Base Nuxt operativa",
    eyebrow: "Arquitectura",
    description:
      "Aplicación Nuxt con rutas server, Prisma, componentes shadcn-vue y módulos separados por operación.",
    route: "/dashboard",
    features: ["Nuxt", "Prisma", "shadcn-vue"],
    icon: Workflow,
  },
];

const stackGroups = [
  {
    name: "Interfaz",
    icon: MonitorSmartphone,
    border: "hover:border-cyan-400/45",
    glow: "from-cyan-400/20",
    dot: "bg-cyan-300",
    items: ["Nuxt 4", "Vue", "TypeScript", "shadcn-vue"],
  },
  {
    name: "Backend y Datos",
    icon: ServerCog,
    border: "hover:border-emerald-400/45",
    glow: "from-emerald-400/20",
    dot: "bg-emerald-300",
    items: ["Nitro API", "Prisma", "PostgreSQL", "Firebase Admin"],
  },
  {
    name: "Operación",
    icon: BrainCircuit,
    border: "hover:border-violet-400/45",
    glow: "from-violet-400/20",
    dot: "bg-violet-300",
    items: ["MCP", "Gemini Billing", "Sharp", "n8n"],
  },
];

const formatCompact = (value: number) =>
  new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const formatRelativeDate = (isoDate: string) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `hace ${Math.max(1, Math.floor(diffMs / minute))} min`;
  }

  if (diffMs < day) {
    return `hace ${Math.max(1, Math.floor(diffMs / hour))} h`;
  }

  return `hace ${Math.max(1, Math.floor(diffMs / day))} d`;
};

const { data } = await useFetch("/api/github/pinned", {
  default: () => ({ repos: [] }),
});

const pinnedRepositories = computed(() =>
  (data.value?.repos || []).map((repo) => ({
    ...repo,
    starsText: formatCompact(repo.stars),
    forksText: formatCompact(repo.forks),
    updatedText: formatRelativeDate(repo.updatedAt),
  })),
);
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden text-slate-100">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[size:40px_40px] [background-image:linear-gradient(to_right,rgba(19,127,236,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(19,127,236,0.07)_1px,transparent_1px)]"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -top-32 right-[-140px] h-96 w-96 rounded-full bg-[#137fec]/25 blur-3xl"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute bottom-0 left-[-110px] h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"
    />

    <nav class="glass-nav fixed inset-x-0 top-0 z-50">
      <div class="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center text-2xl font-bold tracking-tight text-white transition hover:text-[#5faaf3]"
          @click="authModalOpen = true"
        >
          <small>davalbra</small>
          <span class="text-[#137fec]">.</span>
        </button>

        <div class="flex items-center gap-2 md:gap-4">
          <div class="hidden items-center gap-7 md:flex">
            <a href="#home" class="text-sm font-medium text-white transition hover:text-[#5faaf3]">Inicio</a>
            <a href="#projects" class="text-sm font-medium text-slate-400 transition hover:text-white">Proyectos</a>
            <a href="#stack" class="text-sm font-medium text-slate-400 transition hover:text-white">Tecnologías</a>
            <a href="#contact" class="text-sm font-medium text-slate-400 transition hover:text-white">Contacto</a>
          </div>
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:border-[#137fec]/40"
            aria-label="Cambiar tema"
            @click="toggleTheme"
          >
            <Sun v-if="isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>

    <main id="home" class="relative z-10 pt-24">
      <section class="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
        <div class="animate-fade-in-up space-y-8">
          <div class="space-y-4">
            <div class="inline-flex items-center rounded-full border border-[#137fec]/25 bg-[#137fec]/10 px-3 py-1 font-mono text-xs font-medium tracking-wide text-[#5faaf3]">
              <span class="mr-2 h-2 w-2 animate-pulse rounded-full bg-[#137fec]" />
              DASHBOARD PRIVADO · NUXT + MCP + BILLING
            </div>

            <h1 class="text-balance text-5xl font-extrabold leading-[1.07] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Control center para <br>
              <span class="text-glow bg-gradient-to-r from-[#137fec] via-[#5faaf3] to-white bg-clip-text text-transparent">
                módulos reales
              </span>
            </h1>

            <div class="space-y-3">
              <h2 class="font-mono text-lg text-slate-300 sm:text-xl">
                MCP <span class="mx-2 text-[#137fec]">|</span>
                <span class="text-slate-400"> Billing · imágenes · n8n · Milka</span>
              </h2>
              <p class="max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Esta app no es solo una landing: agrupa herramientas operativas para consultar costos,
                optimizar assets, exponer capacidades MCP y administrar flujos privados desde un solo panel.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <NuxtLink
              to="/dashboard"
              class="group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#137fec] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(19,127,236,0.3)] transition hover:bg-[#0e64bd]"
            >
              Entrar al dashboard
              <ArrowRight class="h-4 w-4 transition group-hover:translate-x-1" />
              <span class="shimmer absolute inset-0 h-full w-full" />
            </NuxtLink>

            <div class="flex items-center gap-3">
              <a
                aria-label="Perfil de GitHub"
                href="https://github.com/davalbra"
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#16222e]/80 p-3 text-slate-400 transition hover:border-[#137fec]/50 hover:bg-[#137fec]/10 hover:text-white"
              >
                <Github class="h-5 w-5" />
              </a>
              <a
                aria-label="Perfil de LinkedIn"
                href="https://www.linkedin.com/in/alvarobravo/"
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#16222e]/80 p-3 text-slate-400 transition hover:border-[#137fec]/50 hover:bg-[#137fec]/10 hover:text-white"
              >
                <Linkedin class="h-5 w-5" />
              </a>
              <a
                aria-label="Sitio web"
                href="https://www.davalbra.cloud/"
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#16222e]/80 p-3 text-slate-400 transition hover:border-[#137fec]/50 hover:bg-[#137fec]/10 hover:text-white"
              >
                <Globe class="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div class="relative hidden min-h-[500px] items-center justify-center lg:flex">
          <div class="pointer-events-none absolute inset-0 translate-x-10 translate-y-10 rounded-full bg-gradient-to-tr from-[#137fec]/25 via-transparent to-transparent blur-3xl" />

          <div class="code-glow relative mx-auto w-full max-w-md transition duration-500 hover:-translate-y-2">
            <div class="flex items-center justify-between rounded-t-2xl border border-slate-700/60 bg-[#16222e] p-4">
              <div class="flex space-x-2">
                <div class="h-3 w-3 rounded-full bg-red-500/80" />
                <div class="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div class="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div class="font-mono text-xs text-slate-500">server/api/mcp.ts</div>
            </div>

            <div class="relative overflow-hidden rounded-b-2xl border-x border-b border-slate-700/60 bg-[#0b1219] p-6 font-mono text-sm">
              <div class="absolute bottom-0 left-0 top-0 w-10 select-none border-r border-slate-800 bg-[#16222e]/45 pr-2 pt-6 text-right leading-6 text-slate-600">
                1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>10<br>11
              </div>
              <div class="pl-8 leading-6 text-slate-200">
                <span class="text-violet-400">const</span> tools = [<span class="text-orange-300">"optimize_image"</span>, <span class="text-orange-300">"billing_usage"</span>]<br><br>
                <span class="text-violet-400">export async function</span> <span class="text-blue-400">POST</span>(request) {<br>
                <span class="text-slate-500">  // valida token MCP opcional</span><br>
                <span class="text-violet-400">  const</span> call = <span class="text-cyan-300">await</span> request.json()<br>
                <span class="text-violet-400">  if</span> (call.params.name === <span class="text-orange-300">"billing_usage"</span>)<br>
                <span class="text-violet-400">    return</span> <span class="text-cyan-300">getBillingUsage</span>()<br><br>
                <span class="text-violet-400">  return</span> <span class="text-cyan-300">optimizeImage</span>(call.params.arguments)<br>
                }
              </div>
            </div>

            <div class="absolute -bottom-8 -right-12 z-10 w-32 rounded-2xl border border-slate-700/50 bg-[#16222e] p-3 shadow-xl">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Módulos</span>
                <span class="font-mono text-[10px] text-green-400">4</span>
              </div>
              <div class="mb-3 h-1.5 w-full rounded-full bg-slate-800">
                <div class="h-1.5 w-[98%] rounded-full bg-green-500" />
              </div>
              <div class="mb-1 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tools</span>
                <span class="font-mono text-[10px] text-[#5faaf3]">2 MCP</span>
              </div>
              <div class="mt-2 flex h-8 items-end justify-between gap-1">
                <div class="h-3 w-1 rounded-sm bg-[#137fec]/30" />
                <div class="h-5 w-1 rounded-sm bg-[#137fec]/50" />
                <div class="h-4 w-1 rounded-sm bg-[#137fec]/70" />
                <div class="h-7 w-1 rounded-sm bg-[#137fec]" />
                <div class="h-5 w-1 rounded-sm bg-[#137fec]/60" />
                <div class="h-2 w-1 rounded-sm bg-[#137fec]/40" />
              </div>
            </div>

            <div class="absolute -left-6 top-20 flex items-center gap-2 rounded-2xl border border-[#137fec]/20 bg-[#137fec]/10 px-3 py-1.5 text-xs text-white shadow-lg">
              <Database class="h-4 w-4 text-[#5faaf3]" />
              <span>Cloud Billing + Storage</span>
            </div>
          </div>
        </div>
      </section>

      <section id="projects" class="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#5faaf3]">
              <Sparkles class="h-3.5 w-3.5" />
              Módulos del proyecto
            </div>
            <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Qué hace cada sección
            </h2>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              La página principal ahora resume la app real: operación privada,
              APIs server-side, assets, costos y automatizaciones conectadas.
            </p>
          </div>
          <NuxtLink
            to="/dashboard"
            class="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-600/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#137fec]/50 hover:bg-[#137fec]/10"
          >
            Ver resumen operativo
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="service in services"
            :key="service.title"
            :to="service.route"
            class="group rounded-[28px] border border-slate-700/70 bg-[#16222e]/70 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#137fec]/40"
          >
            <div class="mb-4 flex items-start justify-between gap-4">
              <span class="inline-flex rounded-2xl border border-[#137fec]/20 bg-[#137fec]/10 p-2 text-[#5faaf3]">
                <component :is="service.icon" class="h-4 w-4" />
              </span>
              <span class="rounded-full border border-slate-600/70 bg-[#0b1219]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {{ service.eyebrow }}
              </span>
            </div>
            <h3 class="text-lg font-semibold text-white">{{ service.title }}</h3>
            <p class="mt-2 min-h-20 text-sm leading-relaxed text-slate-400">
              {{ service.description }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="feature in service.features"
                :key="feature"
                class="rounded-xl border border-slate-700 bg-[#0b1219]/75 px-2.5 py-1 text-xs text-slate-300"
              >
                {{ feature }}
              </span>
            </div>
            <span class="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#5faaf3] transition group-hover:text-white">
              Abrir módulo
              <ArrowRight class="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </NuxtLink>
        </div>
      </section>

      <section id="stack" class="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div class="relative overflow-hidden rounded-[30px] border border-slate-700/70 bg-[#16222e]/65 p-6 backdrop-blur-sm lg:p-7">
          <div aria-hidden="true" class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#137fec]/12 blur-3xl" />
          <div aria-hidden="true" class="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div class="relative z-10">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div class="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#5faaf3]">
                  <Layers3 class="h-3.5 w-3.5" />
                  Arquitectura del proyecto
                </div>
                <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">Capas técnicas</h2>
                <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  El proyecto separa UI, rutas server, datos, automatización y procesamiento de archivos para mantener cada módulo aislado.
                </p>
              </div>

              <div class="flex flex-wrap gap-2 text-xs text-slate-300">
                <span class="rounded-2xl border border-slate-600/70 bg-[#0f1a26]/80 px-3 py-1.5">
                  12 piezas clave
                </span>
                <span class="rounded-2xl border border-slate-600/70 bg-[#0f1a26]/80 px-3 py-1.5">
                  3 capas operativas
                </span>
              </div>
            </div>

            <div class="mt-6 grid gap-5 lg:grid-cols-3">
              <article
                v-for="group in stackGroups"
                :key="group.name"
                class="group relative overflow-hidden rounded-[28px] border border-slate-700/70 bg-[#0b1219]/85 p-5 transition duration-300 hover:-translate-y-1"
                :class="group.border"
              >
                <div
                  aria-hidden="true"
                  class="pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
                  :class="group.glow"
                />
                <div class="relative z-10">
                  <div class="mb-4 flex items-center justify-between">
                    <div class="inline-flex items-center gap-2">
                      <span class="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-slate-600/60">
                        <component :is="group.icon" class="h-4 w-4 text-slate-100" />
                      </span>
                      <h3 class="text-sm font-bold uppercase tracking-[0.14em] text-slate-300">
                        {{ group.name }}
                      </h3>
                    </div>
                    <span class="text-xs text-slate-500">{{ group.items.length }} herramientas</span>
                  </div>

                  <div class="grid gap-2.5">
                    <div
                      v-for="item in group.items"
                      :key="item"
                      class="flex min-h-11 items-center rounded-2xl border border-slate-700/70 bg-[#0f1a26]/80 px-3 py-2 text-sm transition hover:border-slate-500/70"
                    >
                      <span class="inline-flex items-center gap-2 text-slate-200">
                        <span class="h-2 w-2 rounded-full" :class="group.dot" />
                        {{ item }}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div class="rounded-[30px] border border-slate-700/70 bg-[#16222e]/65 p-6 backdrop-blur-sm">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="text-2xl font-bold text-white">Proyectos Destacados</h2>
            <a
              href="https://github.com/davalbra"
              target="_blank"
              rel="noreferrer"
              class="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-600/70 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#137fec]/50 hover:bg-[#137fec]/10"
            >
              Ver GitHub
              <ArrowUpRight class="h-4 w-4" />
            </a>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <article
              v-for="repo in pinnedRepositories"
              :key="repo.name"
              class="flex h-full flex-col rounded-[24px] border border-slate-700/70 bg-[#0b1219]/70 p-5 transition hover:border-[#137fec]/45"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-base font-semibold text-white">{{ repo.name }}</h3>
                  <p class="mt-2 text-sm leading-relaxed text-slate-400">{{ repo.description }}</p>
                </div>
                <a
                  :href="repo.htmlUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-600/70 text-slate-300 transition hover:border-[#137fec]/60 hover:text-white"
                  :aria-label="`Abrir repositorio ${repo.name}`"
                >
                  <Github class="h-4 w-4" />
                </a>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span class="inline-flex items-center gap-1">
                  <Star class="h-3.5 w-3.5 text-amber-300" />
                  {{ repo.starsText }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <GitFork class="h-3.5 w-3.5 text-[#5faaf3]" />
                  {{ repo.forksText }}
                </span>
                <span class="rounded-xl border border-slate-700 bg-slate-800 px-2 py-1 font-medium text-slate-300">
                  {{ repo.language }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <Clock3 class="h-3.5 w-3.5" />
                  Actualizado {{ repo.updatedText }}
                </span>
              </div>

              <a
                v-if="repo.homepage"
                :href="repo.homepage"
                target="_blank"
                rel="noreferrer"
                class="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#5faaf3] transition hover:text-white"
              >
                Proyecto en línea
                <ArrowUpRight class="h-4 w-4" />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="contact" class="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div class="rounded-[30px] border border-[#137fec]/30 bg-gradient-to-r from-[#0b1219] to-[#16222e] p-6">
          <h2 class="text-2xl font-bold text-white">Operar el proyecto</h2>
          <p class="mt-2 max-w-2xl text-sm text-slate-300">
            Usa el dashboard para revisar costos, ejecutar herramientas MCP, administrar imágenes o entrar a las utilidades Milka.
          </p>
          <div class="mt-5 flex flex-wrap gap-3">
            <NuxtLink
              to="/dashboard"
              class="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#137fec] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0e64bd]"
            >
              <Sparkles class="h-4 w-4" />
              Abrir dashboard
            </NuxtLink>
            <NuxtLink
              to="/storage-test"
              class="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#137fec]/55 hover:bg-[#137fec]/10"
            >
              Storage test
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <div class="fixed bottom-0 right-0 h-px w-1/3 bg-gradient-to-l from-[#137fec]/30 to-transparent" />
    <div class="fixed left-0 top-0 h-px w-1/3 bg-gradient-to-r from-[#137fec]/30 to-transparent" />

    <AuthModal v-model="authModalOpen" />
  </div>
</template>
