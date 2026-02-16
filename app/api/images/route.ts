import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  AccesoDenegadoError,
  requerirSesionFirebase,
  RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import { getFirebaseAdminStorage } from "@/lib/firebase/admin";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const AVIF_QUALITY = 52;
const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const IMAGE_ORIGINALS_FOLDER = "originales";
const IMAGE_OPTIMIZED_FOLDER = "optimizadas";

type ImageItem = {
  path: string;
  name: string;
  downloadURL: string;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type AdminStorageFile = {
  name: string;
  getMetadata: () => Promise<
    [
      {
        contentType?: string;
        size?: string | number;
        timeCreated?: string;
        updated?: string;
        metadata?: Record<string, string> | null;
      },
      ...unknown[],
    ]
  >;
  setMetadata: (metadata: { metadata: Record<string, string> }) => Promise<unknown>;
};

function getBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "imagen";
  }

  const noExt = trimmed.replace(/\.[^.]+$/, "");
  return noExt.replace(/[^a-zA-Z0-9\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "imagen";
}

function buildFolderPrefix(uid: string, folder: string): string {
  return `users/${uid}/${IMAGE_ROOT_FOLDER}/${folder}/`;
}

function getDownloadUrl(bucketName: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function parseStoredSize(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function fileToImageItem(bucketName: string, file: AdminStorageFile): Promise<ImageItem> {
  const [metadata] = await file.getMetadata();
  const customMetadata = metadata.metadata || {};
  let token = customMetadata.firebaseStorageDownloadTokens || "";

  if (!token) {
    token = crypto.randomUUID();
    await file.setMetadata({
      metadata: {
        ...customMetadata,
        firebaseStorageDownloadTokens: token,
      },
    });
  }

  return {
    path: file.name,
    name: file.name.split("/").pop() || file.name,
    downloadURL: getDownloadUrl(bucketName, file.name, token),
    contentType: metadata.contentType || null,
    sizeBytes: parseStoredSize(metadata.size),
    createdAt: metadata.timeCreated || null,
    updatedAt: metadata.updated || null,
  };
}

function parseAuthError(error: unknown) {
  if (error instanceof AccesoDenegadoError || error instanceof RolInsuficienteError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  const message = error instanceof Error ? error.message : "No autorizado.";
  if (/token|sesi[oó]n|autoriz/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  return null;
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const sesion = await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });
    const prefix = buildFolderPrefix(sesion.uid, IMAGE_OPTIMIZED_FOLDER);
    const bucket = getFirebaseAdminStorage().bucket();

    const [files] = await bucket.getFiles({
      prefix,
      autoPaginate: false,
      maxResults: 300,
    });

    const imageFiles = files.filter((file) => file.name && !file.name.endsWith("/"));
    const items = await Promise.all(
      imageFiles.map((file) => fileToImageItem(bucket.name, file as unknown as AdminStorageFile)),
    );

    items.sort((a, b) => {
      const aDate = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bDate = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bDate - aDate;
    });

    return NextResponse.json({ ok: true, images: items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const authError = parseAuthError(error);
    if (authError) {
      return authError;
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar las imágenes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sesion = await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });
    const formData = await request.formData();
    const fileValue = formData.get("image") ?? formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Debes enviar un archivo en el campo image o file." }, { status: 400 });
    }

    if (fileValue.type && !fileValue.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 415 });
    }

    if (fileValue.size <= 0) {
      return NextResponse.json({ error: "La imagen está vacía." }, { status: 400 });
    }

    if (fileValue.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.` },
        { status: 413 },
      );
    }

    const input = Buffer.from(await fileValue.arrayBuffer());
    const output = await sharp(input, { failOn: "none", animated: true })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .avif({
        quality: AVIF_QUALITY,
        effort: 4,
      })
      .toBuffer();

    const baseName = getBaseName(fileValue.name);
    const extension = fileValue.name.includes(".") ? fileValue.name.split(".").pop()?.toLowerCase() : "bin";
    const safeExtension = extension ? extension.replace(/[^a-z0-9]/g, "") || "bin" : "bin";
    const timestamp = Date.now();
    const originalName = `${timestamp}-${baseName}.${safeExtension}`;
    const optimizedName = `${timestamp}-${baseName}.avif`;
    const originalPath = `${buildFolderPrefix(sesion.uid, IMAGE_ORIGINALS_FOLDER)}${originalName}`;
    const optimizedPath = `${buildFolderPrefix(sesion.uid, IMAGE_OPTIMIZED_FOLDER)}${optimizedName}`;
    const optimizedToken = crypto.randomUUID();
    const originalToken = crypto.randomUUID();
    const bucket = getFirebaseAdminStorage().bucket();
    const originalFile = bucket.file(originalPath);
    const optimizedFile = bucket.file(optimizedPath);

    await originalFile.save(input, {
      resumable: false,
      metadata: {
        contentType: fileValue.type || "application/octet-stream",
        metadata: {
          firebaseStorageDownloadTokens: originalToken,
          source: "original-upload",
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    await optimizedFile.save(output, {
      resumable: false,
      metadata: {
        contentType: "image/avif",
        metadata: {
          firebaseStorageDownloadTokens: optimizedToken,
          originalName: fileValue.name,
          originalPath,
          originalBytes: String(fileValue.size),
          optimizedBytes: String(output.length),
          optimizedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        image: {
          path: optimizedPath,
          name: optimizedName,
          downloadURL: getDownloadUrl(bucket.name, optimizedPath, optimizedToken),
          contentType: "image/avif",
          sizeBytes: output.length,
        } satisfies Partial<ImageItem>,
        original: {
          path: originalPath,
          name: originalName,
          downloadURL: getDownloadUrl(bucket.name, originalPath, originalToken),
          contentType: fileValue.type || "application/octet-stream",
          sizeBytes: fileValue.size,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const authError = parseAuthError(error);
    if (authError) {
      return authError;
    }

    const message = error instanceof Error ? error.message : "No se pudo optimizar y subir la imagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sesion = await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });
    const payload = (await request.json().catch(() => null)) as { path?: string } | null;
    const path = payload?.path?.trim();

    if (!path) {
      return NextResponse.json({ error: "Falta path del archivo a eliminar." }, { status: 400 });
    }

    const prefix = `users/${sesion.uid}/${IMAGE_ROOT_FOLDER}/`;
    if (!path.startsWith(prefix)) {
      return NextResponse.json({ error: "No tienes permisos para eliminar este archivo." }, { status: 403 });
    }

    const bucket = getFirebaseAdminStorage().bucket();
    const targetFile = bucket.file(path) as unknown as AdminStorageFile & {
      delete: (options?: { ignoreNotFound?: boolean }) => Promise<unknown>;
    };
    const [metadata] = await targetFile
      .getMetadata()
      .catch(
        () =>
          [
            {
              metadata: null,
            },
          ] as [
            {
              metadata?: Record<string, unknown> | null;
            },
          ],
      );
    const metadataMap = (metadata?.metadata || null) as Record<string, unknown> | null;
    const maybeOriginalPath = typeof metadataMap?.originalPath === "string" ? metadataMap.originalPath : null;

    await targetFile.delete({ ignoreNotFound: true });

    if (maybeOriginalPath && typeof maybeOriginalPath === "string" && maybeOriginalPath.startsWith(prefix)) {
      await bucket.file(maybeOriginalPath).delete({ ignoreNotFound: true });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const authError = parseAuthError(error);
    if (authError) {
      return authError;
    }

    const message = error instanceof Error ? error.message : "No se pudo eliminar la imagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
