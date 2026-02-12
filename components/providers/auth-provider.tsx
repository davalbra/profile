"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { setFirebaseRuntimeConfig, type FirebaseRuntimeConfig } from "@/lib/firebase/client";
import { observeAuthState } from "@/lib/firebase/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  firebaseConfig,
}: {
  children: ReactNode;
  firebaseConfig: FirebaseRuntimeConfig;
}) {
  setFirebaseRuntimeConfig(firebaseConfig);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = observeAuthState((nextUser) => {
        setUser(nextUser);
        setLoading(false);
      });
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "No se pudo inicializar Firebase Auth.";
      queueMicrotask(() => {
        setError(message);
        setLoading(false);
      });
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
    }),
    [error, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
