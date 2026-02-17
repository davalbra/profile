import {NextResponse} from "next/server";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";

const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const ALLOWED_FOLDERS = ["galeria", "n8n", "optimizadas", "originales"] as const;

function buildAllowedPrefixes(uid: string): string[] {
    return ALLOWED_FOLDERS.map((folder) => `users/${uid}/${IMAGE_ROOT_FOLDER}/${folder}/`);
}

function asString(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (value === null || value === undefined) {
        return null;
    }

    return String(value);
}

function sanitizeDownloadName(value: string | null, fallback: string): string {
    const candidate = (value || fallback).trim();
    if (!candidate) {
        return fallback;
    }

    return candidate
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .slice(0, 160);
}

function parseAuthError(error: unknown) {
    if (error instanceof AccesoDenegadoError || error instanceof RolInsuficienteError) {
        return NextResponse.json({error: error.message}, {status: 403});
    }

    const message = error instanceof Error ? error.message : "No autorizado.";
    if (/token|sesi[oó]n|autoriz/i.test(message)) {
        return NextResponse.json({error: message}, {status: 401});
    }

    return null;
}

export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const {searchParams} = new URL(request.url);
        const path = decodeURIComponent(searchParams.get("path") || "").trim();
        const requestedName = decodeURIComponent(searchParams.get("name") || "").trim();

        if (!path) {
            return NextResponse.json({error: "Falta path del archivo."}, {status: 400});
        }

        const allowedPrefixes = buildAllowedPrefixes(sesion.uid);
        const isAllowed = allowedPrefixes.some((prefix) => path.startsWith(prefix));
        if (!isAllowed) {
            return NextResponse.json({error: "No tienes permisos para descargar este archivo."}, {status: 403});
        }

        const bucket = getFirebaseAdminStorage().bucket();
        const file = bucket.file(path);
        const [exists] = await file.exists();
        if (!exists) {
            return NextResponse.json({error: "El archivo no existe."}, {status: 404});
        }

        const [buffer] = await file.download();
        const [metadata] = await file.getMetadata();
        const fallbackName = path.split("/").pop() || "imagen";
        const originalName = asString(metadata.metadata?.originalName);
        const fileName = sanitizeDownloadName(requestedName || originalName, fallbackName);

        return new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type": metadata.contentType || "application/octet-stream",
                "Content-Disposition": `attachment; filename=\"${fileName}\"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo descargar la imagen.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
