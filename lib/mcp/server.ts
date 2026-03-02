import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {MCP_SERVER_NAME, MCP_SERVER_VERSION} from "@/lib/mcp/config";
import {registerBillingUsageTool} from "@/lib/mcp/tools/billing-usage";
import {registerOptimizeImageTool} from "@/lib/mcp/tools/optimize-image";

export function createMcpServer() {
    const server = new McpServer({
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
    });

    registerOptimizeImageTool(server);
    registerBillingUsageTool(server);

    return server;
}
