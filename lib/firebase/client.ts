"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

function readEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${key}`);
  }

  return value;
}

let firebaseApp: FirebaseApp | null = null;

function getFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  const firebaseConfig = getFirebaseConfig();
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

  return firebaseApp;
}

export function getFirebaseAuthInstance() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseStorageInstance() {
  return getStorage(getFirebaseApp());
}
