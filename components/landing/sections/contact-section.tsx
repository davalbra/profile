import { ArrowUpRight, Mail } from "lucide-react";

export function ContactSection() {
  return (
    <section id="contact" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#137fec]/30 bg-gradient-to-r from-[#0b1219] to-[#16222e] p-6">
        <h2 className="text-2xl font-bold text-white">Construyamos algo útil</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Si quieres integrar IA, automatizar procesos o lanzar un producto digital completo,
          conversemos.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="mailto:alvrobravo@gmail.com"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#137fec] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0e64bd]"
          >
            <Mail className="h-4 w-4" />
            Escribirme
          </a>
          <a
            href="https://www.davalbra.cloud/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-[#137fec]/55 hover:bg-[#137fec]/10"
          >
            Sitio web
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
