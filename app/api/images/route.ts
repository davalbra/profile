import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  AccesoDenegadoError,
  requerirSesionFirebase,
  RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import { getFirebaseAdminStorage } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const AVIF_QUALITY = 52;
const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const IMAGE_ORIGINALS_FOLDER = "originales";
const IMAGE_OPTIMIZED_FOLDER = "optimizadas";

type ImageResponse = {
  id: string;
  path: string;
  name: string;
  downloadURL: string;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
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

function toImageResponse(
  image: {
    id: string;
    pathOptimizada: string;
    nombreOptimizado: string;
    mimeOptimizado: string;
    bytesOptimizado: number;
    creadoEn: Date;
    actualizadoEn: Date;
    tokenOptimizado: string;
  },
  bucketName: string,
): ImageResponse {
  return {
    id: image.id,
    path: image.pathOptimizada,
    name: image.nombreOptimizado,
    downloadURL: getDownloadUrl(bucketName, image.pathOptimizada, image.tokenOptimizado),
    contentType: image.mimeOptimizado || null,
    sizeBytes: image.bytesOptimizado,
    createdAt: image.creadoEn.toISOString(),
    updatedAt: image.actualizadoEn.toISOString(),
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
    const images = await prisma.imagen.findMany({
      where: {
        usuarioId: sesion.uid,
        eliminadoEn: null,
      },
      orderBy: {
        creadoEn: "desc",
      },
      take: 300,
      select: {
        id: true,
        pathOptimizada: true,
        nombreOptimizado: true,
        mimeOptimizado: true,
        bytesOptimizado: true,
        creadoEn: true,
        actualizadoEn: true,
        tokenOptimizado: true,
      },
    });
    const bucketName = getFirebaseAdminStorage().bucket().name;
    const items = images.map((image) => toImageResponse(image, bucketName));

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

    const image = await prisma.imagen.create({
      data: {
        usuarioId: sesion.uid,
        nombreOriginal: fileValue.name,
        nombreOptimizado: optimizedName,
        pathOriginal: originalPath,
        pathOptimizada: optimizedPath,
        tokenOriginal: originalToken,
        tokenOptimizado: optimizedToken,
        mimeOriginal: fileValue.type || "application/octet-stream",
        mimeOptimizado: "image/avif",
        bytesOriginal: fileValue.size,
        bytesOptimizado: output.length,
      },
      select: {
        id: true,
        pathOptimizada: true,
        nombreOptimizado: true,
        mimeOptimizado: true,
        bytesOptimizado: true,
        creadoEn: true,
        actualizadoEn: true,
        tokenOptimizado: true,
        pathOriginal: true,
        nombreOriginal: true,
        mimeOriginal: true,
        bytesOriginal: true,
        tokenOriginal: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        image: toImageResponse(image, bucket.name),
        original: {
          path: image.pathOriginal,
          name: image.nombreOriginal,
          downloadURL: getDownloadUrl(bucket.name, image.pathOriginal, image.tokenOriginal),
          contentType: image.mimeOriginal,
          sizeBytes: image.bytesOriginal,
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
    const image = await prisma.imagen.findFirst({
      where: {
        usuarioId: sesion.uid,
        pathOptimizada: path,
        eliminadoEn: null,
      },
      select: {
        id: true,
        pathOptimizada: true,
        pathOriginal: true,
      },
    });

    if (image) {
      await Promise.all([
        bucket.file(image.pathOptimizada).delete({ ignoreNotFound: true }),
        bucket.file(image.pathOriginal).delete({ ignoreNotFound: true }),
      ]);

      await prisma.imagen.update({
        where: { id: image.id },
        data: { eliminadoEn: new Date() },
      });
    } else {
      await bucket.file(path).delete({ ignoreNotFound: true });
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
