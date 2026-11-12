import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue"

const DURACION_FOTO_MS = 4000
const ESPERA_PROGRESO_VIDEO_MS = 8000
const CLAVE_DESCARTES = "milky:fotos-descartadas"
const descartesEnMemoria = new Set<string>()

type Borde = "superior" | "inferior" | "izquierdo" | "derecho"

const BORDES_POR_TANDA: readonly (readonly Borde[])[] = [
  ["izquierdo", "derecho", "superior"],
  ["superior", "inferior", "izquierdo"],
  ["derecho", "inferior", "superior"],
  ["inferior", "izquierdo", "derecho"],
  ["superior", "derecho", "inferior"],
]

type Medio = {
  src: string
  numero: number
  tipo: "foto" | "video"
}

type Sticker = Medio & { borde: Borde }

function barajar<T>(valores: readonly T[]) {
  const mezcla = [...valores]
  for (let indice = mezcla.length - 1; indice > 0; indice--) {
    const elegido = Math.floor(Math.random() * (indice + 1))
    const valor = mezcla[indice]!
    mezcla[indice] = mezcla[elegido]!
    mezcla[elegido] = valor
  }
  return mezcla
}

function agruparRecuerdos(medios: readonly Medio[], capacidad: number) {
  const fotos = medios.filter(({ tipo }) => tipo === "foto")
  const tandas: Medio[][] = medios
    .filter(({ tipo }) => tipo === "video")
    .map((video) => [video])

  let inicio = 0
  const totalTandas = Math.ceil(fotos.length / capacidad)
  for (let restantes = totalTandas; restantes > 0; restantes--) {
    const cantidad = Math.ceil((fotos.length - inicio) / restantes)
    tandas.push(fotos.slice(inicio, inicio + cantidad))
    inicio += cantidad
  }

  return tandas
}

export function useGaleriaMilky(recuerdos: readonly string[]) {
  const medios = recuerdos.map<Medio>((src, indice) => ({
    src,
    numero: indice + 1,
    tipo: /\.mp4$/i.test(src) ? "video" : "foto",
  }))
  const descartados = ref(new Set<string>())
  const desprendidos = ref(new Set<string>())
  const interacciones = new Set<string>()
  const tandaActual = shallowRef<Sticker[]>([])
  let tandasPendientes: Medio[][] = []
  let indiceTanda = 0
  let activa = false
  let entradaLista = false
  let consulta: MediaQueryList | undefined
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let elementoVideo: HTMLVideoElement | null = null
  let reproduciendo = false
  let videoFallido = false
  let intentoVideo = 0

  const mediosVisibles = computed(() =>
    tandaActual.value.filter(
      ({ src }) => !descartados.value.has(src) && !desprendidos.value.has(src),
    ),
  )
  const videoVisible = computed(() =>
    mediosVisibles.value.find(({ tipo }) => tipo === "video"),
  )

  function capacidad() {
    return consulta?.matches ? 2 : 3
  }

  function estaDisponible({ src }: Medio) {
    return !descartados.value.has(src)
  }

  function hayOtraTanda() {
    return medios.some(
      (medio) =>
        estaDisponible(medio) &&
        !tandaActual.value.some(({ src }) => src === medio.src),
    )
  }

  function prepararVuelta(anterior: readonly Sticker[]) {
    const tandas = barajar(
      agruparRecuerdos(barajar(medios.filter(estaDisponible)), capacidad()),
    )
    const fuentesAnteriores = new Set(anterior.map(({ src }) => src))
    const siguiente = tandas.findIndex((tanda) =>
      tanda.every(({ src }) => !fuentesAnteriores.has(src)),
    )
    if (siguiente > 0) {
      tandas.unshift(...tandas.splice(siguiente, 1))
    }
    tandasPendientes = tandas
  }

  function cancelarTemporizador() {
    clearTimeout(temporizador)
    temporizador = undefined
  }

  function detenerVideo() {
    intentoVideo++
    reproduciendo = false
    elementoVideo?.pause()
  }

  function limpiarTanda() {
    cancelarTemporizador()
    detenerVideo()
    elementoVideo = null
    videoFallido = false
    entradaLista = false
    interacciones.clear()
    desprendidos.value.clear()
  }

  function iniciar() {
    cerrar()
    activa = true
    avanzar()
  }

  function cerrar() {
    activa = false
    limpiarTanda()
    tandaActual.value = []
    tandasPendientes = []
    indiceTanda = 0
  }

  function avanzar() {
    if (!activa) return

    const anterior = tandaActual.value
    limpiarTanda()

    tandasPendientes = tandasPendientes.filter((tanda) =>
      tanda.some(estaDisponible),
    )
    if (tandasPendientes.length === 0) prepararVuelta(anterior)

    const bordes = BORDES_POR_TANDA[indiceTanda % BORDES_POR_TANDA.length]!
    indiceTanda++
    tandaActual.value =
      tandasPendientes
        .shift()
        ?.map((medio, posicion) => ({ ...medio, borde: bordes[posicion]! })) ??
      []
  }

  function vigilarVideo(src: string, elemento: HTMLVideoElement) {
    const tiempoAnterior = elemento.currentTime
    temporizador = setTimeout(() => {
      temporizador = undefined
      if (!reproduciendo || elementoVideo !== elemento) return

      if (elemento.ended) {
        terminarVideo(src)
      } else if (elemento.currentTime !== tiempoAnterior) {
        vigilarVideo(src, elemento)
      } else {
        fallarVideo(src)
      }
    }, ESPERA_PROGRESO_VIDEO_MS)
  }

  function programarSiguienteRecuerdo() {
    entradaLista = true
    if (!activa || mediosVisibles.value.length === 0) return

    const video = videoVisible.value
    if (video && !videoFallido) {
      const elemento = elementoVideo
      if (!elemento || reproduciendo) return

      if (elemento.error) {
        fallarVideo(video.src)
        return
      }
      if (elemento.ended) {
        terminarVideo(video.src)
        return
      }

      elemento.muted = true
      reproduciendo = true
      const intento = ++intentoVideo
      vigilarVideo(video.src, elemento)
      void elemento.play().catch(() => {
        if (intento === intentoVideo) fallarVideo(video.src)
      })
      return
    }

    if (interacciones.size > 0) return

    cancelarTemporizador()
    if (hayOtraTanda()) {
      temporizador = setTimeout(avanzar, DURACION_FOTO_MS)
    }
  }

  function registrarVideo(src: string, elemento: HTMLVideoElement | null) {
    if (videoVisible.value?.src !== src || elementoVideo === elemento) return

    cancelarTemporizador()
    detenerVideo()
    elementoVideo = elemento
    if (elemento && entradaLista) programarSiguienteRecuerdo()
  }

  function terminarVideo(src: string) {
    if (videoVisible.value?.src !== src || videoFallido) return

    reproduciendo = false
    cancelarTemporizador()
    if (interacciones.size === 0 && hayOtraTanda()) avanzar()
  }

  function fallarVideo(src: string) {
    if (videoVisible.value?.src !== src || videoFallido) return

    videoFallido = true
    cancelarTemporizador()
    detenerVideo()
    if (elementoVideo && elementoVideo.currentTime > 0) elementoVideo.load()
    if (entradaLista) programarSiguienteRecuerdo()
  }

  function iniciarInteraccion(src: string) {
    if (!mediosVisibles.value.some((medio) => medio.src === src)) return

    interacciones.add(src)
    if (!reproduciendo) cancelarTemporizador()
  }

  function finalizarInteraccion(src: string) {
    if (interacciones.delete(src)) programarSiguienteRecuerdo()
  }

  function continuarTrasQuitarMedio(src: string) {
    interacciones.delete(src)
    if (mediosVisibles.value.length === 0) {
      if (hayOtraTanda()) {
        avanzar()
      } else {
        limpiarTanda()
        tandaActual.value = []
      }
    } else {
      programarSiguienteRecuerdo()
    }
  }

  function desprenderFoto(src: string) {
    if (!mediosVisibles.value.some((medio) => medio.src === src)) return

    desprendidos.value.add(src)
    continuarTrasQuitarMedio(src)
  }

  function descartarFoto(src: string) {
    if (!mediosVisibles.value.some((medio) => medio.src === src)) return

    descartados.value.add(src)
    descartesEnMemoria.add(src)
    try {
      window.sessionStorage.setItem(
        CLAVE_DESCARTES,
        JSON.stringify([...descartados.value]),
      )
    } catch {
      // La galería conserva los descartes en memoria si el navegador bloquea el almacenamiento.
    }

    continuarTrasQuitarMedio(src)
  }

  function ajustarCapacidad() {
    if (!activa) return

    const limite = capacidad()
    tandasPendientes = barajar(
      agruparRecuerdos(tandasPendientes.flat().filter(estaDisponible), limite),
    )

    if (mediosVisibles.value.length <= limite) return

    const prioridad = [...mediosVisibles.value].sort(
      (a, b) =>
        Number(interacciones.has(b.src)) - Number(interacciones.has(a.src)),
    )
    const conservados = new Set(
      prioridad.slice(0, limite).map(({ src }) => src),
    )
    tandaActual.value = tandaActual.value.filter(({ src }) =>
      conservados.has(src),
    )
    for (const src of interacciones) {
      if (!conservados.has(src)) interacciones.delete(src)
    }
    programarSiguienteRecuerdo()
  }

  onMounted(() => {
    descartados.value = new Set(descartesEnMemoria)
    try {
      const guardados: unknown = JSON.parse(
        window.sessionStorage.getItem(CLAVE_DESCARTES) ?? "[]",
      )
      if (Array.isArray(guardados)) {
        guardados.forEach((src: unknown) => {
          if (typeof src === "string") descartados.value.add(src)
        })
      }
    } catch {
      // Se usan los descartes en memoria si falla la lectura.
    }

    consulta = window.matchMedia("(max-width: 760px)")
    consulta.addEventListener("change", ajustarCapacidad)
  })

  onBeforeUnmount(() => {
    cerrar()
    consulta?.removeEventListener("change", ajustarCapacidad)
  })

  return {
    mediosVisibles,
    iniciar,
    cerrar,
    programarSiguienteRecuerdo,
    iniciarInteraccion,
    finalizarInteraccion,
    desprenderFoto,
    descartarFoto,
    registrarVideo,
    terminarVideo,
    fallarVideo,
  }
}
