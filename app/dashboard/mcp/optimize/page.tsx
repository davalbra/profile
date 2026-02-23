import {McpToolPanel} from "@/components/dashboard/mcp-tool-panel";

export default function DashboardMcpOptimizePage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <McpToolPanel
                    toolName="optimize_image"
                    title="MCP: Optimizar imágenes"
                    description="Expone la optimización AVIF de imágenes como herramienta MCP."
                    payloadExample={{
                        fileName: "foto.jpg",
                        imageBase64: "BASE64_IMAGE_DATA",
                        quality: 52,
                        effort: 4,
                        maxDimension: 2400,
                        returnBase64: false,
                    }}
                />
            </div>
        </div>
    );
}
