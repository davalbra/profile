<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Clock3,
  Code,
  Database,
  GitFork,
  Github,
  Globe,
  Layers3,
  Linkedin,
  Mail,
  MonitorSmartphone,
  Moon,
  Network,
  ServerCog,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Workflow,
} from "lucide-vue-next";

useHead({
  title: "davalbra | Desarrollador de Software · Integraciones de IA · Datos y RAG",
  meta: [
    {
      name: "description",
      content:
        "Portafolio de davalbra: desarrollo full stack, integraciones de IA, automatizaciones con n8n y soluciones de datos y RAG.",
    },
  ],
});

const { isDark, toggleTheme } = useThemeMode();
const authModalOpen = ref(false);

const services = [
  {
    title: "Integraciones de IA",
    description: "OpenAI, Claude y Gemini con herramientas, flujos y automatizaciones orientadas a negocio.",
    icon: BrainCircuit,
  },
  {
    title: "Datos y RAG",
    description: "Vectorización, búsqueda semántica y arquitecturas sobre Postgres, Neon y pipelines de contexto.",
    icon: Database,
  },
  {
    title: "Automatización",
    description: "Flujos con n8n, webhooks e integración entre sistemas empresariales sin fricción operativa.",
    icon: Workflow,
  },
  {
    title: "Aplicaciones Integrales",
    description: "Nuxt, Vue, Node y Prisma para productos completos, desde landing hasta panel interno.",
    icon: Code,
  },
  {
    title: "Móvil",
    description: "Kotlin y Jetpack Compose para apps nativas con experiencia fluida y mantenible.",
    icon: Smartphone,
  },
  {
    title: "Sistemas de Conectividad",
    description: "Backends con APIs robustas, MCP, procesos batch y herramientas de soporte operativo.",
    icon: Network,
  },
];

const stackGroups = [
  {
    name: "Interfaz",
    icon: MonitorSmartphone,
    border: "hover:border-cyan-400/45",
    glow: "from-cyan-400/20",
    dot: "bg-cyan-300",
    items: ["Nuxt", "Vue", "TypeScript", "Tailwind CSS"],
  },
  {
    name: "Backend y Datos",
    icon: ServerCog,
    border: "hover:border-emerald-400/45",
    glow: "from-emerald-400/20",
    dot: "bg-emerald-300",
    items: ["Node.js", "PostgreSQL", "Neon", "Prisma"],
  },
  {
    name: "IA y Automatización",
    icon: BrainCircuit,
    border: "hover:border-violet-400/45",
    glow: "from-violet-400/20",
    dot: "bg-violet-300",
    items: ["OpenAI", "Claude", "Gemini", "n8n"],
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
              DISPONIBLE PARA NUEVOS PROYECTOS
            </div>

            <h1 class="text-balance text-5xl font-extrabold leading-[1.07] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Hola, soy <br />
              <span class="text-glow bg-gradient-to-r from-[#137fec] via-[#5faaf3] to-white bg-clip-text text-transparent">
                davalbra
              </span>
            </h1>

            <div class="space-y-3">
              <h2 class="font-mono text-lg text-slate-300 sm:text-xl">
                Desarrollador de Software <span class="mx-2 text-[#137fec]">|</span>
                <span class="text-slate-400"> Integraciones de IA y RAG</span>
              </h2>
              <p class="max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Arquitecto soluciones web y móviles con IA aplicada, automatización de procesos y sistemas de datos escalables para negocio real.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              href="mailto:alvrobravo@gmail.com"
              class="group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#137fec] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(19,127,236,0.3)] transition hover:bg-[#0e64bd]"
            >
              Contrátame
              <ArrowRight class="h-4 w-4 transition group-hover:translate-x-1" />
              <span class="shimmer absolute inset-0 h-full w-full" />
            </a>

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
              <div class="font-mono text-xs text-slate-500">rag_pipeline.ts</div>
            </div>

            <div class="relative overflow-hidden rounded-b-2xl border-x border-b border-slate-700/60 bg-[#0b1219] p-6 font-mono text-sm">
              <div class="absolute bottom-0 left-0 top-0 w-10 select-none border-r border-slate-800 bg-[#16222e]/45 pr-2 pt-6 text-right leading-6 text-slate-600">
                1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9<br />10<br />11
              </div>
              <div class="pl-8 leading-6 text-slate-200">
                <span class="text-violet-400">import</span> openai<br />
                <span class="text-violet-400">from</span> langchain <span class="text-violet-400">import</span> <span class="text-yellow-300">VectorStore</span><br /><br />
                <span class="text-violet-400">class</span> <span class="text-yellow-300">RAGAgent</span>:<br />
                <span class="text-violet-400">  def</span> <span class="text-blue-400">query</span>(<span class="text-red-300">prompt</span>):<br />
                <span class="text-slate-500">    # recuperar contexto y generar</span><br />
                <span class="text-violet-400">    return await</span> <span class="text-cyan-300">llm.predict</span>(<span class="text-orange-300">prompt</span>)<br /><br />
                <span class="text-violet-400">pipeline</span> = <span class="text-cyan-300">vector.search</span>()<br />
                <span class="text-violet-400">if</span> pipeline.<span class="text-cyan-300">score</span> &gt; <span class="text-green-300">0.92</span>:<br />
                <span class="text-violet-400">  return</span> <span class="text-cyan-300">response</span>
              </div>
            </div>

            <div class="absolute -bottom-8 -right-12 z-10 w-32 rounded-2xl border border-slate-700/50 bg-[#16222e] p-3 shadow-xl">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precisión</span>
                <span class="font-mono text-[10px] text-green-400">98.4%</span>
              </div>
              <div class="mb-3 h-1.5 w-full rounded-full bg-slate-800">
                <div class="h-1.5 w-[98%] rounded-full bg-green-500" />
              </div>
              <div class="mb-1 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latencia</span>
                <span class="font-mono text-[10px] text-[#5faaf3]">24ms</span>
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
              <span>Base de Datos Vectorial</span>
            </div>
          </div>
        </div>
      </section>

      <section id="projects" class="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="service in services"
            :key="service.title"
            class="group rounded-[28px] border border-slate-700/70 bg-[#16222e]/70 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#137fec]/40"
          >
            <span class="mb-4 inline-flex rounded-2xl border border-[#137fec]/20 bg-[#137fec]/10 p-2 text-[#5faaf3]">
              <component :is="service.icon" class="h-4 w-4" />
            </span>
            <h3 class="text-lg font-semibold text-white">{{ service.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-400">{{ service.description }}</p>
          </article>
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
                  Arquitectura técnica
                </div>
                <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">Tecnologías</h2>
                <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  Herramientas que uso para diseñar, construir y desplegar productos digitales en producción.
                </p>
              </div>

              <div class="flex flex-wrap gap-2 text-xs text-slate-300">
                <span class="rounded-2xl border border-slate-600/70 bg-[#0f1a26]/80 px-3 py-1.5">
                  12 tecnologías
                </span>
                <span class="rounded-2xl border border-slate-600/70 bg-[#0f1a26]/80 px-3 py-1.5">
                  3 capas de especialidad
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
          <h2 class="text-2xl font-bold text-white">Construyamos algo útil</h2>
          <p class="mt-2 max-w-2xl text-sm text-slate-300">
            Si quieres integrar IA, automatizar procesos o lanzar un producto digital completo, conversemos.
          </p>
          <div class="mt-5 flex flex-wrap gap-3">
            <a
              href="mailto:alvrobravo@gmail.com"
              class="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#137fec] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0e64bd]"
            >
              <Mail class="h-4 w-4" />
              Escribirme
            </a>
            <NuxtLink
              to="/dashboard"
              class="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#137fec]/55 hover:bg-[#137fec]/10"
            >
              Dashboard Nuxt
              <Sparkles class="h-4 w-4" />
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
