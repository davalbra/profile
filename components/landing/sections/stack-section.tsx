import { BrainCircuit, Layers3, MonitorSmartphone, ServerCog } from "lucide-react";
import type { StackGroup } from "@/components/landing/types";

type StackSectionProps = {
  stackGroups: StackGroup[];
};

const niveles = ["Alto", "Sólido", "Activo"];

export function StackSection({ stackGroups }: Readonly<StackSectionProps>) {
  const estilosPorGrupo = [
    {
      icono: MonitorSmartphone,
      borde: "hover:border-cyan-400/45",
      brillo: "from-cyan-400/20",
      punto: "bg-cyan-300",
      barra: "from-cyan-400 to-sky-500",
      fondo: "from-cyan-500/10",
    },
    {
      icono: ServerCog,
      borde: "hover:border-emerald-400/45",
      brillo: "from-emerald-400/20",
      punto: "bg-emerald-300",
      barra: "from-emerald-400 to-teal-500",
      fondo: "from-emerald-500/10",
    },
    {
      icono: BrainCircuit,
      borde: "hover:border-violet-400/45",
      brillo: "from-violet-400/20",
      punto: "bg-violet-300",
      barra: "from-violet-400 to-indigo-500",
      fondo: "from-violet-500/10",
    },
  ] as const;

  return (
    <section id="stack" className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-[#16222e]/65 p-6 backdrop-blur-sm lg:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#137fec]/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#5faaf3]">
                <Layers3 className="h-3.5 w-3.5" />
                Arquitectura técnica
              </div>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Tecnologías</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Herramientas que uso para diseñar, construir y desplegar productos digitales en
                producción.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-lg border border-slate-600/70 bg-[#0f1a26]/80 px-3 py-1.5">
                {stackGroups.reduce((acc, group) => acc + group.items.length, 0)} tecnologías
              </span>
              <span className="rounded-lg border border-slate-600/70 bg-[#0f1a26]/80 px-3 py-1.5">
                3 capas de especialidad
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {stackGroups.map((group, groupIndex) => {
              const estilo = estilosPorGrupo[groupIndex % estilosPorGrupo.length];
              const Icono = estilo.icono;
              const promedioDominio = Math.min(96, 72 + group.items.length * 5);

              return (
                <article
                  key={group.name}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0b1219]/85 p-5 transition-all duration-300 hover:-translate-y-1 ${estilo.borde}`}
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${estilo.brillo} via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  <div className="relative z-10">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${estilo.fondo} to-transparent ring-1 ring-slate-600/60`}
                        >
                          <Icono className="h-4 w-4 text-slate-100" />
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-300">
                          {group.name}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-500">{group.items.length} herramientas</span>
                    </div>

                    <div className="grid gap-2.5">
                      {group.items.map((item, itemIndex) => (
                        <div
                          key={item.label}
                          className="flex min-h-11 items-center justify-between rounded-lg border border-slate-700/70 bg-[#0f1a26]/80 px-3 py-2 text-sm transition-colors hover:border-slate-500/70"
                        >
                          <span className="inline-flex items-center gap-2 text-slate-200">
                            <span className={`h-2 w-2 rounded-full ${estilo.punto}`} />
                            {item.label}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {niveles[(itemIndex + groupIndex) % niveles.length]}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                        <span>Dominio</span>
                        <span>{promedioDominio}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-1.5 rounded-full bg-gradient-to-r ${estilo.barra}`}
                          style={{ width: `${promedioDominio}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
