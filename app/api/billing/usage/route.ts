import {NextResponse} from "next/server";
import {
    AccesoDenegadoError,
    requerirSesionFirebase,
    RolInsuficienteError,
} from "@/lib/auth/firebase-session";
import {
    BillingConfigurationError,
    getBillingUsage,
    parseBillingPeriod,
} from "@/lib/billing/google-cloud";
import type {BillingServiceKey} from "@/lib/billing/types";

export const runtime = "nodejs";

function parseService(request: Request): BillingServiceKey | null {
    const service = new URL(request.url).searchParams.get("service");
    if (service === "firebase" || service === "gemini") {
        return service;
    }
    return null;
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

export async function GET(request: Request) {
    try {
        await requerirSesionFirebase(request, {rolMinimo: "COLABORADOR"});

        const service = parseService(request);
        if (!service) {
            return NextResponse.json(
                {error: "Parámetro service inválido. Usa service=firebase o service=gemini."},
                {status: 400},
            );
        }

        const period = parseBillingPeriod(new URL(request.url).searchParams.get("period"));
        const data = await getBillingUsage({service, period});

        return NextResponse.json(
            {
                ok: true,
                data,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        const authResponse = parseAuthError(error);
        if (authResponse) {
            return authResponse;
        }

        if (error instanceof BillingConfigurationError) {
            return NextResponse.json({error: error.message}, {status: 400});
        }

        const message = error instanceof Error ? error.message : "No se pudo consultar el billing.";
        return NextResponse.json({error: message}, {status: 500});
    }
}
