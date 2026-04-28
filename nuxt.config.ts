import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const ignoredWatchPaths = [
  "**/.git/**",
  "**/.idea/**",
  "**/.junie/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/.vscode/**",
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

const pickEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
};

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
      allowedHosts: ["davalbra.xyz"],
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
    [
      "shadcn-nuxt",
      {
        prefix: "",
        componentDir: "./components/ui",
      },
    ],
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxt/ui",
    "@pinia/nuxt",
  ],
  imports: {
    dirs: ["store/repository"],
  },
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
      projectId: pickEnv("FIREBASE_PROJECT_ID", "NUXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_FIREBASE_PROJECT_ID"),
      clientEmail: pickEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: pickEnv("FIREBASE_PRIVATE_KEY"),
      storageBucket: pickEnv(
        "FIREBASE_STORAGE_BUCKET",
        "NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
        "NEXT_FIREBASE_STORAGE_BUCKET",
      ),
    },
    public: {
      auth: {
        allowPublicRegistration,
      },
      firebase: {
        apiKey: pickEnv("NUXT_PUBLIC_FIREBASE_API_KEY", "FIREBASE_API_KEY", "NEXT_FIREBASE_API_KEY"),
        authDomain: pickEnv("NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "FIREBASE_AUTH_DOMAIN", "NEXT_FIREBASE_AUTH_DOMAIN"),
        projectId: pickEnv("NUXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID", "NEXT_FIREBASE_PROJECT_ID"),
        storageBucket: pickEnv(
          "NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
          "FIREBASE_STORAGE_BUCKET",
          "NEXT_FIREBASE_STORAGE_BUCKET",
        ),
        messagingSenderId: pickEnv(
          "NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
          "FIREBASE_MESSAGING_SENDER_ID",
          "NEXT_FIREBASE_MESSAGING_SENDER_ID",
        ),
        appId: pickEnv("NUXT_PUBLIC_FIREBASE_APP_ID", "FIREBASE_APP_ID", "NEXT_FIREBASE_APP_ID"),
        measurementId: pickEnv(
          "NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
          "FIREBASE_MEASUREMENT_ID",
          "NEXT_FIREBASE_MEASUREMENT_ID",
        ),
      },
    },
  },
});
