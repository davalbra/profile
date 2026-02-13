import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | null = null;

function getFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY para Firebase Admin.",
    );
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
  });

  return adminApp;
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
