import { computed, onBeforeUnmount, onMounted, ref } from "vue"

const DURACION_FOTO_MS = 4000
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

type Foto = {
  src: string
  borde: Borde
  numero: number
}

type Grupo = {
  orden: number
  fotos: Foto[]
}

function agruparRecuerdos(recuerdos: readonly string[], capacidad: number) {
  const grupos: Grupo[] = []
  let inicio = 0
  const totalTandas = Math.ceil(recuerdos.length / capacidad)
  for (let indice = 0; indice < totalTandas; indice++) {
    const restantes = totalTandas - indice
    const cantidad = Math.ceil((recuerdos.length - inicio) / restantes)
    const bordes = BORDES_POR_TANDA[indice % BORDES_POR_TANDA.length]!
    const fotos = recuerdos
      .slice(inicio, inicio + cantidad)
      .map((src, posicion) => ({
        src,
        numero: inicio + posicion + 1,
        borde: bordes[posicion]!,
      }))

    grupos.push({ orden: indice, fotos })
    inicio += cantidad
  }

  return grupos
}

export function useGaleriaMilky(recuerdos: readonly string[]) {
  const activa = ref(false)
  const movil = ref(false)
  const ordenActivo = ref<number>()
  const descartadas = ref(new Set<string>())
  const desprendidas = ref(new Set<string>())
  const interacciones = new Set<string>()
  let consulta: MediaQueryList | undefined
  let temporizador: ReturnType<typeof setTimeout> | undefined

  const grupos = computed(() =>
    agruparRecuerdos(recuerdos, movil.value ? 2 : 3),
  )
  const navegables = computed(() =>
    grupos.value.filter(({ fotos }) =>
      fotos.some(({ src }) => !descartadas.value.has(src)),
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
    interacciones.clear()
    desprendidas.value.clear()
    ordenActivo.value = siguiente
  }

  function programarSiguienteRecuerdo() {
    cancelarTemporizador()
    if (!activa.value || interacciones.size > 0 || navegables.value.length < 2)
      return

    temporizador = setTimeout(avanzar, DURACION_FOTO_MS)
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
      fotosVisibles.value.find(({ src }) => interacciones.has(src))?.src ??
      fotosVisibles.value[0]?.src
    cancelarTemporizador()
    desprendidas.value.clear()
    movil.value = evento.matches

    if (activa.value) {
      ordenActivo.value = (
        navegables.value.find(({ fotos }) =>
          fotos.some(({ src }) => src === ancla),
        ) ?? navegables.value[0]
      )?.orden
      const visibles = new Set(fotosVisibles.value.map(({ src }) => src))
      for (const src of interacciones) {
        if (!visibles.has(src)) interacciones.delete(src)
      }
      programarSiguienteRecuerdo()
    }
  }

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
    iniciar,
    cerrar,
    programarSiguienteRecuerdo,
    iniciarInteraccion,
    finalizarInteraccion,
    desprenderFoto,
    descartarFoto,
  }
}
