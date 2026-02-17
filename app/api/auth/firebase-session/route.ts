import {NextResponse} from "next/server";
import {
    AccesoDenegadoError,
    registrarSesionFirebase,
    revocarSesionFirebase,
} from "@/lib/auth/firebase-session";

const SESSION_MAX_AGE_SECONDS = 3 * 24 * 60 * 60;

function extraerBearerToken(authorizationHeader: string | null): string | null {
    if (!authorizationHeader) {
        return null;
    }

    const [schema, token] = authorizationHeader.split(" ");
    if (schema?.toLowerCase() !== "bearer" || !token) {
        return null;
    }

    return token;
}

function extraerCookieToken(cookieHeader: string | null, cookieName: string): string | null {
    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
        const [name, ...parts] = cookie.trim().split("=");
        if (name === cookieName) {
            return parts.join("=") || null;
        }
    }

    return null;
}

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as { idToken?: string };
        const idToken = payload.idToken;

        if (!idToken) {
            return NextResponse.json({error: "Falta idToken."}, {status: 400});
        }

        const sesion = await registrarSesionFirebase(idToken, request);

        const response = NextResponse.json(
            {
                ok: true,
                usuario: {
                    uid: sesion.uid,
                    email: sesion.email,
                    nombre: sesion.nombre,
                    avatarUrl: sesion.avatarUrl,
                },
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );

        const cookieOptions = {
            path: "/",
            httpOnly: true,
            sameSite: "lax" as const,
            secure: process.env.NODE_ENV === "production",
            maxAge: SESSION_MAX_AGE_SECONDS,
        };
        response.cookies.set("firebase_session", sesion.sessionCookie, cookieOptions);
        response.cookies.set("firebase_id_token", sesion.sessionCookie, cookieOptions);

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo registrar la sesión.";
        const status = error instanceof AccesoDenegadoError ? 403 : 401;
        return NextResponse.json({error: message}, {status});
    }
}

export async function DELETE(request: Request) {
    try {
        const token =
            extraerBearerToken(request.headers.get("authorization")) ||
            extraerCookieToken(request.headers.get("cookie"), "firebase_session") ||
            extraerCookieToken(request.headers.get("cookie"), "firebase_id_token");
        if (token) {
            await revocarSesionFirebase(token);
        }

        const response = NextResponse.json(
            {ok: true},
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );

        const clearCookieOptions = {
            path: "/",
            httpOnly: true,
            sameSite: "lax" as const,
            secure: process.env.NODE_ENV === "production",
            maxAge: 0,
        };
        response.cookies.set("firebase_session", "", clearCookieOptions);
        response.cookies.set("firebase_id_token", "", clearCookieOptions);

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo cerrar la sesión.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
