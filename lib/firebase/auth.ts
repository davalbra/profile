"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { getFirebaseAuthInstance } from "@/lib/firebase/client";

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuthInstance();
  return onAuthStateChanged(auth, callback);
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

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuthInstance();
  await signOut(auth);
}
