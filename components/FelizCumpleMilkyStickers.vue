<script setup lang="ts">
import {
  avanzarSticker,
  type CuerpoSticker,
  type EntornoSticker,
} from "@/utils/fisicaStickersMilky"

const props = defineProps<{
  imagen: string
  origen: { x: number; y: number } | null
}>()

const lanzamientos = [
  { motivo: 0, carril: 0.08, tamano: 82, disparo: [-445, -250] },
  { motivo: 1, carril: 0.84, tamano: 84, disparo: [145, -410] },
  { motivo: 2, carril: 0.91, tamano: 74, disparo: [350, -290] },
  { motivo: 3, carril: 0.52, tamano: 77, disparo: [-245, -450] },
  { motivo: 4, carril: 0.15, tamano: 78, disparo: [-365, -110] },
  { motivo: 5, carril: 0.68, tamano: 68, disparo: [-70, -530] },
  { motivo: 6, carril: 0.31, tamano: 75, disparo: [290, -130] },
  { motivo: 7, carril: 0.93, tamano: 70, disparo: [80, -330] },
  { motivo: 0, carril: 0.57, tamano: 66, disparo: null },
  { motivo: 4, carril: 0.06, tamano: 72, disparo: null },
  { motivo: 3, carril: 0.92, tamano: 74, disparo: null },
] as const

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
    const escala = limitar(entorno.ancho / 900, 0.55, 1)
    sticker.x = limitar(props.origen?.x ?? entorno.ancho / 2, 0, entorno.ancho)
    sticker.y = limitar(props.origen?.y ?? entorno.alto / 2, 0, entorno.alto)
    sticker.vx = disparo[0] * escala
    sticker.vy = disparo[1] * escala
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

  for (const [indice, sticker] of stickers.entries()) {
    if (!sticker.activo) {
      sticker.espera -= delta
      if (sticker.espera <= 0) lanzar(sticker, indice)
      continue
    }
    if (sticker.arrastre) continue

    avanzarSticker(sticker, delta, sticker.tamano * 0.38, entorno)
    if (sticker.y > entorno.alto + sticker.tamano) {
      sticker.activo = false
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
      espera: lanzamiento.disparo ? indice * 0.028 : 0.6 + (indice - 8) * 0.55,
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
