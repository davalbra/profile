<script setup lang="ts">
defineProps<{ imagen: string }>()

const lanzamientos = [
  { motivo: 0, carril: 0.18, espera: 0, tamano: 82 },
  { motivo: 1, carril: 0.74, espera: 160, tamano: 84 },
  { motivo: 2, carril: 0.88, espera: 470, tamano: 74 },
  { motivo: 3, carril: 0.48, espera: 820, tamano: 77 },
  { motivo: 4, carril: 0.1, espera: 1200, tamano: 78 },
  { motivo: 5, carril: 0.64, espera: 1650, tamano: 68 },
  { motivo: 6, carril: 0.32, espera: 2080, tamano: 75 },
  { motivo: 7, carril: 0.91, espera: 2550, tamano: 70 },
  { motivo: 0, carril: 0.57, espera: 3120, tamano: 66 },
  { motivo: 4, carril: 0.23, espera: 3710, tamano: 72 },
  { motivo: 3, carril: 0.82, espera: 4300, tamano: 74 },
]

type Arrastre = { puntero: number; desfaseX: number; desfaseY: number }
type Sticker = {
  elemento: HTMLDivElement
  fase: "pendiente" | "cayendo" | "terminado"
  x: number
  y: number
  giro: number
  tamano: number
  arrastre: Arrastre | null
}

const capa = ref<HTMLDivElement>()
let stickers: Sticker[] = []
let cuadro = 0
let inicio: number | undefined
let anterior: number | undefined

function limitar(valor: number, maximo: number) {
  return Math.max(0, Math.min(valor, maximo))
}

function pintar(sticker: Sticker) {
  sticker.elemento.style.transform = `translate3d(${sticker.x}px, ${sticker.y}px, 0) rotate(${sticker.giro}deg)`
}

function animar(ahora: number) {
  inicio ??= ahora
  const delta = Math.min((ahora - (anterior ?? ahora)) / 1000, 0.05)
  anterior = ahora
  const ancho = window.innerWidth
  const alto = window.innerHeight
  let continuar = false

  for (const [indice, sticker] of stickers.entries()) {
    if (sticker.fase === "terminado") continue

    const lanzamiento = lanzamientos[indice]!
    if (sticker.fase === "pendiente" && ahora - inicio >= lanzamiento.espera) {
      sticker.x = limitar(
        ancho * lanzamiento.carril - sticker.tamano / 2,
        ancho - sticker.tamano,
      )
      sticker.fase = "cayendo"
      sticker.elemento.hidden = false
    }

    if (sticker.fase === "cayendo" && !sticker.arrastre) {
      const direccion = indice % 2 === 0 ? 1 : -1
      sticker.x = limitar(
        sticker.x + direccion * 14 * delta,
        ancho - sticker.tamano,
      )
      sticker.y += alto * (0.145 + (indice % 3) * 0.015) * delta
      sticker.giro += direccion * 26 * delta

      if (sticker.y > alto + sticker.tamano) {
        sticker.fase = "terminado"
        sticker.elemento.hidden = true
      } else {
        pintar(sticker)
      }
    }

    continuar ||= sticker.fase !== "terminado"
  }

  if (continuar) cuadro = requestAnimationFrame(animar)
}

function iniciarArrastre(evento: PointerEvent, indice: number) {
  const sticker = stickers[indice]
  if (
    evento.button !== 0 ||
    !sticker ||
    sticker.fase !== "cayendo" ||
    sticker.arrastre
  ) {
    return
  }

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

  sticker.x = limitar(
    evento.clientX - arrastre.desfaseX,
    window.innerWidth - sticker.tamano,
  )
  sticker.y = limitar(
    evento.clientY - arrastre.desfaseY,
    window.innerHeight - sticker.tamano,
  )
  pintar(sticker)
}

function soltarSticker(evento: PointerEvent, indice: number) {
  const sticker = stickers[indice]
  if (sticker?.arrastre?.puntero !== evento.pointerId) return

  sticker.arrastre = null
  delete sticker.elemento.dataset.arrastrando
}

onMounted(() => {
  if (
    !capa.value ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return

  const escala = Math.min(1, Math.max(0.74, window.innerWidth / 840))
  const elementos =
    capa.value.querySelectorAll<HTMLDivElement>(".sticker-en-caida")
  stickers = Array.from(elementos, (elemento, indice) => {
    const tamano = Math.round(lanzamientos[indice]!.tamano * escala)
    elemento.style.width = `${tamano}px`
    return {
      elemento,
      fase: "pendiente",
      x: 0,
      y: -tamano,
      giro: indice % 2 === 0 ? -24 : 24,
      tamano,
      arrastre: null,
    }
  })
  cuadro = requestAnimationFrame(animar)
})

onBeforeUnmount(() => {
  if (cuadro) cancelAnimationFrame(cuadro)
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
  z-index: 5;
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
