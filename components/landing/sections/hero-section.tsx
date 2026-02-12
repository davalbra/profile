import { ArrowRight, Database, Github, Globe, Linkedin } from "lucide-react";

export function HeroSection() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
      <div className="animate-fade-in-up space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full border border-[#137fec]/25 bg-[#137fec]/10 px-3 py-1 font-mono text-xs font-medium tracking-wide text-[#5faaf3]">
            <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-[#137fec]" />
            AVAILABLE FOR NEW PROJECTS
          </div>

          <h1 className="text-balance text-5xl font-extrabold leading-[1.07] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Hola, soy <br />
            <span className="text-glow bg-gradient-to-r from-[#137fec] via-[#5faaf3] to-white bg-clip-text text-transparent">
              davalbra
            </span>
          </h1>

          <div className="space-y-3">
            <h2 className="font-mono text-lg text-slate-300 sm:text-xl">
              Full-Stack Developer <span className="mx-2 text-[#137fec]">|</span>
              <span className="text-slate-400"> AI Integrations & RAG</span>
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Arquitecto soluciones web y móviles con IA aplicada, automatización de procesos y
              sistemas de datos escalables para negocio real.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href="mailto:alvrobravo@gmail.com"
            className="group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#137fec] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(19,127,236,0.3)] transition-colors hover:bg-[#0e64bd]"
          >
            Hire me
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            <span className="shimmer absolute inset-0 h-full w-full" />
          </a>

          <div className="flex items-center gap-3">
            <a
              aria-label="GitHub"
              href="https://github.com/davalbra"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-[#16222e]/80 p-3 text-slate-400 transition-colors hover:border-[#137fec]/50 hover:bg-[#137fec]/10 hover:text-white"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              aria-label="LinkedIn"
              href="https://www.linkedin.com/in/alvarobravo/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-[#16222e]/80 p-3 text-slate-400 transition-colors hover:border-[#137fec]/50 hover:bg-[#137fec]/10 hover:text-white"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              aria-label="Website"
              href="https://www.davalbra.cloud/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-[#16222e]/80 p-3 text-slate-400 transition-colors hover:border-[#137fec]/50 hover:bg-[#137fec]/10 hover:text-white"
            >
              <Globe className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-[500px] items-center justify-center lg:flex">
        <div className="pointer-events-none absolute inset-0 translate-x-10 translate-y-10 rounded-full bg-gradient-to-tr from-[#137fec]/25 via-transparent to-transparent blur-3xl" />

        <div className="code-glow relative mx-auto w-full max-w-md transition-transform duration-500 hover:-translate-y-2">
          <div className="flex items-center justify-between rounded-t-xl border border-slate-700/60 bg-[#16222e] p-4">
            <div className="flex space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <div className="font-mono text-xs text-slate-500">rag_pipeline.ts</div>
          </div>

          <div className="relative overflow-hidden rounded-b-xl border-x border-b border-slate-700/60 bg-[#0b1219] p-6 font-mono text-sm">
            <div className="absolute bottom-0 left-0 top-0 w-10 select-none border-r border-slate-800 bg-[#16222e]/45 pr-2 pt-6 text-right leading-6 text-slate-600">
              1
              <br />2
              <br />3
              <br />4
              <br />5
              <br />6
              <br />7
              <br />8
              <br />9
              <br />10
              <br />11
            </div>
            <div className="pl-8 leading-6 text-slate-200">
              <span className="text-violet-400">import</span> <span>openai</span>
              <br />
              <span className="text-violet-400">from</span> <span>langchain</span>{" "}
              <span className="text-violet-400">import</span> <span className="text-yellow-300">VectorStore</span>
              <br />
              <br />
              <span className="text-violet-400">class</span> <span className="text-yellow-300">RAGAgent</span>:
              <br />
              <span className="text-violet-400">  def</span> <span className="text-blue-400">query</span>(
              <span className="text-red-300">prompt</span>):
              <br />
              <span className="text-slate-500">    # retrieve context + generate</span>
              <br />
              <span className="text-violet-400">    return await</span>{" "}
              <span className="text-cyan-300">llm.predict</span>(<span className="text-orange-300">prompt</span>)
              <br />
              <br />
              <span className="text-violet-400">pipeline</span> = <span className="text-cyan-300">vector.search</span>()
              <br />
              <span className="text-violet-400">if</span> pipeline.<span className="text-cyan-300">score</span>{" "}
              &gt; <span className="text-green-300">0.92</span>:
              <br />
              <span className="text-violet-400">  return</span> <span className="text-cyan-300">response</span>
            </div>
          </div>

          <div className="absolute -bottom-8 -right-12 z-10 w-32 rounded-lg border border-slate-700/50 bg-[#16222e] p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accuracy</span>
              <span className="font-mono text-[10px] text-green-400">98.4%</span>
            </div>
            <div className="mb-3 h-1.5 w-full rounded-full bg-slate-800">
              <div className="h-1.5 w-[98%] rounded-full bg-green-500" />
            </div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latency</span>
              <span className="font-mono text-[10px] text-[#5faaf3]">24ms</span>
            </div>
            <div className="mt-2 flex h-8 items-end justify-between gap-1">
              <div className="h-3 w-1 rounded-sm bg-[#137fec]/30" />
              <div className="h-5 w-1 rounded-sm bg-[#137fec]/50" />
              <div className="h-4 w-1 rounded-sm bg-[#137fec]/70" />
              <div className="h-7 w-1 rounded-sm bg-[#137fec]" />
              <div className="h-5 w-1 rounded-sm bg-[#137fec]/60" />
              <div className="h-2 w-1 rounded-sm bg-[#137fec]/40" />
            </div>
          </div>

          <div className="absolute -left-6 top-20 flex items-center gap-2 rounded-md border border-[#137fec]/20 bg-[#137fec]/10 px-3 py-1.5 text-xs text-white shadow-lg">
            <Database className="h-4 w-4 text-[#5faaf3]" />
            <span>Vector Database</span>
          </div>
        </div>
      </div>
    </section>
  );
}
