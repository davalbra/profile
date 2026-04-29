<script setup lang="ts">
import { KeyRound, ServerCog, TerminalSquare } from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

definePageMeta({
  layout: "dashboard",
});

const route = useRoute();

const docsByTool = {
  optimize: {
    label: "optimize_image",
    title: "MCP: Optimizar imágenes",
    description:
      "Expone la optimización AVIF de imágenes por URL como herramienta MCP.",
    payloadExample: {
      imageUrl: "https://example.com/foto.jpg",
      fileName: "foto.jpg",
      quality: 52,
      effort: 4,
      maxDimension: 2400,
      returnBase64: false,
    },
  },
  billing: {
    label: "billing_usage",
    title: "MCP: Billing usage",
    description:
      "Expone la consulta de costos Firebase/Gemini como herramienta MCP.",
    payloadExample: {
      service: "firebase",
      period: "30d",
    },
  },
} as const;

const currentTool = computed(() => {
  const raw = Array.isArray(route.params.tool)
    ? route.params.tool[0]
    : route.params.tool;
  return raw === "billing" ? docsByTool.billing : docsByTool.optimize;
});

const example = computed(() =>
  JSON.stringify(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: currentTool.value.label,
        arguments: currentTool.value.payloadExample,
      },
    },
    null,
    2,
  ),
);
</script>

<template>
  <section class="space-y-6">
    <Card
      class="border-white/10 bg-card/80 shadow-xl shadow-cyan-950/10 backdrop-blur-xl"
    >
      <CardHeader>
        <div class="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            class="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          >
            <ServerCog class="size-3" />
            MCP
          </Badge>
          <Badge variant="secondary">
            {{ currentTool.label }}
          </Badge>
        </div>
        <CardTitle class="text-3xl font-bold tracking-tight lg:text-4xl">
          {{ currentTool.title }}
        </CardTitle>
        <CardDescription class="max-w-3xl text-sm leading-relaxed">
          {{ currentTool.description }}
        </CardDescription>
      </CardHeader>
    </Card>

    <div class="flex flex-wrap gap-2">
      <Button
        as-child
        :variant="
          route.params.tool === 'optimize' || !route.params.tool
            ? 'default'
            : 'outline'
        "
        class="rounded-xl"
      >
        <NuxtLink to="/dashboard/mcp/optimize">optimize_image</NuxtLink>
      </Button>
      <Button
        as-child
        :variant="route.params.tool === 'billing' ? 'default' : 'outline'"
        class="rounded-xl"
      >
        <NuxtLink to="/dashboard/mcp/billing">billing_usage</NuxtLink>
      </Button>
    </div>

    <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
      <CardHeader>
        <CardDescription>Endpoint MCP</CardDescription>
        <CardTitle class="font-mono text-base">/api/mcp</CardTitle>
      </CardHeader>
    </Card>

    <Card class="border-white/10 bg-card/80 backdrop-blur-xl">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <TerminalSquare class="size-5 text-cyan-300" />
          Ejemplo JSON-RPC
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre
          class="overflow-x-auto rounded-2xl border border-white/10 bg-black/35 p-4 text-xs text-slate-100"
          >{{ example }}</pre
        >
      </CardContent>
    </Card>

    <Alert class="border-cyan-300/20 bg-cyan-300/10">
      <KeyRound class="size-4" />
      <AlertTitle>Autenticación opcional</AlertTitle>
      <AlertDescription>
        Si defines <code>MCP_SERVER_TOKEN</code>, envía
        <code> Authorization: Bearer &lt;token&gt;</code> o
        <code> X-MCP-Token</code> en cada request.
      </AlertDescription>
    </Alert>
  </section>
</template>
