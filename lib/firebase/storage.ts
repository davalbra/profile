"use client";

import { getDownloadURL, ref, uploadBytes, uploadBytesResumable } from "firebase/storage";
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

export async function uploadFileForCurrentUserWithProgress(
  file: File,
  onProgress: (percent: number) => void,
): Promise<{
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

  const task = uploadBytesResumable(fileRef, file, {
    contentType: file.type || undefined,
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(percent);
      },
      reject,
      resolve,
    );
  });

  const downloadURL = await getDownloadURL(task.snapshot.ref);

  return { path: filePath, downloadURL };
}
