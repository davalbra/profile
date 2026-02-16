import { ArrowUpRight, Bell } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Panel operativo</p>
          <h1 className="text-base font-medium">Dashboard de Gestión</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <Button size="icon" variant="ghost" aria-label="Notificaciones">
            <Bell className="h-4 w-4" />
          </Button>
          <Button size="sm" className="gap-2">
            Exportar
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
