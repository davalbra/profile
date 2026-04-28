import { MCP_ALLOWED_HEADERS, MCP_ALLOWED_METHODS } from "@/lib/mcp/config";

export function createUnauthorizedMcpResponse() {
  return Response.json(
    { error: "No autorizado. Configura Authorization: Bearer <MCP_SERVER_TOKEN>." },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": "Bearer",
      },
    },
  );
}

export function createMcpInternalErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Error interno de MCP.";
  return Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message,
      },
      id: null,
    },
    { status: 500 },
  );
}

export function createMcpOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: MCP_ALLOWED_METHODS,
      "Access-Control-Allow-Methods": MCP_ALLOWED_METHODS,
      "Access-Control-Allow-Headers": MCP_ALLOWED_HEADERS,
    },
  });
}
