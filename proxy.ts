import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

type RolUsuario = "LECTOR" | "COLABORADOR" | "ADMIN";

const JERARQUIA_ROL: Record<RolUsuario, number> = {
    LECTOR: 1,
    COLABORADOR: 2,
    ADMIN: 3,
};

const PUBLIC_EXACT_PATHS = new Set([
    "/",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/api/auth/firebase-session",
    "/api/secure/session",
]);

const REGLAS_RUTA_ROL: Array<{ prefijo: string; rolMinimo: RolUsuario }> = [
    {prefijo: "/dashboard", rolMinimo: "COLABORADOR"},
    {prefijo: "/storage-test", rolMinimo: "COLABORADOR"},
];

function getRolMinimoParaRuta(pathname: string): RolUsuario | null {
    for (const regla of REGLAS_RUTA_ROL) {
        if (pathname === regla.prefijo || pathname.startsWith(`${regla.prefijo}/`)) {
            return regla.rolMinimo;
        }
    }

    return null;
}

function tieneRolMinimo(rolActual: RolUsuario, rolMinimo: RolUsuario): boolean {
    return JERARQUIA_ROL[rolActual] >= JERARQUIA_ROL[rolMinimo];
}

function isPublicPath(pathname: string): boolean {
    if (PUBLIC_EXACT_PATHS.has(pathname)) {
        return true;
    }

    if (pathname.startsWith("/_next/")) {
        return true;
    }

    if (pathname.includes(".")) {
        return true;
    }

    return false;
}

function redirectToHome(
    request: NextRequest,
    authState: "required" | "forbidden" = "required",
): NextResponse {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("auth", authState);

    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (nextPath && nextPath !== "/") {
        redirectUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(redirectUrl);
}

function rejectApiRequest(authState: "required" | "forbidden" = "required"): NextResponse {
    const status = authState === "forbidden" ? 403 : 401;
    return NextResponse.json(
        {
            error:
                authState === "forbidden"
                    ? "No tienes permisos suficientes para este recurso."
                    : "Debes iniciar sesión para acceder a este recurso.",
            auth: authState,
        },
        {status},
    );
}

function rejectOrRedirect(
    request: NextRequest,
    authState: "required" | "forbidden" = "required",
): NextResponse {
    if (request.nextUrl.pathname.startsWith("/api/")) {
        return rejectApiRequest(authState);
    }

    return redirectToHome(request, authState);
}

function hasAuthCookie(cookieHeader: string | null): boolean {
    if (!cookieHeader) {
        return false;
    }

    return (
        cookieHeader.includes("firebase_session=") ||
        cookieHeader.includes("firebase_id_token=")
    );
}

export async function proxy(request: NextRequest) {
    if (isPublicPath(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    const cookieHeader = request.headers.get("cookie");
    if (!hasAuthCookie(cookieHeader)) {
        return rejectOrRedirect(request);
    }
    const authCookieHeader = cookieHeader || "";

    const rolMinimo = getRolMinimoParaRuta(request.nextUrl.pathname);

    try {
        const validationUrl = new URL("/api/secure/session", request.url);
        if (rolMinimo) {
            validationUrl.searchParams.set("rolMinimo", rolMinimo);
        }

        const validationResponse = await fetch(validationUrl, {
            method: "GET",
            headers: {
                cookie: authCookieHeader,
            },
            cache: "no-store",
        });

        if (!validationResponse.ok) {
            if (validationResponse.status === 403) {
                return rejectOrRedirect(request, "forbidden");
            }
            return rejectOrRedirect(request);
        }

        if (!rolMinimo) {
            return NextResponse.next();
        }

        const payload = (await validationResponse.json().catch(() => null)) as {
            sesion?: { rol?: RolUsuario };
        } | null;
        const rolActual = payload?.sesion?.rol;

        if (!rolActual || !tieneRolMinimo(rolActual, rolMinimo)) {
            return rejectOrRedirect(request, "forbidden");
        }

        return NextResponse.next();
    } catch {
        // Si falla la validación, tratamos como sesión inválida.
    }

    return rejectOrRedirect(request);
}

export const config = {
    matcher: ["/:path*"],
};
