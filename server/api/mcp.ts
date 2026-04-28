import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getRequestURL, readRawBody, type H3Event } from "h3";
import { isAuthorizedMcpRequest } from "@/lib/mcp/auth";
import {
  createMcpInternalErrorResponse,
  createMcpOptionsResponse,
  createUnauthorizedMcpResponse,
} from "@/lib/mcp/http";
import { createMcpServer } from "@/lib/mcp/server";

function toWebRequest(event: H3Event, body: string | null) {
  const url = getRequestURL(event);
  const method = event.node.req.method || "GET";
  const headers = new Headers();

  for (const [key, value] of Object.entries(event.node.req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  return new Request(url, {
    method,
    headers,
    body: method === "GET" || method === "DELETE" || method === "HEAD" ? undefined : body,
  });
}

export default defineEventHandler(async (event) => {
  if (event.node.req.method === "OPTIONS") {
    return createMcpOptionsResponse();
  }

  const rawBody = await readRawBody(event, false);
  const body =
    typeof rawBody === "string" ? rawBody : rawBody ? rawBody.toString("utf8") : null;
  const request = toWebRequest(event, body);

  if (!isAuthorizedMcpRequest(request)) {
    return createUnauthorizedMcpResponse();
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
    return createMcpInternalErrorResponse(error);
  }
});
