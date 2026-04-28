import {
  BillingConfigurationError,
  getBillingUsage,
  parseBillingPeriod,
} from "@/lib/billing/google-cloud";
import { setHeader } from "h3";
import type { BillingServiceKey } from "@/lib/billing/types";
import {
  AccessDeniedError,
  InsufficientRoleError,
  requireFirebaseSession,
} from "@/server/utils/firebase-session";

export default defineEventHandler(async (event) => {
  try {
    await requireFirebaseSession(event, { rolMinimo: "COLABORADOR" });

    const query = getQuery(event);
    const service =
      query.service === "firebase" || query.service === "gemini"
        ? (query.service as BillingServiceKey)
        : null;

    if (!service) {
      throw createError({
        statusCode: 400,
        statusMessage: "Parámetro service inválido. Usa service=firebase o service=gemini.",
      });
    }

    const period = parseBillingPeriod(typeof query.period === "string" ? query.period : null);
    const data = await getBillingUsage({ service, period });
    setHeader(event, "Cache-Control", "no-store");

    return {
      ok: true,
      data,
    };
  } catch (error) {
    if (error instanceof AccessDeniedError || error instanceof InsufficientRoleError) {
      throw createError({
        statusCode: 403,
        statusMessage: error.message,
      });
    }

    if (error instanceof BillingConfigurationError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }

    if (typeof error === "object" && error && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : "No se pudo consultar el billing.",
    });
  }
});
