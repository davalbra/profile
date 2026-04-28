import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {getBillingUsage, parseBillingPeriod} from "@/lib/billing/google-cloud";
import type {BillingServiceKey} from "@/lib/billing/types";

export function registerBillingUsageTool(server: McpServer) {
    server.registerTool(
        "billing_usage",
        {
            title: "Consultar billing",
            description: "Consulta costos por uso para Firebase o Gemini desde Cloud Billing (BigQuery).",
            inputSchema: {
                service: z.enum(["firebase", "gemini"]),
                period: z.enum(["7d", "30d", "90d"]).optional(),
            },
        },
        async ({service, period}) => {
            try {
                const billingPeriod = parseBillingPeriod(period || null);
                const data = await getBillingUsage({
                    service: service as BillingServiceKey,
                    period: billingPeriod,
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Billing ${data.service} (${data.period}): ${data.totalCost.toFixed(2)} ${data.currency}.`,
                        },
                    ],
                    structuredContent: data,
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : "No se pudo consultar billing.";
                return {
                    isError: true,
                    content: [{type: "text", text: message}],
                };
            }
        },
    );
}
