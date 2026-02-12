import type { Service } from "@/components/landing/types";

type ServicesSectionProps = {
  services: Service[];
};

export function ServicesSection({ services }: Readonly<ServicesSectionProps>) {
  return (
    <section id="projects" className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {services.map(({ title, description, icon: Icon }) => (
          <article
            key={title}
            className="group rounded-2xl border border-slate-700/70 bg-[#16222e]/70 p-5 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:border-[#137fec]/40"
          >
            <span className="mb-4 inline-flex rounded-lg border border-[#137fec]/20 bg-[#137fec]/10 p-2 text-[#5faaf3]">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
