"use client";

import { useEffect, useState } from "react";
import { Chrome, Loader2, LogOut, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { signInWithGoogle, signOutUser } from "@/lib/firebase/auth";

type GoogleLoginModalProps = {
  open: boolean;
  onClose: () => void;
};

function parseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado durante el inicio de sesión.";
}

export function GoogleLoginModal({ open, onClose }: Readonly<GoogleLoginModalProps>) {
  const { user, loading } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setPending(true);
    setError(null);

    try {
      const firebaseUser = await signInWithGoogle();
      const idToken = await firebaseUser.getIdToken();

      const response = await fetch("/api/auth/firebase-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo registrar la sesión en el servidor.");
      }

      onClose();
    } catch (reason) {
      setError(parseError(reason));
    } finally {
      setPending(false);
    }
  };

  const handleSignOut = async () => {
    setPending(true);
    setError(null);

    try {
      const idToken = user ? await user.getIdToken() : null;

      if (idToken) {
        await fetch("/api/auth/firebase-session", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      }

      await signOutUser();
      onClose();
    } catch (reason) {
      setError(parseError(reason));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#030712]/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-google"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-[#101922] p-6 text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="titulo-modal-google" className="text-xl font-bold text-white">
              Acceso con Google
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Tu sesión se valida con Firebase y se registra en base de datos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-20 items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando estado de autenticación...
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Sesión activa como <strong>{user.email}</strong>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={pending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-[#0b1219] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-rose-400/50 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Cerrar sesión
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={pending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
            Continuar con Google
          </button>
        )}
      </div>
    </div>
  );
}
