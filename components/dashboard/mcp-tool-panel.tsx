import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";

type McpToolPanelProps = {
    title: string;
    description: string;
    toolName: string;
    payloadExample: Record<string, unknown>;
};

export function McpToolPanel({title, description, toolName, payloadExample}: McpToolPanelProps) {
    const endpoint = "/api/mcp";
    const example = JSON.stringify(
        {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: toolName,
                arguments: payloadExample,
            },
        },
        null,
        2,
    );

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{title}</CardTitle>
                    <Badge variant="outline">{toolName}</Badge>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Endpoint MCP</p>
                    <p className="mt-1 font-mono text-sm">{endpoint}</p>
                </div>
                <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Ejemplo JSON-RPC</p>
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{example}</pre>
                </div>
                <p className="text-sm text-muted-foreground">
                    Si defines <code>MCP_SERVER_TOKEN</code>, envía <code>Authorization: Bearer &lt;token&gt;</code> o{" "}
                    <code>X-MCP-Token</code> en cada request.
                </p>
            </CardContent>
        </Card>
    );
}
