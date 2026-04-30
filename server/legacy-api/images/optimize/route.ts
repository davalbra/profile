import { NextResponse } from "@/server/compat/next-response";
import {
  AccesoDenegadoError,
  requerirSesionFirebase,
  RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import { IMAGE_OPTIMIZATION_DEFAULTS, optimizeImageToAvif } from "@/lib/images/optimize-image";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requerirSesionFirebase(request, { rolMinimo: "COLABORADOR" });

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
    const optimized = await optimizeImageToAvif({
      input,
      fileName: fileValue.name,
      maxDimension: IMAGE_OPTIMIZATION_DEFAULTS.maxDimension,
      quality: IMAGE_OPTIMIZATION_DEFAULTS.quality,
      effort: IMAGE_OPTIMIZATION_DEFAULTS.effort,
    });

    return new Response(new Uint8Array(optimized.output), {
      status: 200,
      headers: {
        "Content-Type": "image/avif",
        "Content-Disposition": `inline; filename="${optimized.outputName}"`,
        "Cache-Control": "no-store",
        "X-Original-Name": encodeURIComponent(fileValue.name),
        "X-Original-Size": String(fileValue.size),
        "X-Original-Format": optimized.original.format || fileValue.type || "unknown",
        "X-Optimized-Size": String(optimized.optimized.sizeBytes),
        "X-Optimized-Format": "avif",
        "X-Optimized-Width": String(optimized.optimized.width || 0),
        "X-Optimized-Height": String(optimized.optimized.height || 0),
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
