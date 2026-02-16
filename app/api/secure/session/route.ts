import {NextResponse} from "next/server";
import type {RolUsuario} from "@prisma/client";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";

const ROLES_VALIDOS = new Set<RolUsuario>(["LECTOR", "COLABORADOR", "ADMIN"]);

function parseRolMinimo(request: Request): RolUsuario | undefined {
    const rolMinimo = new URL(request.url).searchParams.get("rolMinimo");
    if (!rolMinimo) {
        return undefined;
    }

    if (ROLES_VALIDOS.has(rolMinimo as RolUsuario)) {
        return rolMinimo as RolUsuario;
    }

    return undefined;
}

export async function GET(request: Request) {
    try {
        const sesion = await requerirSesionFirebase(request, {
            rolMinimo: parseRolMinimo(request),
        });

        return NextResponse.json(
            {
                ok: true,
                sesion,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Sesión inválida.";
        const status =
            error instanceof AccesoDenegadoError || error instanceof RolInsuficienteError ? 403 : 401;
        return NextResponse.json({error: message}, {status});
    }
}
