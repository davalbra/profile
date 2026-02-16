import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  AccesoDenegadoError,
  requerirSesionFirebase,
  RolInsuficienteError,
} from "@/lib/auth/firebase-session";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const WEBP_QUALITY = 82;

function getBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "imagen";
  }

  const noExt = trimmed.replace(/\.[^.]+$/, "");
  return noExt.replace(/[^a-zA-Z0-9\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "imagen";
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });

    const formData = await request.formData();
    const fileValue = formData.get("image") ?? formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Debes enviar un archivo en el campo image o file." }, { status: 400 });
    }

    if (!fileValue.type.startsWith("image/")) {
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
    const metadata = await sharp(input, { failOn: "none", animated: true }).metadata();

    const output = await sharp(input, { failOn: "none", animated: true })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 4,
      })
      .toBuffer();

    const outputName = `${getBaseName(fileValue.name)}.webp`;

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `inline; filename="${outputName}"`,
        "Cache-Control": "no-store",
        "X-Original-Name": encodeURIComponent(fileValue.name),
        "X-Original-Size": String(fileValue.size),
        "X-Original-Format": metadata.format || fileValue.type || "unknown",
        "X-Optimized-Size": String(output.length),
        "X-Optimized-Format": "webp",
        "X-Optimized-Width": String(metadata.width || 0),
        "X-Optimized-Height": String(metadata.height || 0),
      },
    });
  } catch (error) {
    if (error instanceof AccesoDenegadoError || error instanceof RolInsuficienteError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const message = error instanceof Error ? error.message : "No se pudo optimizar la imagen.";
    if (/token|sesi[oó]n|autoriz/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
