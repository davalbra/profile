import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"

const DURACION_FOTO_MS = 4000
const CLAVE_DESCARTES = "milky:fotos-descartadas"
const descartesEnMemoria = new Set<string>()

type Foto = {
  src: string
  posicion: number
  numero: number
}

type Grupo = {
  orden: number
  fotos: Foto[]
  video?: string
}

function agruparRecuerdos(recuerdos: readonly string[], capacidad: number) {
  const fotos: Omit<Foto, "posicion">[] = []
  const grupos: Grupo[] = []

  recuerdos.forEach((src, orden) => {
    if (/\.mp4$/i.test(src)) {
      grupos.push({ orden, fotos: [], video: src })
    } else {
      fotos.push({ src, numero: orden + 1 })
    }
  })

  let inicio = 0
  for (
    let restantes = Math.ceil(fotos.length / capacidad);
    restantes > 0;
    restantes--
  ) {
    const cantidad = Math.ceil((fotos.length - inicio) / restantes)
    const tanda = fotos
      .slice(inicio, inicio + cantidad)
      .map((foto, posicion) => ({ ...foto, posicion }))

    grupos.push({ orden: tanda[0]!.numero - 1, fotos: tanda })
    inicio += cantidad
  }

  return grupos.sort((a, b) => a.orden - b.orden)
}

export function useGaleriaMilky(recuerdos: readonly string[]) {
  const activa = ref(false)
  const movil = ref(false)
  const ordenActivo = ref<number>()
  const videoActual = ref<HTMLVideoElement>()
  const descartadas = ref(new Set<string>())
  const desprendidas = ref(new Set<string>())
  const interacciones = new Set<string>()
  let consulta: MediaQueryList | undefined
  let temporizador: ReturnType<typeof setTimeout> | undefined

  const grupos = computed(() =>
    agruparRecuerdos(recuerdos, movil.value ? 2 : 3),
  )
  const navegables = computed(() =>
    grupos.value.filter(
      (grupo) =>
        grupo.video ||
        grupo.fotos.some(({ src }) => !descartadas.value.has(src)),
    ),
  )
  const grupoActivo = computed(() =>
    navegables.value.find(({ orden }) => orden === ordenActivo.value),
  )
  const fotosVisibles = computed(
    () =>
      grupoActivo.value?.fotos.filter(
        ({ src }) =>
          !descartadas.value.has(src) && !desprendidas.value.has(src),
      ) ?? [],
  )
  const video = computed(() => grupoActivo.value?.video)

  function cancelarTemporizador() {
    clearTimeout(temporizador)
    temporizador = undefined
  }

  function iniciar() {
    cerrar()
    activa.value = true
    ordenActivo.value = navegables.value[0]?.orden
  }

  function cerrar() {
    activa.value = false
    cancelarTemporizador()
    videoActual.value?.pause()
    interacciones.clear()
    desprendidas.value.clear()
    ordenActivo.value = undefined
  }

  function avanzar() {
    const anterior = ordenActivo.value
    if (!activa.value || anterior === undefined) return

    cancelarTemporizador()
    const siguiente = (
      navegables.value.find(({ orden }) => orden > anterior) ??
      navegables.value[0]
    )?.orden
    if (anterior !== siguiente) videoActual.value?.pause()
    interacciones.clear()
    desprendidas.value.clear()
    ordenActivo.value = siguiente
  }

  function programarSiguienteRecuerdo() {
    cancelarTemporizador()
    if (!activa.value || interacciones.size > 0) return

    if (video.value) {
      const elemento = videoActual.value
      if (elemento?.getAttribute("src") !== video.value) return

      if (!elemento.error) {
        if (elemento.ended) {
          avanzar()
        } else {
          // Los controles siguen disponibles si el navegador exige un gesto.
          void elemento.play().catch(() => {})
        }
        return
      }
    } else if (fotosVisibles.value.length === 0) {
      return
    }

    temporizador = setTimeout(avanzar, DURACION_FOTO_MS)
  }

  function terminarVideo(evento: Event) {
    if (
      evento.currentTarget === videoActual.value &&
      videoActual.value?.getAttribute("src") === video.value
    ) {
      avanzar()
    }
  }

  function iniciarInteraccion(src: string) {
    if (!activa.value || !fotosVisibles.value.some((foto) => foto.src === src))
      return

    interacciones.add(src)
    cancelarTemporizador()
  }

  function finalizarInteraccion(src: string) {
    if (interacciones.delete(src)) programarSiguienteRecuerdo()
  }

  function continuarTrasQuitarFoto(src: string) {
    if (fotosVisibles.value.length === 0) {
      avanzar()
    } else {
      interacciones.delete(src)
      programarSiguienteRecuerdo()
    }
  }

  function desprenderFoto(src: string) {
    if (!activa.value || !fotosVisibles.value.some((foto) => foto.src === src))
      return

    desprendidas.value.add(src)
    continuarTrasQuitarFoto(src)
  }

  function descartarFoto(src: string) {
    if (!activa.value || !fotosVisibles.value.some((foto) => foto.src === src))
      return

    descartadas.value.add(src)
    descartesEnMemoria.add(src)
    try {
      window.sessionStorage.setItem(
        CLAVE_DESCARTES,
        JSON.stringify([...descartadas.value]),
      )
    } catch {
      // La galería conserva los descartes en memoria si el navegador bloquea el almacenamiento.
    }

    continuarTrasQuitarFoto(src)
  }

  function ajustarCapacidad(evento: MediaQueryListEvent) {
    const ancla =
      video.value ??
      fotosVisibles.value.find(({ src }) => interacciones.has(src))?.src ??
      fotosVisibles.value[0]?.src
    cancelarTemporizador()
    desprendidas.value.clear()
    movil.value = evento.matches

    if (activa.value) {
      ordenActivo.value = (
        navegables.value.find(
          (grupo) =>
            (ancla !== undefined && grupo.video === ancla) ||
            grupo.fotos.some(({ src }) => src === ancla),
        ) ?? navegables.value[0]
      )?.orden
      const visibles = new Set(fotosVisibles.value.map(({ src }) => src))
      for (const src of interacciones) {
        if (!visibles.has(src)) interacciones.delete(src)
      }
      programarSiguienteRecuerdo()
    }
  }

  watch(
    [video, videoActual],
    () => {
      if (video.value) programarSiguienteRecuerdo()
    },
    { flush: "post" },
  )

  onMounted(() => {
    descartadas.value = new Set(descartesEnMemoria)
    try {
      const guardadas: unknown = JSON.parse(
        window.sessionStorage.getItem(CLAVE_DESCARTES) ?? "[]",
      )
      if (Array.isArray(guardadas)) {
        guardadas.forEach((src: unknown) => {
          if (typeof src === "string") descartadas.value.add(src)
        })
      }
    } catch {
      // Se usan los descartes en memoria si falla la lectura.
    }

    consulta = window.matchMedia("(max-width: 760px)")
    movil.value = consulta.matches
    consulta.addEventListener("change", ajustarCapacidad)
  })

  onBeforeUnmount(() => {
    cerrar()
    consulta?.removeEventListener("change", ajustarCapacidad)
  })

  return {
    fotosVisibles,
    video,
    videoActual,
    iniciar,
    cerrar,
    programarSiguienteRecuerdo,
    terminarVideo,
    iniciarInteraccion,
    finalizarInteraccion,
    desprenderFoto,
    descartarFoto,
  }
}
