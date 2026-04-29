<script setup lang="ts">
import { ArrowRight, ChevronDown, Home, Moon, Sun } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  credencialesDashboard,
  navegacionDashboard,
} from "@/lib/dashboard/dashboard.data";
import { cn } from "@/lib/utils";

const ruta = useRoute();
const autenticacion = useAuth();
const { isDark: modoOscuro, toggleTheme: alternarModoTema } = useThemeMode();
const seccionesAbiertas = ref<Record<string, boolean>>({});

const correoUsuario = computed(
  () => autenticacion.user.value?.email || "Sesión no activa",
);

const obtenerPrefijoSeccion = (rutaNavegacion: string) => {
  const segmentos = rutaNavegacion.split("/").filter(Boolean);
  if (segmentos.length < 2) {
    return rutaNavegacion;
  }

  return `/${segmentos[0]}/${segmentos[1]}`;
};

const estaRutaActiva = (rutaNavegacion: string) => {
  if (rutaNavegacion === "/dashboard") {
    return ruta.path === "/dashboard";
  }

  return ruta.path.startsWith(obtenerPrefijoSeccion(rutaNavegacion));
};

const estaSubRutaActiva = (rutaNavegacion: string) => {
  return ruta.path === rutaNavegacion;
};

const alternarSeccion = (clave: string) => {
  seccionesAbiertas.value = {
    ...seccionesAbiertas.value,
    [clave]: !seccionesAbiertas.value[clave],
  };
};

watch(
  () => ruta.path,
  () => {
    const siguientes = { ...seccionesAbiertas.value };
    for (const item of navegacionDashboard) {
      if (item.subsecciones?.length && estaRutaActiva(item.ruta)) {
        siguientes[item.ruta] = true;
      }
    }
    seccionesAbiertas.value = siguientes;
  },
  { immediate: true },
);
</script>

<template>
  <SidebarProvider
    class="relative min-h-screen overflow-hidden bg-background text-foreground"
  >
    <div class="pointer-events-none fixed inset-0 dashboard-aurora" />
    <div class="pointer-events-none fixed inset-0 dashboard-grid opacity-45" />

    <Sidebar
      collapsible="icon"
      variant="inset"
      class="border-white/10 bg-sidebar/90 text-sidebar-foreground backdrop-blur-xl"
    >
      <SidebarHeader class="border-b border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton as-child size="lg" tooltip="Inicio">
              <NuxtLink to="/" class="gap-3">
                <Avatar class="size-10 rounded-xl border border-sidebar-border">
                  <AvatarFallback
                    class="rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"
                  >
                    {{ credencialesDashboard.iniciales }}
                  </AvatarFallback>
                </Avatar>
                <span class="grid text-left">
                  <span class="truncate text-base font-bold">
                    {{ credencialesDashboard.titulo }}
                  </span>
                  <span class="truncate text-xs text-sidebar-foreground/65">
                    {{ credencialesDashboard.subtitulo }}
                  </span>
                </span>
              </NuxtLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in navegacionDashboard" :key="item.ruta">
                <SidebarMenuButton
                  v-if="!item.subsecciones?.length"
                  as-child
                  :is-active="estaRutaActiva(item.ruta)"
                  :tooltip="item.etiqueta"
                >
                  <NuxtLink :to="item.ruta">
                    <component :is="item.icono" />
                    <span>{{ item.etiqueta }}</span>
                  </NuxtLink>
                </SidebarMenuButton>

                <template v-else>
                  <SidebarMenuButton
                    type="button"
                    :is-active="estaRutaActiva(item.ruta)"
                    :tooltip="item.etiqueta"
                    @click="alternarSeccion(item.ruta)"
                  >
                    <component :is="item.icono" />
                    <span>{{ item.etiqueta }}</span>
                    <ChevronDown
                      :class="
                        cn(
                          'ml-auto size-4 transition-transform',
                          seccionesAbiertas[item.ruta] && 'rotate-180',
                        )
                      "
                    />
                  </SidebarMenuButton>

                  <SidebarMenuSub v-if="seccionesAbiertas[item.ruta]">
                    <SidebarMenuSubItem
                      v-for="subseccion in item.subsecciones"
                      :key="subseccion.ruta"
                    >
                      <SidebarMenuSubButton
                        as-child
                        :is-active="estaSubRutaActiva(subseccion.ruta)"
                      >
                        <NuxtLink :to="subseccion.ruta">
                          <component :is="subseccion.icono" />
                          <span>{{ subseccion.etiqueta }}</span>
                        </NuxtLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </template>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter class="border-t border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <SidebarMenuButton size="lg" tooltip="Cuenta">
                  <Avatar class="size-9 rounded-lg">
                    <AvatarFallback class="rounded-lg bg-sidebar-accent">
                      {{ credencialesDashboard.iniciales }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-medium">{{
                      credencialesDashboard.sello
                    }}</span>
                    <span class="truncate text-xs text-sidebar-foreground/65">
                      {{ correoUsuario }}
                    </span>
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" class="w-64">
                <DropdownMenuLabel class="grid gap-1">
                  <span>{{ credencialesDashboard.subtitulo }}</span>
                  <span class="text-xs font-normal text-muted-foreground">
                    {{ correoUsuario }}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem as-child>
                  <NuxtLink :to="credencialesDashboard.rutaPrimaria">
                    <ArrowRight class="size-4" />
                    {{ credencialesDashboard.accionPrimaria }}
                  </NuxtLink>
                </DropdownMenuItem>
                <DropdownMenuItem as-child>
                  <NuxtLink :to="credencialesDashboard.rutaSecundaria">
                    <Home class="size-4" />
                    {{ credencialesDashboard.accionSecundaria }}
                  </NuxtLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="alternarModoTema">
                  <Sun v-if="modoOscuro" class="size-4" />
                  <Moon v-else class="size-4" />
                  Cambiar tema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>

    <SidebarInset class="relative bg-transparent">
      <header
        class="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-background/70 px-4 backdrop-blur-xl"
      >
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="h-5 bg-white/10" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-foreground">
            {{ credencialesDashboard.subtitulo }}
          </p>
          <p class="truncate text-xs text-muted-foreground">
            {{ credencialesDashboard.descripcion }}
          </p>
        </div>
        <Badge
          variant="outline"
          class="hidden border-cyan-300/25 bg-cyan-300/10 text-cyan-100 sm:inline-flex"
        >
          {{ credencialesDashboard.sello }}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="rounded-xl border-white/10 bg-white/5"
          @click="alternarModoTema"
        >
          <Sun v-if="modoOscuro" class="size-4" />
          <Moon v-else class="size-4" />
          <span class="sr-only">Cambiar tema</span>
        </Button>
      </header>

      <main class="relative mx-auto w-full max-w-7xl p-4 pb-8 lg:p-6">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
