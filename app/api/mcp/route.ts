import {NextResponse} from "next/server";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import * as z from "zod/v4";
import {getBillingUsage, parseBillingPeriod} from "@/lib/billing/google-cloud";
import type {BillingServiceKey} from "@/lib/billing/types";
import {IMAGE_OPTIMIZATION_DEFAULTS, optimizeImageToAvif} from "@/lib/images/optimize-image";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const MCP_SERVER_NAME = "davalbra-mcp";
const MCP_SERVER_VERSION = "1.0.0";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(authorizationHeader: string | null): string | null {
    if (!authorizationHeader) {
        return null;
    }

    const [schema, token] = authorizationHeader.split(" ");
    if (schema?.toLowerCase() !== "bearer" || !token) {
        return null;
    }

    return token.trim() || null;
}

function isAuthorizedMcpRequest(request: Request): boolean {
    const expectedToken = process.env.MCP_SERVER_TOKEN?.trim();
    if (!expectedToken) {
        return true;
    }

    const bearerToken = getBearerToken(request.headers.get("authorization"));
    const headerToken = request.headers.get("x-mcp-token")?.trim() || null;
    return bearerToken === expectedToken || headerToken === expectedToken;
}

function parseBase64Input(raw: string): Buffer {
    const trimmed = raw.trim();
    if (!trimmed) {
        throw new Error("imageBase64 no puede estar vacío.");
    }

    const dataUrlMatch = trimmed.match(/^data:.*;base64,(.+)$/i);
    const base64Payload = (dataUrlMatch?.[1] || trimmed).replace(/\s+/g, "");
    const output = Buffer.from(base64Payload, "base64");

    if (!output.length) {
        throw new Error("No se pudo decodificar imageBase64.");
    }

    return output;
}

function createMcpServer() {
    const server = new McpServer({
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
    });

    server.registerTool(
        "optimize_image",
        {
            title: "Optimizar imagen AVIF",
            description: "Optimiza una imagen en base64 a formato AVIF con metadata de ahorro.",
            inputSchema: {
                imageBase64: z.string().describe("Imagen en base64 (raw o data URL)."),
                fileName: z.string().optional(),
                quality: z.number().int().min(1).max(100).optional(),
                effort: z.number().int().min(0).max(9).optional(),
                maxDimension: z.number().int().min(256).max(4096).optional(),
                returnBase64: z.boolean().optional(),
            },
        },
        async ({imageBase64, fileName, quality, effort, maxDimension, returnBase64}) => {
            try {
                const input = parseBase64Input(imageBase64);
                if (input.length > MAX_UPLOAD_BYTES) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: `La imagen supera el límite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`,
                            },
                        ],
                    };
                }

                const optimized = await optimizeImageToAvif({
                    input,
                    fileName: fileName || "imagen",
                    quality: quality ?? IMAGE_OPTIMIZATION_DEFAULTS.quality,
                    effort: effort ?? IMAGE_OPTIMIZATION_DEFAULTS.effort,
                    maxDimension: maxDimension ?? IMAGE_OPTIMIZATION_DEFAULTS.maxDimension,
                });

                const savedBytes = Math.max(0, optimized.original.sizeBytes - optimized.optimized.sizeBytes);
                const savedPercent =
                    optimized.original.sizeBytes > 0
                        ? Number(((savedBytes / optimized.original.sizeBytes) * 100).toFixed(2))
                        : 0;

                const structuredContent: Record<string, unknown> = {
                    fileName: optimized.outputName,
                    format: "avif",
                    originalSizeBytes: optimized.original.sizeBytes,
                    optimizedSizeBytes: optimized.optimized.sizeBytes,
                    savedBytes,
                    savedPercent,
                    width: optimized.optimized.width,
                    height: optimized.optimized.height,
                };

                if (returnBase64) {
                    structuredContent.optimizedBase64 = optimized.output.toString("base64");
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Optimización completada: ${optimized.original.sizeBytes} -> ${optimized.optimized.sizeBytes} bytes (${savedPercent}% ahorro).`,
                        },
                    ],
                    structuredContent,
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : "No se pudo optimizar la imagen.";
                return {
                    isError: true,
                    content: [{type: "text", text: message}],
                };
            }
        },
    );

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

    return server;
}

async function handleMcpRequest(request: Request): Promise<Response> {
    if (!isAuthorizedMcpRequest(request)) {
        return NextResponse.json(
            {error: "No autorizado. Configura Authorization: Bearer <MCP_SERVER_TOKEN>."},
            {
                status: 401,
                headers: {
                    "WWW-Authenticate": "Bearer",
                },
            },
        );
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
    });

    const server = createMcpServer();

    try {
        await server.connect(transport);
        return await transport.handleRequest(request);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error interno de MCP.";
        return NextResponse.json(
            {
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message,
                },
                id: null,
            },
            {status: 500},
        );
    }
}

export async function POST(request: Request) {
    return handleMcpRequest(request);
}

export async function GET(request: Request) {
    return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
    return handleMcpRequest(request);
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            Allow: "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-MCP-Token, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
        },
    });
}
