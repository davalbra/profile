"use client";

import Link from "next/link";
import { useState } from "react";
import type { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/providers/auth-provider";
import { signInWithEmail, signOutUser, signUpWithEmail } from "@/lib/firebase/auth";
import { uploadFileForCurrentUser } from "@/lib/firebase/storage";

function getFirebaseError(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code;

  switch (code) {
    case "auth/email-already-in-use":
      return "Ese correo ya está registrado.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/invalid-credential":
      return "Credenciales inválidas.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    default:
      return error instanceof Error
        ? error.message
        : "Ocurrió un error. Revisa tu configuración de Firebase.";
  }
}

export default function Home() {
  const { user, loading, error } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    setBusy(true);
    setAuthMessage("");

    try {
      await signUpWithEmail(email, password);
      setAuthMessage("Usuario creado correctamente.");
    } catch (error) {
      setAuthMessage(getFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    setBusy(true);
    setAuthMessage("");

    try {
      await signInWithEmail(email, password);
      setAuthMessage("Sesión iniciada.");
    } catch (error) {
      setAuthMessage(getFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setAuthMessage("");
    setUploadMessage("");
    setUploadUrl("");
    setFile(null);

    try {
      await signOutUser();
      setAuthMessage("Sesión cerrada.");
    } catch (error) {
      setAuthMessage(getFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setUploadMessage("Selecciona un archivo primero.");
      return;
    }

    setBusy(true);
    setUploadMessage("");
    setUploadUrl("");

    try {
      const result = await uploadFileForCurrentUser(file);
      setUploadMessage(`Archivo subido en: ${result.path}`);
      setUploadUrl(result.downloadURL);
    } catch (error) {
      setUploadMessage(getFirebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Firebase Auth + Storage</h1>
        <p className="text-muted-foreground">
          Integración base lista para registrar/login y subir archivos.
        </p>
        <Link href="/storage-test" className="text-sm underline">
          Ir al test de Storage con progreso
        </Link>
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-xl border p-6 space-y-4">
        {loading ? (
          <p>Cargando sesión...</p>
        ) : user ? (
          <>
            <p>
              Usuario autenticado: <strong>{user.email}</strong>
            </p>
            <button
              onClick={handleLogout}
              disabled={busy}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <div className="grid gap-3">
              <input
                type="email"
                placeholder="Correo"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-md border bg-background px-3"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 rounded-md border bg-background px-3"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRegister}
                disabled={busy}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
              >
                Crear cuenta
              </button>
              <button
                onClick={handleLogin}
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                Iniciar sesión
              </button>
            </div>
          </>
        )}

        {authMessage ? <p className="text-sm text-muted-foreground">{authMessage}</p> : null}
      </section>

      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Subir archivo a Firebase Storage</h2>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          disabled={!user || busy}
          className="block w-full text-sm"
        />
        <button
          onClick={handleUpload}
          disabled={!user || busy}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Subir archivo
        </button>
        {uploadMessage ? <p className="text-sm text-muted-foreground">{uploadMessage}</p> : null}
        {uploadUrl ? (
          <a className="text-sm underline" href={uploadUrl} target="_blank" rel="noreferrer">
            Abrir archivo subido
          </a>
        ) : null}
      </section>
    </main>
  );
}
