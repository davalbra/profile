<script setup lang="ts">
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { Loader2, Upload } from "lucide-vue-next";

useHead({
  title: "Storage Test | davalbra",
});

const { user, loading, error } = useAuth();
const nuxtApp = useNuxtApp();

const file = ref<File | null>(null);
const busy = ref(false);
const progress = ref(0);
const message = ref("");
const downloadUrl = ref("");

const handleUpload = async () => {
  if (!file.value) {
    message.value = "Selecciona un archivo primero.";
    return;
  }

  if (!user.value) {
    message.value = "Debes iniciar sesión para subir archivos.";
    return;
  }

  if (!nuxtApp.$fbStorage) {
    message.value = "Firebase Storage no está configurado.";
    return;
  }

  busy.value = true;
  progress.value = 0;
  message.value = "";
  downloadUrl.value = "";

  try {
    const path = `users/${user.value.uid}/${Date.now()}-${file.value.name.replace(/\s+/g, "-").toLowerCase()}`;
    const reference = storageRef(nuxtApp.$fbStorage, path);
    const task = uploadBytesResumable(reference, file.value, {
      contentType: file.value.type || undefined,
    });

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          progress.value = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        },
        reject,
        resolve,
      );
    });

    downloadUrl.value = await getDownloadURL(task.snapshot.ref);
    message.value = `Archivo subido: ${path}`;
  } catch (reason) {
    message.value = reason instanceof Error ? reason.message : "No se pudo subir el archivo.";
  } finally {
    busy.value = false;
  }
};

const handleFileChange = (event: Event) => {
  file.value = (event.target as HTMLInputElement).files?.[0] || null;
};
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12 text-slate-100">
    <header class="space-y-2">
      <h1 class="text-3xl font-bold">Storage Test</h1>
      <p class="text-slate-400">Prueba subida de archivos a Firebase Storage con progreso.</p>
      <NuxtLink to="/" class="text-sm underline">Volver a la página principal</NuxtLink>
    </header>

    <p v-if="loading" class="text-sm text-slate-300">Cargando sesión...</p>
    <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
    <p v-if="!loading && !user" class="text-sm text-slate-300">
      Inicia sesión desde la página principal para poder subir archivos.
    </p>

    <section class="panel-shell space-y-4 p-6">
      <input
        type="file"
        class="block w-full text-sm"
        :disabled="!user || busy"
        @change="handleFileChange"
      />

      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#137fec] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!user || busy"
        @click="handleUpload"
      >
        <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
        <Upload v-else class="h-4 w-4" />
        {{ busy ? "Subiendo..." : "Subir archivo" }}
      </button>

      <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div class="h-full bg-[#137fec] transition-all" :style="{ width: `${progress}%` }" />
      </div>
      <p class="text-sm text-slate-400">{{ progress }}%</p>

      <p v-if="message" class="text-sm text-slate-300">{{ message }}</p>
      <a
        v-if="downloadUrl"
        class="text-sm underline"
        :href="downloadUrl"
        target="_blank"
        rel="noreferrer"
      >
        Abrir archivo subido
      </a>
    </section>
  </main>
</template>
