"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuthInstance, getFirebaseStorageInstance } from "@/lib/firebase/client";

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

export async function uploadFileForCurrentUser(file: File): Promise<{
  path: string;
  downloadURL: string;
}> {
  const auth = getFirebaseAuthInstance();
  const storage = getFirebaseStorageInstance();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debes iniciar sesión para subir archivos.");
  }

  const filePath = `users/${user.uid}/${Date.now()}-${sanitizeName(file.name)}`;
  const fileRef = ref(storage, filePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type || undefined,
  });

  const downloadURL = await getDownloadURL(fileRef);

  return { path: filePath, downloadURL };
}
