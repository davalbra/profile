"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export type FirebaseRuntimeConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

let firebaseApp: FirebaseApp | null = null;
let firebaseConfig: FirebaseOptions | null = null;

function ensureConfig(): FirebaseOptions {
  if (!firebaseConfig) {
    throw new Error(
      "Firebase no está configurado. Define NEXT_FIREBASE_* en .env.local y reinicia el servidor.",
    );
  }

  const required: Array<keyof FirebaseOptions> = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  for (const key of required) {
    if (!firebaseConfig[key]) {
      throw new Error(`Falta el valor de Firebase para ${key}. Revisa tus variables NEXT_FIREBASE_*.`);
    }
  }

  return firebaseConfig;
}

export function setFirebaseRuntimeConfig(config: FirebaseRuntimeConfig): void {
  if (firebaseConfig) {
    return;
  }

  firebaseConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
    measurementId: config.measurementId,
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  const config = ensureConfig();
  firebaseApp = getApps().length ? getApp() : initializeApp(config);

  return firebaseApp;
}

export function getFirebaseAuthInstance() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseStorageInstance() {
  return getStorage(getFirebaseApp());
}
