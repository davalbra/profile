"use client";

import {
  type AuthError,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { getFirebaseAuthInstance } from "@/lib/firebase/client";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuthInstance();
  return onAuthStateChanged(auth, callback);
}

export function observeIdTokenState(callback: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuthInstance();
  return onIdTokenChanged(auth, callback);
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuthInstance();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuthInstance();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

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

export async function signInWithGoogle(): Promise<User | null> {
  const auth = getFirebaseAuthInstance();
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuthInstance();
  await signOut(auth);
}
