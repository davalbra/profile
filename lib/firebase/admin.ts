import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | null = null;

function normalizeScalarEnv(value: string): string {
  let normalized = value.trim();
  if (!normalized) {
    return normalized;
  }

  while (normalized.endsWith(",")) {
    normalized = normalized.slice(0, -1).trim();
  }

  let previous = "";
  while (normalized !== previous) {
    previous = normalized;
    normalized = normalized
      .replace(/^\\?["']/, "")
      .replace(/\\?["']$/, "")
      .trim();
  }

  return normalized;
}

function pickEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const rawValue = process.env[key];
    if (rawValue?.trim()) {
      return rawValue;
    }
  }

  return undefined;
}

function normalizeProjectId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeScalarEnv(value);
  const projectIdMatch = normalized.match(/[a-z][a-z0-9-]*-[a-z0-9-]{2,}/);
  return projectIdMatch?.[0] ?? normalized;
}

function normalizeClientEmail(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeScalarEnv(value);
  const emailMatch = normalized.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return emailMatch?.[0] ?? normalized;
}

function normalizePrivateKey(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeScalarEnv(value).replace(/\\n/g, "\n").trim();
  return normalized || undefined;
}

function getFirebaseAdminConfig() {
  const projectId = normalizeProjectId(
    pickEnv("FIREBASE_PROJECT_ID", "NEXT_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  );
  const clientEmail = normalizeClientEmail(
    pickEnv("FIREBASE_CLIENT_EMAIL", "NEXT_FIREBASE_CLIENT_EMAIL"),
  );
  const privateKey = normalizePrivateKey(
    pickEnv("FIREBASE_PRIVATE_KEY", "NEXT_FIREBASE_PRIVATE_KEY"),
  );

  const missing: string[] = [];
  if (!projectId) {
    missing.push("FIREBASE_PROJECT_ID");
  }
  if (!clientEmail) {
    missing.push("FIREBASE_CLIENT_EMAIL");
  }
  if (!privateKey) {
    missing.push("FIREBASE_PRIVATE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Faltan variables para Firebase Admin: ${missing.join(", ")}.`);
  }

  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length) {
    adminApp = getApps()[0] as App;
    return adminApp;
  }

  const config = getFirebaseAdminConfig();
  adminApp = initializeApp({
    credential: cert(config),
    projectId: config.projectId,
  });

  return adminApp;
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
