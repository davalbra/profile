import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { computed } from "vue";
import { useAuthRepositorio } from "@/store/repository/auth";
import type { SesionServidor } from "@/types/auth";

function shouldFallbackToRedirect(error: Error): boolean {
  const message = error.message.toLowerCase();

  if (message.includes("auth/popup-blocked") || message.includes("auth/web-storage-unsupported")) {
    return true;
  }

  return (
    message.includes("cross-origin-opener-policy") ||
    message.includes("window.close") ||
    message.includes("window.closed")
  );
}

export function useAuth() {
  const nuxtApp = useNuxtApp();
  const authRepositorio = useAuthRepositorio();
  const user = useState<User | null>("auth:user", () => null);
  const serverSession = useState<SesionServidor | null>("auth:server-session", () => null);
  const loading = useState("auth:loading", () => import.meta.client);
  const error = useState<string | null>("auth:error", () => null);
  const initialized = useState("auth:initialized", () => false);
  const lastSyncedToken = useState("auth:last-token", () => "");

  const syncServerSession = async (nextUser: User) => {
    const idToken = await nextUser.getIdToken();
    if (idToken === lastSyncedToken.value && serverSession.value) {
      return serverSession.value;
    }

    const { data } = await authRepositorio.crearSesionFirebase(idToken);

    lastSyncedToken.value = idToken;
    serverSession.value = data.usuario;
    error.value = null;
    return data.usuario;
  };

  const resetState = () => {
    user.value = null;
    serverSession.value = null;
    lastSyncedToken.value = "";
  };

  const logout = async () => {
    try {
      if (user.value) {
        const idToken = await user.value.getIdToken();
        await authRepositorio.eliminarSesionFirebase(idToken);
      }
    } catch {
      // No bloqueamos el logout local si el backend ya no reconoce la sesión.
    } finally {
      if (nuxtApp.$fbAuth) {
        await signOut(nuxtApp.$fbAuth);
      }
      resetState();
    }
  };

  const loginWithGoogle = async () => {
    if (!nuxtApp.$fbAuth) {
      throw new Error("Firebase Auth no está configurado.");
    }

    try {
      const credential = await signInWithPopup(nuxtApp.$fbAuth, nuxtApp.$googleProvider);
      if (credential.user) {
        user.value = credential.user;
        await syncServerSession(credential.user);
      }
    } catch (reason) {
      if (reason instanceof Error && shouldFallbackToRedirect(reason)) {
        await signInWithRedirect(nuxtApp.$fbAuth, nuxtApp.$googleProvider);
        return;
      }

      throw reason;
    }
  };

  const checkServerSession = async () => {
    try {
      const { data } = await authRepositorio.obtenerSesionSegura();
      serverSession.value = data.sesion;
    } catch {
      serverSession.value = null;
    }
  };

  if (import.meta.client && !initialized.value) {
    initialized.value = true;

    if (!nuxtApp.$fbAuth) {
      loading.value = false;
      error.value = "Firebase Auth no está configurado.";
    } else {
      onAuthStateChanged(nuxtApp.$fbAuth, (nextUser) => {
        user.value = nextUser;
        if (!nextUser) {
          resetState();
        }
        loading.value = false;
      });

      onIdTokenChanged(nuxtApp.$fbAuth, async (nextUser) => {
        if (!nextUser) {
          return;
        }

        try {
          await syncServerSession(nextUser);
        } catch (reason) {
          error.value =
            reason instanceof Error ? reason.message : "No se pudo sincronizar la sesión.";
          lastSyncedToken.value = "";
        }
      });

      // La sesión del servidor se sincroniza cuando Firebase confirma usuario.
      // Evita llamar /api/secure/session sin cookie/token y generar 401 esperados.
    }
  }

  return {
    user,
    serverSession,
    loading,
    error,
    isAuthenticated: computed(() => !!user.value && !!serverSession.value),
    loginWithGoogle,
    logout,
    checkServerSession,
  };
}
