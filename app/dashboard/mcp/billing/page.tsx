import {McpToolPanel} from "@/components/dashboard/mcp-tool-panel";

export default function DashboardMcpBillingPage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <McpToolPanel
                    toolName="billing_usage"
                    title="MCP: Billing usage"
                    description="Expone la consulta de costos Firebase/Gemini como herramienta MCP."
                    payloadExample={{
                        service: "firebase",
                        period: "30d",
                    }}
                />
            </div>
        </div>
    );
}
