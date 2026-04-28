<script setup lang="ts">
import { Chrome, Loader2, LogOut, X } from "lucide-vue-next";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { user, loading, error, loginWithGoogle, logout } = useAuth();
const pending = ref(false);
const localError = ref<string | null>(null);

const close = () => {
  emit("update:modelValue", false);
};

watch(
  () => props.modelValue,
  (open) => {
    if (!import.meta.client) {
      return;
    }

    document.body.style.overflow = open ? "hidden" : "";
  },
);

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = "";
  }
});

const handleGoogleLogin = async () => {
  pending.value = true;
  localError.value = null;

  try {
    await loginWithGoogle();
    close();
  } catch (reason) {
    localError.value =
      reason instanceof Error ? reason.message : "No se pudo iniciar sesión con Google.";
  } finally {
    pending.value = false;
  }
};

const handleLogout = async () => {
  pending.value = true;
  localError.value = null;

  try {
    await logout();
    close();
  } catch (reason) {
    localError.value = reason instanceof Error ? reason.message : "No se pudo cerrar la sesión.";
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    @click="close"
  >
    <div
      class="w-full max-w-md rounded-[28px] border border-white/10 bg-[#101922] p-6 text-slate-100 shadow-2xl"
      @click.stop
    >
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-white">Acceso con Google</h2>
          <p class="mt-1 text-sm text-slate-400">
            La sesión cliente se valida con Firebase y luego se registra en el servidor.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-slate-400 transition hover:text-white"
          aria-label="Cerrar modal"
          @click="close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div
        v-if="error || localError"
        class="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ localError || error }}
      </div>

      <div
        v-if="loading"
        class="flex min-h-20 items-center justify-center gap-2 text-sm text-slate-400"
      >
        <Loader2 class="h-4 w-4 animate-spin" />
        Cargando autenticación...
      </div>

      <div v-else-if="user" class="space-y-4">
        <div
          class="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
        >
          Sesión activa como <strong>{{ user.email }}</strong>
        </div>
        <button
          type="button"
          class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="pending"
          @click="handleLogout"
        >
          <Loader2 v-if="pending" class="h-4 w-4 animate-spin" />
          <LogOut v-else class="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>

      <button
        v-else
        type="button"
        class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="pending"
        @click="handleGoogleLogin"
      >
        <Loader2 v-if="pending" class="h-4 w-4 animate-spin" />
        <Chrome v-else class="h-4 w-4" />
        Continuar con Google
      </button>
    </div>
  </div>
</template>
