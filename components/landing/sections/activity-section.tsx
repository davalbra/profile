import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Database,
  Github,
  History,
  RefreshCw,
  TerminalSquare,
} from "lucide-react";
import type {
  ActivityStat,
  FeaturedDeployment,
  LanguageBreakdownItem,
  RecentPushItem,
} from "@/components/landing/types";

type ActivitySectionProps = {
  keyStats: ActivityStat[];
  languageBreakdown: LanguageBreakdownItem[];
  recentPushes: RecentPushItem[];
  contributionHeatmap: number[][];
  heatmapLevels: string[];
  featuredDeployments: FeaturedDeployment[];
  lastUpdatedText: string;
};

export function ActivitySection({
  keyStats,
  languageBreakdown,
  recentPushes,
  contributionHeatmap,
  heatmapLevels,
  featuredDeployments,
  lastUpdatedText,
}: Readonly<ActivitySectionProps>) {
  return (
    <section id="activity" className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-700/70 bg-[#16222e]/65 p-6 backdrop-blur-sm lg:p-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-700/70 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Engineering Activity
              </h2>
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
              Real-time metrics from GitHub repositories and deployed services. A snapshot of
              what I&apos;m building.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href="https://github.com/davalbra?tab=repositories"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-2 py-1 font-medium text-[#5faaf3] transition-colors hover:text-white"
            >
              <TerminalSquare className="h-4 w-4" />
              View All Repos
            </a>
            <div className="hidden h-4 w-px bg-slate-600 sm:block" />
            <div className="inline-flex min-h-11 items-center gap-2 text-slate-400">
              <RefreshCw className="h-4 w-4" />
              Last updated: {lastUpdatedText}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {keyStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <article
                    key={stat.label}
                    className="group rounded-xl border border-slate-700/70 bg-[#16202c] p-5 transition-colors hover:border-[#137fec]/50"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {stat.label}
                      </span>
                      <Icon className={`h-4 w-4 ${stat.iconClassName}`} />
                    </div>
                    <div className="text-3xl font-bold tabular-nums text-white">
                      {stat.value}
                      {stat.suffix ? (
                        <span className="ml-1 text-sm font-medium text-slate-500">{stat.suffix}</span>
                      ) : null}
                    </div>
                    <div className={`mt-1 flex items-center gap-1 text-xs ${stat.detailClassName}`}>
                      {stat.trending ? <Activity className="h-3.5 w-3.5" /> : null}
                      {stat.detail}
                    </div>
                  </article>
                );
              })}
            </div>

            <article className="relative overflow-hidden rounded-xl border border-slate-700/70 bg-[#16202c] p-6">
              <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Database className="h-4 w-4 text-[#5faaf3]" />
                Language Breakdown
              </h3>
              <div className="relative z-10 flex flex-col gap-4">
                {languageBreakdown.map((language) => (
                  <div key={language.name}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-medium text-white">{language.name}</span>
                      <span className="tabular-nums text-slate-400">{language.share.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#101922]">
                      <div
                        className={`h-2.5 rounded-full ${language.color}`}
                        style={{ width: `${language.share.toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#137fec]/10 blur-3xl"
              />
            </article>

            <article className="rounded-xl border border-slate-700/70 bg-[#16202c] p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <History className="h-4 w-4 text-[#5faaf3]" />
                Recent Pushes
              </h3>
              <div className="space-y-4">
                {recentPushes.map((entry) => (
                  <div key={`${entry.repo}-${entry.time}-${entry.message}`} className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-2 w-2 min-w-2 rounded-full ring-4 ${
                        entry.active
                          ? "bg-[#137fec] ring-[#137fec]/25"
                          : "bg-slate-600 ring-slate-700/50"
                      }`}
                    />
                    <div>
                      <p className="text-sm leading-snug text-slate-300">
                        <span className="font-medium text-white">{entry.type}:</span> {entry.message}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        repo: {entry.repo} • {entry.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-8">
            <article className="rounded-xl border border-slate-700/70 bg-[#16202c] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">Contribution Calendar</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Less</span>
                  <div className="flex gap-1">
                    {heatmapLevels.map((levelClassName, levelIndex) => (
                      <div key={levelClassName} className={`h-3 w-3 rounded-sm ${levelClassName}`}>
                        <span className="sr-only">Level {levelIndex}</span>
                      </div>
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-1">
                  {contributionHeatmap.map((week, weekIndex) => (
                    <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                      {week.map((level, dayIndex) => (
                        <div
                          key={`day-${weekIndex}-${dayIndex}`}
                          className={`h-3 w-3 rounded-sm ${heatmapLevels[level]}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-white">Featured Deployments</h3>
              <a
                href="https://github.com/davalbra"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-sm text-[#5faaf3] transition-colors hover:text-white"
              >
                View Portfolio Archive <ArrowUpRight className="ml-1 h-4 w-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {featuredDeployments.map((project) => {
                const Icon = project.icon;
                return (
                  <article
                    key={project.title}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-[#16202c] transition-all duration-300 hover:border-[#137fec]/50 hover:shadow-lg hover:shadow-[#137fec]/5"
                  >
                    <div className={`relative h-40 w-full overflow-hidden ${project.cardPatternClassName}`}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className={`rounded-full border p-4 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 ${project.iconShellClassName}`}
                        >
                          <Icon className={`h-10 w-10 ${project.iconClassName}`} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-grow flex-col p-6">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <h4 className="text-lg font-bold text-white transition-colors group-hover:text-[#5faaf3]">
                          {project.title}
                        </h4>
                        <div className="flex gap-2">
                          <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Repositorio de ${project.title}`}
                            className="text-slate-400 transition-colors hover:text-white"
                          >
                            <Github className="h-4 w-4" />
                          </a>
                          <a
                            href={project.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Demo de ${project.title}`}
                            className="text-slate-400 transition-colors hover:text-white"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>

                      <p className="mb-6 flex-grow text-sm leading-relaxed text-slate-400">
                        {project.description}
                      </p>

                      <div className="mt-auto flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <span
                            key={`${project.title}-${tag.name}`}
                            className={`rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium ${tag.className}`}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}

              <article className="md:col-span-2 rounded-xl border border-slate-700/70 bg-gradient-to-r from-[#16202c] to-slate-900 p-1 transition-colors hover:border-[#137fec]/50">
                <div className="flex h-full flex-col items-center gap-6 rounded-lg bg-[#101922]/60 p-5 backdrop-blur-md sm:flex-row sm:items-start">
                  <div className="w-full rounded-lg border border-slate-700/70 bg-[#16202c] p-4 text-center sm:w-auto sm:text-left">
                    <CalendarDays className="mx-auto mb-2 h-9 w-9 text-[#5faaf3] sm:mx-0" />
                    <div className="font-mono text-xs text-slate-500">v2.4.0</div>
                  </div>

                  <div className="flex-grow text-center sm:text-left">
                    <h4 className="mb-2 text-lg font-bold text-white">
                      Portfolio V2 & Analytics Dashboard
                    </h4>
                    <p className="mb-3 max-w-2xl text-sm text-slate-400">
                      The site you are looking at right now. Built with a focus on performance,
                      accessibility, and clean architecture with cookie-free analytics.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                      <span className="rounded-md border border-[#137fec]/20 bg-[#137fec]/10 px-2 py-1 text-xs font-medium text-[#5faaf3]">
                        Next.js 16
                      </span>
                      <span className="rounded-md border border-[#137fec]/20 bg-[#137fec]/10 px-2 py-1 text-xs font-medium text-[#5faaf3]">
                        Tailwind v4
                      </span>
                      <span className="rounded-md border border-[#137fec]/20 bg-[#137fec]/10 px-2 py-1 text-xs font-medium text-[#5faaf3]">
                        Vercel
                      </span>
                    </div>
                  </div>

                  <a
                    href="https://www.davalbra.cloud/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#137fec] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0b5cb0]"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    See Architecture
                  </a>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
