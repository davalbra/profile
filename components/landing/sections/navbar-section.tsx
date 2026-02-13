"use client";

import {useState} from "react";
import {GoogleLoginModal} from "@/components/auth/google-login-modal";

export function NavbarSection() {
    const [modalAbierto, setModalAbierto] = useState(false);


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
                        <a href="#home"
                           className="text-sm font-medium text-white transition-colors hover:text-[#5faaf3]">
                            Inicio
                        </a>
                        <a href="#projects"
                           className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
                            Proyectos
                        </a>
                        <a href="#stack"
                           className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
                            Tecnologías
                        </a>
                        <a href="#contact"
                           className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
                            Contacto
                        </a>
                    </div>

                </div>
            </nav>

            <GoogleLoginModal open={modalAbierto} onClose={() => setModalAbierto(false)}/>
        </>
    );
}
