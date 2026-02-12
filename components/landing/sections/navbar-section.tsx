export function NavbarSection() {
  return (
    <nav className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#home"
          className="cursor-pointer text-2xl font-bold tracking-tight text-white transition-colors hover:text-[#5faaf3]"
        >
          DB<span className="text-[#137fec]">.</span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          <a href="#home" className="text-sm font-medium text-white transition-colors hover:text-[#5faaf3]">
            Inicio
          </a>
          <a href="#projects" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
            Proyectos
          </a>
          <a href="#stack" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
            Tecnologías
          </a>
          <a href="#contact" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
            Contacto
          </a>
        </div>

        <a
          href="mailto:alvrobravo@gmail.com"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-600/70 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-[#137fec]/60 hover:bg-[#137fec]/10 hover:text-white"
        >
          Contacto
        </a>
      </div>
    </nav>
  );
}
