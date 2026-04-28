import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public.firebase as {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
  };

  let app: FirebaseApp | null = null;
  let auth: Auth | null = null;
  let storage: FirebaseStorage | null = null;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  if (config.apiKey) {
    app = getApps().length ? getApp() : initializeApp(config);
    auth = getAuth(app);
    storage = getStorage(app);
  } else {
    console.warn("Firebase client no está configurado. Define FIREBASE_* o NUXT_PUBLIC_FIREBASE_* en .env.");
  }

  return {
    provide: {
      firebaseApp: app,
      fbAuth: auth,
      fbStorage: storage,
      googleProvider,
    },
  };
});

declare module "#app" {
  interface NuxtApp {
    $firebaseApp: FirebaseApp | null;
    $fbAuth: Auth | null;
    $fbStorage: FirebaseStorage | null;
    $googleProvider: GoogleAuthProvider;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $firebaseApp: FirebaseApp | null;
    $fbAuth: Auth | null;
    $fbStorage: FirebaseStorage | null;
    $googleProvider: GoogleAuthProvider;
  }
}
