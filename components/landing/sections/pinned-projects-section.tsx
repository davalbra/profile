import { ArrowUpRight, Clock3, GitFork, Github, Star } from "lucide-react";
import type { PinnedRepositoryView } from "@/components/landing/types";

type PinnedProjectsSectionProps = {
  pinnedRepositoryCards: PinnedRepositoryView[];
};

export function PinnedProjectsSection({
  pinnedRepositoryCards,
}: Readonly<PinnedProjectsSectionProps>) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-700/70 bg-[#16222e]/65 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold text-white">Proyectos Destacados</h2>
          <a
            href="https://github.com/davalbra"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-600/70 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-[#137fec]/50 hover:bg-[#137fec]/10"
          >
            Ver GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {pinnedRepositoryCards.map((repo) => (
            <article
              key={repo.name}
              className="flex h-full flex-col rounded-xl border border-slate-700/70 bg-[#0b1219]/70 p-5 transition-colors hover:border-[#137fec]/45"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white">{repo.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{repo.description}</p>
                </div>
                <a
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-600/70 text-slate-300 transition-colors hover:border-[#137fec]/60 hover:text-white"
                  aria-label={`Abrir repositorio ${repo.name}`}
                >
                  <Github className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-300" />
                  {repo.starsText}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitFork className="h-3.5 w-3.5 text-[#5faaf3]" />
                  {repo.forksText}
                </span>
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 font-medium text-slate-300">
                  {repo.language}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Actualizado {repo.updatedText}
                </span>
              </div>

              {repo.homepage ? (
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#5faaf3] transition-colors hover:text-white"
                >
                  Proyecto en línea
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
