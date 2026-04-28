import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthError,
  type User,
} from "firebase/auth";
import { computed } from "vue";

type ServerSession = {
  uid: string;
  email: string;
  nombre: string;
  avatarUrl: string;
  rol: string;
};

function shouldFallbackToRedirect(error: unknown): boolean {
  const authError = error as Partial<AuthError> | null;
  const code = authError?.code || "";
  const message = authError?.message?.toLowerCase() || "";

  if (code === "auth/popup-blocked" || code === "auth/web-storage-unsupported") {
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
  const user = useState<User | null>("auth:user", () => null);
  const serverSession = useState<ServerSession | null>("auth:server-session", () => null);
  const loading = useState("auth:loading", () => import.meta.client);
  const error = useState<string | null>("auth:error", () => null);
  const initialized = useState("auth:initialized", () => false);
  const lastSyncedToken = useState("auth:last-token", () => "");

  const syncServerSession = async (nextUser: User) => {
    const idToken = await nextUser.getIdToken();
    if (idToken === lastSyncedToken.value && serverSession.value) {
      return serverSession.value;
    }

    const response = await $fetch<{ ok: true; usuario: ServerSession }>("/api/auth/firebase-session", {
      method: "POST",
      body: { idToken },
    });

    lastSyncedToken.value = idToken;
    serverSession.value = response.usuario;
    error.value = null;
    return response.usuario;
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
        await $fetch("/api/auth/firebase-session", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
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
      if (shouldFallbackToRedirect(reason)) {
        await signInWithRedirect(nuxtApp.$fbAuth, nuxtApp.$googleProvider);
        return;
      }

      throw reason;
    }
  };

  const checkServerSession = async () => {
    try {
      const response = await $fetch<{ ok: true; sesion: ServerSession }>("/api/secure/session", {
        method: "GET",
      });
      serverSession.value = response.sesion;
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

      void checkServerSession();
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
