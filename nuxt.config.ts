import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const ignoredWatchPaths = [
  "**/.git/**",
  "**/.idea/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/node_modules/**",
];

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalizedValue)) return true;
  if (["0", "false", "no", "off"].includes(normalizedValue)) return false;

  return fallback;
};

const allowPublicRegistration = parseBooleanEnv(
  process.env.NUXT_PUBLIC_AUTH_ALLOW_PUBLIC_REGISTRATION ||
    process.env.AUTH_ALLOW_PUBLIC_REGISTRATION,
  process.env.NODE_ENV !== "production",
);

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: process.env.NODE_ENV === "development" },
  sourcemap: {
    client: false,
    server: false,
  },
  experimental: {
    appManifest: false,
  },
  css: ["@/assets/css/tailwind.css"],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ignoredWatchPaths,
      },
    },
    optimizeDeps: {
      exclude: ["@prisma/client", ".prisma"],
    },
    build: {
      target: "esnext",
      rollupOptions: {
        external: ["@prisma/client", ".prisma"],
      },
    },
    esbuild: {
      target: "esnext",
    },
  },
  nitro: {
    esbuild: {
      options: {
        target: "node20",
      },
    },
    externals: {
      external: ["@prisma/client", ".prisma"],
    },
  },
  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxt/ui",
    "@pinia/nuxt",
  ],
  alias: {
    "@": fileURLToPath(new URL("./", import.meta.url)),
    "~": fileURLToPath(new URL("./", import.meta.url)),
  },
  image: {
    domains: ["firebasestorage.googleapis.com"],
  },
  runtimeConfig: {
    auth: {
      allowPublicRegistration,
    },
    firebaseAdmin: {
      projectId: process.env.FIREBASE_PROJECT_ID || "",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
      privateKey: process.env.FIREBASE_PRIVATE_KEY || "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    },
    public: {
      auth: {
        allowPublicRegistration,
      },
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || "",
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || "",
        measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
      },
    },
  },
});
