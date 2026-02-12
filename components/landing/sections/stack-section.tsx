import Image from "next/image";
import type { StackGroup } from "@/components/landing/types";

type StackSectionProps = {
  stackGroups: StackGroup[];
};

function ShieldBadge({ label, color }: Readonly<{ label: string; color: string }>) {
  return (
    <Image
      unoptimized
      src={`https://img.shields.io/badge/${encodeURIComponent(label)}-${color}&style=flat`}
      alt={`Badge de ${label}`}
      width={120}
      height={28}
      className="h-7 w-auto"
    />
  );
}

export function StackSection({ stackGroups }: Readonly<StackSectionProps>) {
  return (
    <section id="stack" className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-700/70 bg-[#16222e]/65 p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-white">Tecnologías</h2>
        <p className="mt-2 text-sm text-slate-400">
          Herramientas principales para construir productos escalables.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stackGroups.map((group) => (
            <article key={group.name} className="rounded-xl border border-slate-700/70 bg-[#0b1219]/70 p-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                {group.name}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <ShieldBadge key={item.label} label={item.label} color={item.color} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
