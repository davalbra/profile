<script setup lang="ts">
import { ArrowRight, Menu, Moon, Sun } from "lucide-vue-next";
import { computed, ref } from "vue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  credencialesDashboard,
  navegacionDashboard,
} from "@/lib/dashboard/dashboard.data";

/** Services, Components */
const autenticacion = useAuth();
const { isDark: modoOscuro, toggleTheme: alternarModoTema } = useThemeMode();

/** DefineModel, Ref, Computed */
const menuMovilAbierto = ref(false);

const correoUsuario = computed(
  () => autenticacion.user.value?.email || "Sesión no activa",
);

/** Functions */
const cerrarMenuMovil = () => {
  menuMovilAbierto.value = false;
};

const alternarTema = () => {
  alternarModoTema();
};
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-background text-foreground">
    <div class="pointer-events-none fixed inset-0 dashboard-aurora" />
    <div class="pointer-events-none fixed inset-0 dashboard-grid opacity-45" />

    <div
      class="relative mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8 lg:py-6"
    >
      <aside class="hidden lg:block">
        <Card
          class="sticky top-6 h-[calc(100vh-3rem)] overflow-hidden border-white/10 bg-black/30 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"
        >
          <CardHeader class="pb-3">
            <div class="flex items-center gap-3">
              <Avatar class="size-12 border border-white/10">
                <AvatarFallback class="bg-primary/15 text-primary">{{
                  credencialesDashboard.iniciales
                }}</AvatarFallback>
              </Avatar>
              <div>
                <NuxtLink
                  to="/"
                  class="text-xl font-bold tracking-tight text-white"
                >
                  {{ credencialesDashboard.titulo
                  }}<span class="text-primary">.</span>
                </NuxtLink>
                <p class="text-sm text-muted-foreground">
                  {{ credencialesDashboard.subtitulo }}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              class="mt-4 w-fit border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
            >
              {{ credencialesDashboard.sello }}
            </Badge>
          </CardHeader>

          <CardContent class="flex min-h-0 flex-1 flex-col px-3">
            <ScrollArea class="min-h-0 flex-1 pr-2">
              <nav class="space-y-2">
                <NuxtLink
                  v-for="item in navegacionDashboard"
                  :key="item.ruta"
                  :to="item.ruta"
                  class="group flex min-h-12 items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-white"
                  active-class="border-cyan-300/25 bg-cyan-300/15 text-white shadow-lg shadow-cyan-950/20"
                >
                  <span
                    class="grid size-9 place-items-center rounded-xl bg-white/5 text-cyan-100 transition group-hover:bg-cyan-300/15"
                  >
                    <component :is="item.icono" class="size-4" />
                  </span>
                  {{ item.etiqueta }}
                </NuxtLink>
              </nav>

              <Separator class="my-6 bg-white/10" />

              <div
                class="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div class="flex items-center gap-3">
                  <component
                    :is="credencialesDashboard.indicador"
                    class="size-5 text-emerald-200"
                  />
                  <p class="text-sm font-semibold text-white">
                    {{ correoUsuario }}
                  </p>
                </div>
                <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {{ credencialesDashboard.descripcion }}
                </p>
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter
            class="grid gap-3 border-t border-white/10 bg-white/[0.03] p-4"
          >
            <Button as-child class="rounded-2xl">
              <NuxtLink :to="credencialesDashboard.rutaPrimaria">
                {{ credencialesDashboard.accionPrimaria }}
                <ArrowRight class="size-4" />
              </NuxtLink>
            </Button>
            <div class="grid grid-cols-[1fr_auto] gap-2">
              <Button
                as-child
                variant="outline"
                class="rounded-2xl border-white/10 bg-white/5"
              >
                <NuxtLink :to="credencialesDashboard.rutaSecundaria">
                  {{ credencialesDashboard.accionSecundaria }}
                </NuxtLink>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="rounded-2xl border-white/10 bg-white/5"
                @click="alternarTema"
              >
                <Sun v-if="modoOscuro" class="size-4" />
                <Moon v-else class="size-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </aside>

      <div class="min-w-0">
        <header
          class="mb-4 flex items-center justify-between rounded-3xl border border-white/10 bg-black/25 p-3 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl lg:hidden"
        >
          <NuxtLink to="/" class="text-lg font-bold tracking-tight text-white">
            {{ credencialesDashboard.titulo
            }}<span class="text-primary">.</span>
          </NuxtLink>

          <Sheet v-model:open="menuMovilAbierto">
            <SheetTrigger as-child>
              <Button
                variant="outline"
                size="icon"
                class="rounded-2xl border-white/10 bg-white/5"
              >
                <Menu class="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              class="border-white/10 bg-slate-950/95 text-white backdrop-blur-xl"
            >
              <SheetHeader>
                <SheetTitle class="text-white">{{
                  credencialesDashboard.subtitulo
                }}</SheetTitle>
                <SheetDescription class="text-slate-400">
                  {{ credencialesDashboard.descripcion }}
                </SheetDescription>
              </SheetHeader>

              <nav class="mt-6 space-y-2">
                <NuxtLink
                  v-for="item in navegacionDashboard"
                  :key="item.ruta"
                  :to="item.ruta"
                  class="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200"
                  active-class="border-cyan-300/25 bg-cyan-300/15 text-white"
                  @click="cerrarMenuMovil"
                >
                  <component :is="item.icono" class="size-4 text-cyan-100" />
                  {{ item.etiqueta }}
                </NuxtLink>
              </nav>

              <Separator class="my-6 bg-white/10" />

              <Button
                type="button"
                variant="outline"
                class="w-full rounded-2xl border-white/10 bg-white/5"
                @click="alternarTema"
              >
                <Sun v-if="modoOscuro" class="size-4" />
                <Moon v-else class="size-4" />
                Cambiar tema
              </Button>
            </SheetContent>
          </Sheet>
        </header>

        <main class="min-w-0 pb-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
