"use client";

import { useState } from "react";
import { ArrowUpRight, Bell, CheckCircle2, Clock3, FolderKanban, Search, Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const metricCards = [
  {
    title: "Ingresos del mes",
    value: "$12,480",
    delta: "+18.4%",
    detail: "vs. mes anterior",
    icon: Sparkles,
  },
  {
    title: "Proyectos activos",
    value: "14",
    delta: "+3",
    detail: "nuevos esta semana",
    icon: FolderKanban,
  },
  {
    title: "Leads calificados",
    value: "36",
    delta: "+9.1%",
    detail: "tasa de cierre 41%",
    icon: Users,
  },
  {
    title: "Tareas vencen hoy",
    value: "5",
    delta: "-2",
    detail: "respecto a ayer",
    icon: Clock3,
  },
] as const;

const pipeline = [
  { stage: "Descubrimiento", value: 18, color: "bg-chart-1" },
  { stage: "Propuesta", value: 12, color: "bg-chart-2" },
  { stage: "Negociación", value: 8, color: "bg-chart-4" },
  { stage: "Cierre", value: 4, color: "bg-chart-3" },
] as const;

const recentLeads = [
  { name: "Marta Vidal", service: "Automatización IA", budget: "$3,200", status: "Aprobado" },
  { name: "Luis Herrera", service: "App Interna", budget: "$5,000", status: "En revisión" },
  { name: "Paula Ríos", service: "Consultoría Datos", budget: "$1,800", status: "Nuevo" },
  { name: "Nubia Labs", service: "RAG Empresarial", budget: "$9,400", status: "Aprobado" },
] as const;

const teamProgress = [
  { initials: "DV", name: "David Br.", role: "Arquitectura", load: 82 },
  { initials: "AL", name: "Andrea L.", role: "Frontend", load: 67 },
  { initials: "MC", name: "Mario C.", role: "Data / ETL", load: 54 },
  { initials: "JR", name: "Julia R.", role: "QA", load: 41 },
] as const;

const timeline = [
  { title: "Deploy a producción", time: "Hace 18 min", tag: "DevOps" },
  { title: "Lead aprobado: Nubia Labs", time: "Hace 32 min", tag: "Ventas" },
  { title: "Documento técnico actualizado", time: "Hace 1 h", tag: "Producto" },
  { title: "Nueva tarea: Integración API", time: "Hace 2 h", tag: "Backoffice" },
] as const;

const dashboardTabs = [
  { value: "overview", label: "Resumen", icon: Sparkles },
  { value: "team", label: "Equipo", icon: Users },
  { value: "activity", label: "Actividad", icon: Clock3 },
] as const;

type DashboardTab = (typeof dashboardTabs)[number]["value"];

function statusVariant(status: string) {
  if (status === "Aprobado") {
    return "default";
  }
  if (status === "En revisión") {
    return "secondary";
  }
  return "outline";
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Panel operativo</p>
              <h1 className="text-xl font-semibold md:text-2xl">Dashboard de Gestión</h1>
            </div>

            <div className="hidden items-center gap-1 rounded-lg border border-border/70 bg-card/70 p-1 md:flex">
              {dashboardTabs.map((tab) => (
                <Button
                  key={tab.value}
                  variant={activeTab === tab.value ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveTab(tab.value)}
                  aria-current={activeTab === tab.value ? "page" : undefined}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Notificaciones">
              <Bell className="h-4 w-4" />
            </Button>
            <Button className="gap-2">
              Exportar
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente, proyecto o tarea..." className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Filtrar</Button>
            <Button variant="secondary">Nuevo proyecto</Button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center justify-between">
                  <span>{metric.title}</span>
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                </CardDescription>
                <CardTitle className="text-2xl">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{metric.delta}</Badge>
                  <span className="text-muted-foreground">{metric.detail}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)} className="space-y-4">
          <TabsList className="md:hidden">
            {dashboardTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Pipeline comercial</CardTitle>
                  <CardDescription>Estado actual por etapa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pipeline.map((item) => (
                    <div key={item.stage} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.stage}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value * 5}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Leads recientes</CardTitle>
                  <CardDescription>Últimos ingresos desde formularios y referidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Presupuesto</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLeads.map((lead) => (
                        <TableRow key={`${lead.name}-${lead.service}`}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.service}</TableCell>
                          <TableCell>{lead.budget}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Carga del equipo</CardTitle>
                <CardDescription>Capacidad estimada para la semana</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {teamProgress.map((member) => (
                  <div key={member.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{member.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.load}%</p>
                    </div>
                    <Progress value={member.load} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actividad reciente</CardTitle>
                <CardDescription>Eventos más relevantes del día</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={event.title}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-chart-2" />
                        <div>
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.time}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{event.tag}</Badge>
                    </div>
                    {index < timeline.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
