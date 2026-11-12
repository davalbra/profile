<script setup lang="ts">
import {
  avanzarSticker,
  lanzarHaciaBordeSuperior,
  type CuerpoSticker,
  type EntornoSticker,
  type ObstaculoSticker,
} from "@/utils/fisicaStickersMilky"

const props = defineProps<{
  imagen: string
  origen: { x: number; y: number } | null
}>()

const MAX_LLUVIA_ACTIVA = 12
const carriles = [0.08, 0.84, 0.91, 0.52, 0.15, 0.68, 0.31, 0.93, 0.57, 0.06]
const destinosSuperiores = [0.18, 0.7, 0.34, 0.54, 0.86, 0.28, 0.62, 0.44]
const disparos = [
  [-620, -300],
  [230, -505],
  [525, -345],
  [-355, -475],
  [-520, -150],
  [-100, -570],
  [460, -145],
  [115, -390],
  [-675, -410],
  [645, -230],
  [-250, -535],
  [320, -580],
  [-430, -320],
  [390, -315],
  [-170, -230],
  [170, -190],
  [-565, -500],
  [580, -450],
  [-65, -445],
  [65, -310],
] as const
const lanzamientos = Array.from(
  { length: disparos.length + 4 },
  (_, indice) => ({
    motivo: indice % 8,
    carril: carriles[indice % carriles.length]!,
    tamano: 65 + ((indice * 7) % 20),
    disparo: disparos[indice] ?? null,
    destinoSuperior:
      indice % 2 === 1 ? destinosSuperiores[Math.floor(indice / 2)] : undefined,
  }),
)

type Arrastre = { puntero: number; desfaseX: number; desfaseY: number }
type Sticker = CuerpoSticker & {
  elemento: HTMLDivElement
  lanzamiento: (typeof lanzamientos)[number]
  activo: boolean
  primerVuelo: boolean
  espera: number
  tamano: number
  arrastre: Arrastre | null
}

const capa = ref<HTMLDivElement>()
const entorno: EntornoSticker = { ancho: 0, alto: 0, obstaculos: [] }
let stickers: Sticker[] = []
let movimientoReducido: MediaQueryList | undefined
let cuadro: number | undefined
let anterior: number | undefined
let siguienteMedicion = 0

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.max(minimo, Math.min(valor, maximo))
}

function pintar(sticker: Sticker) {
  const mitad = sticker.tamano / 2
  sticker.elemento.style.transform = `translate3d(${sticker.x - mitad}px, ${sticker.y - mitad}px, 0) rotate(${sticker.giro}deg)`
}

function medirEntorno() {
  const ancho = window.innerWidth
  if (entorno.ancho !== ancho) {
    const escala = limitar(ancho / 840, 0.74, 1)
    for (const sticker of stickers) {
      sticker.tamano = Math.round(sticker.lanzamiento.tamano * escala)
      sticker.elemento.style.width = `${sticker.tamano}px`
    }
  }

  entorno.ancho = ancho
  entorno.alto = window.innerHeight
  const paneles = capa.value?.parentElement?.querySelectorAll<HTMLElement>(
    "[data-obstaculo-sticker]",
  )
  if (!paneles) return

  entorno.obstaculos = Array.from(paneles, (panel) => {
    const { left, right, top, bottom } = panel.getBoundingClientRect()
    return { id: panel.dataset.obstaculoSticker!, left, right, top, bottom }
  }).filter(({ left, right, top, bottom }) => right > left && bottom > top)
}

function ajustarSalidaMovil(
  sticker: Sticker,
  indice: number,
  carta: ObstaculoSticker | undefined,
) {
  if (entorno.ancho > 760 || !carta) return

  const radio = sticker.tamano * 0.38
  if (
    sticker.x < carta.left - radio ||
    sticker.x > carta.right + radio ||
    sticker.y < carta.top - radio ||
    sticker.y > carta.bottom + radio
  ) {
    return
  }

  // Un origen tapado se proyecta al borde que tiene más espacio visible.
  const margen = radio + 9
  const espacioInferior = entorno.alto - carta.bottom
  const salePorAbajo = espacioInferior >= Math.max(carta.top, margen + radio)
  sticker.y = salePorAbajo
    ? carta.bottom + margen
    : Math.max(8, carta.top - margen)

  const haciaCarta = salePorAbajo ? -1 : 1
  sticker.vy =
    indice % 4 === 3
      ? -haciaCarta * 62
      : haciaCarta * limitar(Math.abs(sticker.vy) * 0.66, 135, 250)
}

function lanzar(sticker: Sticker, indice: number) {
  const disparo = sticker.primerVuelo && sticker.lanzamiento.disparo
  const direccion = indice % 2 === 0 ? 1 : -1
  sticker.primerVuelo = false
  sticker.activo = true
  sticker.ultimoImpacto = null
  sticker.esperaImpacto = 0
  sticker.giro = direccion * 14
  sticker.velocidadGiro = direccion * (disparo ? 115 : 25)

  if (disparo) {
    sticker.x = limitar(props.origen?.x ?? entorno.ancho / 2, 0, entorno.ancho)
    sticker.y = limitar(props.origen?.y ?? entorno.alto / 2, 0, entorno.alto)
    sticker.vx = disparo[0] * limitar(entorno.ancho / 800, 0.82, 1.15)
    sticker.vy = disparo[1] * limitar(entorno.alto / 850, 0.74, 1.12)

    const carta = entorno.obstaculos.find((panel) => panel.id === "carta")
    const destino = sticker.lanzamiento.destinoSuperior
    const radio = sticker.tamano * 0.38
    if (carta && destino !== undefined && carta.top > radio) {
      const destinoX = carta.left + (carta.right - carta.left) * destino
      lanzarHaciaBordeSuperior(sticker, carta, radio, destinoX)
    } else {
      ajustarSalidaMovil(sticker, indice, carta)
    }
  } else {
    const carril = sticker.lanzamiento.carril + (Math.random() - 0.5) * 0.07
    sticker.x = limitar(carril * entorno.ancho, 0, entorno.ancho)
    sticker.y = -sticker.tamano / 2
    sticker.vx = direccion * (8 + Math.random() * 12)
    sticker.vy = 55 + Math.random() * 50
  }

  pintar(sticker)
  sticker.elemento.hidden = false
}

function animar(ahora: number) {
  const delta = Math.min((ahora - (anterior ?? ahora)) / 1000, 0.04)
  anterior = ahora

  if (ahora >= siguienteMedicion) {
    medirEntorno()
    siguienteMedicion = ahora + 110
  }

  let enVuelo = stickers.reduce(
    (total, sticker) => total + Number(sticker.activo),
    0,
  )
  for (const [indice, sticker] of stickers.entries()) {
    if (!sticker.activo) {
      sticker.espera -= delta
      const saleEnEstallido = sticker.primerVuelo && sticker.lanzamiento.disparo
      if (
        sticker.espera <= 0 &&
        (saleEnEstallido || enVuelo < MAX_LLUVIA_ACTIVA)
      ) {
        lanzar(sticker, indice)
        enVuelo++
      }
      continue
    }
    if (sticker.arrastre) continue

    avanzarSticker(sticker, delta, sticker.tamano * 0.38, entorno)
    if (sticker.y > entorno.alto + sticker.tamano) {
      sticker.activo = false
      enVuelo--
      sticker.espera = 0.32 + Math.random() * 0.7
      sticker.elemento.hidden = true
    } else {
      pintar(sticker)
    }
  }

  cuadro = requestAnimationFrame(animar)
}

function iniciarArrastre(evento: PointerEvent, indice: number) {
  const sticker = stickers[indice]
  if (evento.button !== 0 || !sticker?.activo || sticker.arrastre) return

  evento.preventDefault()
  sticker.elemento.setPointerCapture(evento.pointerId)
  sticker.arrastre = {
    puntero: evento.pointerId,
    desfaseX: evento.clientX - sticker.x,
    desfaseY: evento.clientY - sticker.y,
  }
  sticker.elemento.dataset.arrastrando = ""
}

function moverSticker(evento: PointerEvent, indice: number) {
  const sticker = stickers[indice]
  const arrastre = sticker?.arrastre
  if (!arrastre || evento.pointerId !== arrastre.puntero) return

  const mitad = sticker.tamano / 2
  sticker.x = limitar(
    evento.clientX - arrastre.desfaseX,
    mitad,
    window.innerWidth - mitad,
  )
  sticker.y = limitar(
    evento.clientY - arrastre.desfaseY,
    mitad,
    window.innerHeight - mitad,
  )
  pintar(sticker)
}

function liberarSticker(sticker: Sticker) {
  const arrastre = sticker.arrastre
  if (!arrastre) return

  sticker.arrastre = null
  delete sticker.elemento.dataset.arrastrando
  sticker.vx = 0
  sticker.vy = 95
  sticker.esperaImpacto = 0
  sticker.ultimoImpacto = null
  if (sticker.elemento.hasPointerCapture(arrastre.puntero)) {
    sticker.elemento.releasePointerCapture(arrastre.puntero)
  }
}

function soltarSticker(evento: PointerEvent, indice: number) {
  const sticker = stickers[indice]
  if (sticker?.arrastre?.puntero === evento.pointerId) liberarSticker(sticker)
}

function detener() {
  if (cuadro !== undefined) cancelAnimationFrame(cuadro)
  cuadro = undefined
  anterior = undefined
  for (const sticker of stickers) liberarSticker(sticker)
}

function sincronizarAnimacion() {
  if (document.hidden || movimientoReducido?.matches) {
    detener()
  } else if (cuadro === undefined) {
    siguienteMedicion = 0
    cuadro = requestAnimationFrame(animar)
  }
}

onMounted(() => {
  if (!capa.value) return

  const elementos =
    capa.value.querySelectorAll<HTMLDivElement>(".sticker-en-caida")
  stickers = Array.from(elementos, (elemento, indice) => {
    const lanzamiento = lanzamientos[indice]!
    return {
      elemento,
      lanzamiento,
      activo: false,
      primerVuelo: true,
      espera: lanzamiento.disparo
        ? indice * 0.016
        : 0.6 + (indice - disparos.length) * 0.55,
      tamano: lanzamiento.tamano,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      giro: 0,
      velocidadGiro: 0,
      ultimoImpacto: null,
      esperaImpacto: 0,
      arrastre: null,
    }
  })

  movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)")
  movimientoReducido.addEventListener("change", sincronizarAnimacion)
  document.addEventListener("visibilitychange", sincronizarAnimacion)
  sincronizarAnimacion()
})

onBeforeUnmount(() => {
  detener()
  document.removeEventListener("visibilitychange", sincronizarAnimacion)
  movimientoReducido?.removeEventListener("change", sincronizarAnimacion)
})
</script>

<template>
  <div
    ref="capa"
    class="lluvia-stickers"
    :style="{ '--imagen-stickers': `url(${imagen})` }"
    aria-hidden="true"
  >
    <div
      v-for="(lanzamiento, indice) in lanzamientos"
      :key="indice"
      class="sticker-en-caida"
      :style="{
        backgroundPosition: `${(lanzamiento.motivo % 4) * (100 / 3)}% ${Math.floor(lanzamiento.motivo / 4) * 100}%`,
      }"
      hidden
      @pointerdown="iniciarArrastre($event, indice)"
      @pointermove="moverSticker($event, indice)"
      @pointerup="soltarSticker($event, indice)"
      @pointercancel="soltarSticker($event, indice)"
      @lostpointercapture="soltarSticker($event, indice)"
    />
  </div>
</template>

<style scoped>
.lluvia-stickers {
  position: fixed;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.sticker-en-caida {
  position: absolute;
  top: 0;
  left: 0;
  aspect-ratio: 1;
  background-image: var(--imagen-stickers);
  background-repeat: no-repeat;
  background-size: 400% 200%;
  filter: drop-shadow(0 3px 5px #0009);
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  will-change: transform;
}

.sticker-en-caida[data-arrastrando] {
  z-index: 1;
  filter: drop-shadow(0 7px 8px #000b);
  cursor: grabbing;
}

@media (prefers-reduced-motion: reduce) {
  .lluvia-stickers {
    display: none;
  }
}
</style>
