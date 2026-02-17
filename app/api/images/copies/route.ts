import {NextResponse} from "next/server";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {getFirebaseAdminStorage} from "@/lib/firebase/admin";

const IMAGE_ROOT_FOLDER = "davalbra-imagenes-fix";
const IMAGE_GALLERY_FOLDER = "galeria";
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const N8N_COPY_WEBHOOK_URL =
    "https://n8n.srv1338422.hstgr.cloud/webhook-test/37f97811-ea45-4d5a-a2c5-6f104ca79b15";

function buildGalleryPrefix(uid: string): string {
    return `users/${uid}/${IMAGE_ROOT_FOLDER}/${IMAGE_GALLERY_FOLDER}/`;
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

function asString(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (value === null || value === undefined) {
        return null;
    }

    return String(value);
}

async function resolveSourceImage(formData: FormData, uid: string): Promise<{
    buffer: Buffer;
    fileName: string;
    contentType: string;
    source: "local" | "gallery";
}> {
    const fileValue = formData.get("image") ?? formData.get("file");

    if (fileValue instanceof File) {
        if (fileValue.type && !fileValue.type.startsWith("image/")) {
            throw new Error("El archivo debe ser una imagen.");
        }

        if (fileValue.size <= 0) {
            throw new Error("La imagen está vacía.");
        }

        if (fileValue.size > MAX_UPLOAD_BYTES) {
            throw new Error(`La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
        }

        return {
            buffer: Buffer.from(await fileValue.arrayBuffer()),
            fileName: fileValue.name || `image-${Date.now()}`,
            contentType: fileValue.type || "application/octet-stream",
            source: "local",
        };
    }

    const galleryPath = String(formData.get("galleryPath") || "").trim();
    if (!galleryPath) {
        throw new Error("Debes seleccionar una imagen local o de galería.");
    }

    const prefix = buildGalleryPrefix(uid);
    if (!galleryPath.startsWith(prefix)) {
        throw new Error("No tienes permisos para usar esta imagen de galería.");
    }

    const bucket = getFirebaseAdminStorage().bucket();
    const file = bucket.file(galleryPath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new Error("La imagen seleccionada en galería no existe.");
    }

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const originalName = asString(metadata.metadata?.originalName);

    if (buffer.length > MAX_UPLOAD_BYTES) {
        throw new Error(`La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
    }

    const fileName = originalName || galleryPath.split("/").pop() || `gallery-image-${Date.now()}`;
    const contentType = metadata.contentType || "application/octet-stream";

    return {
        buffer,
        fileName,
        contentType,
        source: "gallery",
    };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});
        const formData = await request.formData();
        const sourceImage = await resolveSourceImage(formData, sesion.uid);

        const outbound = new FormData();
        outbound.append(
            "image",
            new Blob([new Uint8Array(sourceImage.buffer)], {type: sourceImage.contentType}),
            sourceImage.fileName,
        );
        outbound.append("source", sourceImage.source);
        outbound.append("uid", sesion.uid);

        const response = await fetch(N8N_COPY_WEBHOOK_URL, {
            method: "POST",
            body: outbound,
            cache: "no-store",
        });

        const rawText = await response.text();
        let parsed: unknown = rawText;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            parsed = rawText;
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: "n8n respondió con error.",
                    status: response.status,
                    payload: parsed,
                },
                {status: 502},
            );
        }

        return NextResponse.json(
            {
                ok: true,
                source: sourceImage.source,
                fileName: sourceImage.fileName,
                n8n: parsed,
            },
            {headers: {"Cache-Control": "no-store"}},
        );
    } catch (error) {
        const authError = parseAuthError(error);
        if (authError) {
            return authError;
        }

        const message = error instanceof Error ? error.message : "No se pudo enviar la imagen a n8n.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
