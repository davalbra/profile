import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {isAuthorizedMcpRequest} from "@/lib/mcp/auth";
import {createMcpOptionsResponse, createMcpInternalErrorResponse, createUnauthorizedMcpResponse} from "@/lib/mcp/http";
import {createMcpServer} from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleMcpRequest(request: Request): Promise<Response> {
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
    return createMcpOptionsResponse();
}

