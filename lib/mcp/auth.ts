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

export function isAuthorizedMcpRequest(request: Request): boolean {
    const expectedToken = process.env.MCP_SERVER_TOKEN?.trim();
    if (!expectedToken) {
        return true;
    }

    const bearerToken = getBearerToken(request.headers.get("authorization"));
    const headerToken = request.headers.get("x-mcp-token")?.trim() || null;
    return bearerToken === expectedToken || headerToken === expectedToken;
}
