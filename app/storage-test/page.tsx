"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { uploadFileForCurrentUserWithProgress } from "@/lib/firebase/storage";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo subir el archivo.";
}

export default function StorageTestPage() {
  const { user, loading, error } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Selecciona un archivo primero.");
      return;
    }

    setBusy(true);
    setProgress(0);
    setMessage("");
    setDownloadUrl("");

    try {
      const result = await uploadFileForCurrentUserWithProgress(file, setProgress);
      setMessage(`Archivo subido: ${result.path}`);
      setDownloadUrl(result.downloadURL);
    } catch (reason) {
      setMessage(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Storage Test</h1>
        <p className="text-muted-foreground">
          Prueba subida de archivos a Firebase Storage con progreso.
        </p>
        <Link href="/" className="text-sm underline">
          Volver a la página principal
        </Link>
      </header>

      {loading ? <p>Cargando sesión...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !user ? <p>Inicia sesión en la página principal para poder subir archivos.</p> : null}

      <section className="rounded-xl border p-6 space-y-4">
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
          {busy ? "Subiendo..." : "Subir archivo"}
        </button>

        <div className="h-2 w-full overflow-hidden rounded bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{progress}%</p>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {downloadUrl ? (
          <a className="text-sm underline" href={downloadUrl} target="_blank" rel="noreferrer">
            Abrir archivo subido
          </a>
        ) : null}
      </section>
    </main>
  );
}
