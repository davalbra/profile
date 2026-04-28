"use client";

import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes,
  uploadBytesResumable,
  type UploadMetadata,
} from "firebase/storage";
import { getFirebaseAuthInstance, getFirebaseStorageInstance } from "@/lib/firebase/client";

type UploadBlobOptions = {
  folder?: string;
  fileName: string;
  contentType?: string;
  customMetadata?: Record<string, string>;
};

export type StoredFile = {
  path: string;
  name: string;
  downloadURL: string;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

function normalizeFolder(folder: string | undefined): string {
  if (!folder) {
    return "";
  }

  return folder
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function getCurrentUserOrThrow() {
  const auth = getFirebaseAuthInstance();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debes iniciar sesión para subir archivos.");
  }

  return user;
}

function buildUserFilePath(uid: string, folder: string | undefined, fileName: string): string {
  const safeName = sanitizeName(fileName);
  const normalizedFolder = normalizeFolder(folder);
  const folderPrefix = normalizedFolder ? `${normalizedFolder}/` : "";
  return `users/${uid}/${folderPrefix}${Date.now()}-${safeName}`;
}

export async function uploadFileForCurrentUser(file: File): Promise<{
  path: string;
  downloadURL: string;
}> {
  const storage = getFirebaseStorageInstance();
  const user = getCurrentUserOrThrow();

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
  const storage = getFirebaseStorageInstance();
  const user = getCurrentUserOrThrow();

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

export async function uploadBlobForCurrentUserWithProgress(
  blob: Blob,
  options: UploadBlobOptions,
  onProgress: (percent: number) => void,
): Promise<{
  path: string;
  downloadURL: string;
}> {
  const storage = getFirebaseStorageInstance();
  const user = getCurrentUserOrThrow();

  const filePath = buildUserFilePath(user.uid, options.folder, options.fileName);
  const fileRef = ref(storage, filePath);

  const metadata: UploadMetadata = {
    contentType: options.contentType || undefined,
    customMetadata: options.customMetadata,
  };

  const task = uploadBytesResumable(fileRef, blob, metadata);

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

export async function listFilesForCurrentUser(folder: string): Promise<StoredFile[]> {
  const storage = getFirebaseStorageInstance();
  const user = getCurrentUserOrThrow();

  const normalizedFolder = normalizeFolder(folder);
  const folderPath = normalizedFolder ? `users/${user.uid}/${normalizedFolder}` : `users/${user.uid}`;
  const listResult = await listAll(ref(storage, folderPath));

  const files = await Promise.all(
    listResult.items.map(async (itemRef) => {
      const [downloadURL, metadata] = await Promise.all([getDownloadURL(itemRef), getMetadata(itemRef)]);

      return {
        path: itemRef.fullPath,
        name: itemRef.name,
        downloadURL,
        contentType: metadata.contentType || null,
        sizeBytes: metadata.size ? Number(metadata.size) : null,
        createdAt: metadata.timeCreated || null,
        updatedAt: metadata.updated || null,
      } satisfies StoredFile;
    }),
  );

  return files.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
}

export async function deleteFileForCurrentUser(path: string): Promise<void> {
  const storage = getFirebaseStorageInstance();
  const user = getCurrentUserOrThrow();
  const safePrefix = `users/${user.uid}/`;

  if (!path.startsWith(safePrefix)) {
    throw new Error("No tienes permisos para eliminar este archivo.");
  }

  await deleteObject(ref(storage, path));
}
