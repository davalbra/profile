"use client";

import { useMemo, useState } from "react";
import { GoogleLoginModal } from "@/components/auth/google-login-modal";
import { useAuth } from "@/components/providers/auth-provider";

export function NavbarSection() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const { user, loading } = useAuth();

  const etiquetaSesion = useMemo(() => {
    if (loading) {
      return "Verificando sesión";
    }

    if (!user) {
      return "Iniciar con Google";
    }

    return user.displayName || user.email || "Sesión activa";
  }, [loading, user]);

  const descripcionSesion = useMemo(() => {
    if (loading) {
      return "Conectando Firebase...";
    }

    if (!user) {
      return "Acceso protegido";
    }

    return "Sesión activa";
  }, [loading, user]);

  return (
    <>
      <nav className="glass-nav fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex min-h-11 items-center justify-center cursor-pointer text-2xl font-bold tracking-tight text-white transition-colors hover:text-[#5faaf3]"
            aria-label="Abrir acceso con Google"
          >
            <small>davalbra</small>
            <span className="text-[#137fec]">.</span>
          </button>

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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-600/70 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-[#137fec]/60 hover:bg-[#137fec]/10 hover:text-white"
              title={descripcionSesion}
            >
              {etiquetaSesion}
            </button>

            <a
              href="mailto:alvrobravo@gmail.com"
              className="hidden min-h-11 items-center justify-center rounded-lg border border-slate-600/70 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-[#137fec]/60 hover:bg-[#137fec]/10 hover:text-white sm:inline-flex"
            >
              Contacto
            </a>
          </div>
        </div>
      </nav>

      <GoogleLoginModal open={modalAbierto} onClose={() => setModalAbierto(false)} />
    </>
  );
}
