<script setup lang="ts">
import { Trash2 } from "lucide-vue-next"

defineProps<{
  src: string
  alt: string
  giro?: number
  lado: "izquierda" | "derecha"
  borde: "superior" | "inferior" | "izquierdo" | "derecho"
}>()

const emit = defineEmits<{
  descartar: []
  desprendida: []
  finalizar: []
  interaccion: []
}>()

const foto = ref<HTMLElement>()
const ampliada = ref(false)
const arrastrando = ref(false)
const cayendo = ref(false)
let puntero: { id: number; x: number; y: number } | undefined
let desplazamiento = { x: 0, y: 0 }
let esperaAmpliacion: ReturnType<typeof setTimeout> | undefined
let caida: Animation | undefined

function iniciarInteraccion(evento: PointerEvent) {
  const elemento = foto.value

  if (!elemento || puntero || cayendo.value || evento.button !== 0) return

  evento.preventDefault()
  puntero = { id: evento.pointerId, x: evento.clientX, y: evento.clientY }
  elemento.setPointerCapture(evento.pointerId)
  emit("interaccion")
  esperaAmpliacion = setTimeout(() => {
    ampliada.value = true
  }, 340)
}

function moverFoto(evento: PointerEvent) {
  const elemento = foto.value

  if (!elemento || puntero?.id !== evento.pointerId || ampliada.value) return

  const x = evento.clientX - puntero.x
  const y = evento.clientY - puntero.y

  if (!arrastrando.value) {
    if (Math.hypot(x, y) < 8) return

    clearTimeout(esperaAmpliacion)
    arrastrando.value = true
    elemento.removeAttribute("data-obstaculo-sticker")
  }

  desplazamiento = { x, y }
  elemento.style.translate = `${x}px ${y}px`
}

function soltarFoto(evento: PointerEvent) {
  const elemento = foto.value

  if (!elemento || puntero?.id !== evento.pointerId) return

  clearTimeout(esperaAmpliacion)
  puntero = undefined
  if (elemento.hasPointerCapture(evento.pointerId)) {
    elemento.releasePointerCapture(evento.pointerId)
  }
  if (!arrastrando.value) {
    ampliada.value = false
    emit("finalizar")
    return
  }

  arrastrando.value = false
  cayendo.value = true

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elemento.style.opacity = "0"
    emit("desprendida")
    return
  }

  const { x, y } = desplazamiento
  const marco = elemento.getBoundingClientRect()
  const distancia = Math.max(window.innerHeight - marco.top + marco.height, 120)
  const direccion = x < 0 ? -1 : 1

  caida = elemento.animate(
    [
      { translate: `${x}px ${y}px`, rotate: "0deg", opacity: 1 },
      {
        translate: `${x + 48 * direccion}px ${y + distancia}px`,
        rotate: `${55 * direccion}deg`,
        opacity: 0,
      },
    ],
    {
      duration: 570,
      easing: "cubic-bezier(0.5, 0, 0.9, 0.65)",
      fill: "forwards",
    },
  )
  caida.onfinish = () => emit("desprendida")
}

onBeforeUnmount(() => {
  clearTimeout(esperaAmpliacion)
  caida?.cancel()
})
</script>

<template>
  <figure
    ref="foto"
    class="foto-pegada"
    :data-borde="borde"
    :class="[
      `foto-pegada--${lado}`,
      { 'foto-pegada--suelta': arrastrando || cayendo },
    ]"
    @pointerdown="iniciarInteraccion"
    @pointermove="moverFoto"
    @pointerup="soltarFoto"
    @pointercancel="soltarFoto"
    @lostpointercapture="soltarFoto"
    @touchstart.prevent
    @contextmenu.prevent
  >
    <NuxtImg
      class="foto-pegada__imagen"
      :src="src"
      :alt="alt"
      width="420"
      format="webp"
      :draggable="false"
      :modifiers="giro === undefined ? undefined : { rotate: giro }"
    />
    <button
      type="button"
      class="foto-pegada__quitar"
      :aria-label="`Quitar ${alt.toLowerCase()} de esta sesión`"
      :disabled="ampliada || arrastrando || cayendo"
      @pointerdown.stop
      @touchstart.stop
      @click.stop="emit('descartar')"
    >
      <Trash2 :size="14" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div v-if="ampliada" class="foto-ampliada" aria-hidden="true">
        <NuxtImg
          class="foto-ampliada__imagen"
          :src="src"
          alt=""
          width="960"
          format="webp"
          :draggable="false"
          :modifiers="giro === undefined ? undefined : { rotate: giro }"
        />
      </div>
    </Teleport>
  </figure>
</template>

<style scoped>
.foto-pegada {
  --entrada-x: 100vw;
  --entrada-giro: 20deg;
  --giro-foto: 7deg;
  --solape-foto: 0.65rem;
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  aspect-ratio: 1 / 1.06;
  margin: 0;
  padding: clamp(0.22rem, 0.6vw, 0.48rem);
  padding-bottom: clamp(0.36rem, 0.9vw, 0.73rem);
  transform: rotate(var(--giro-foto));
  border: 1px solid #e9e0ce;
  border-radius: 0.2rem;
  background: #fffdfa;
  box-shadow: 0 0.5rem 1.1rem rgb(36 8 12 / 27%);
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.foto-pegada--izquierda {
  --entrada-x: -100vw;
  --entrada-giro: -20deg;
}

.foto-pegada:is([data-borde="superior"], [data-borde="inferior"]) {
  inset-inline: 0;
  width: var(--tamano-foto-horizontal);
  margin-inline: auto;
}

.foto-pegada[data-borde="superior"] {
  --giro-foto: -5deg;
  bottom: calc(100% - var(--solape-foto));
}

.foto-pegada[data-borde="inferior"] {
  --giro-foto: 5deg;
  top: calc(100% - var(--solape-foto));
}

.foto-pegada:is([data-borde="izquierdo"], [data-borde="derecho"]) {
  top: 27%;
  width: var(--tamano-foto-lateral);
}

.foto-pegada[data-borde="izquierdo"] {
  --giro-foto: -7deg;
  right: calc(100% - var(--solape-foto));
}

.foto-pegada[data-borde="derecho"] {
  left: calc(100% - var(--solape-foto));
}

.foto-pegada::before {
  position: absolute;
  z-index: 1;
  width: max(1.5rem, 40%);
  height: 14%;
  pointer-events: none;
  border-block: 1px solid rgb(255 245 212 / 42%);
  background: linear-gradient(105deg, #a57937, #f2d48d 55%, #c69c53);
  box-shadow: 0 1px 2px rgb(49 26 3 / 18%);
  clip-path: polygon(
    1% 0,
    99% 0,
    95% 25%,
    100% 56%,
    96% 100%,
    0 100%,
    4% 67%,
    0 38%
  );
  content: "";
}

.foto-pegada[data-borde="superior"]::before {
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 50%) rotate(74deg);
}

.foto-pegada[data-borde="inferior"]::before {
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%) rotate(104deg);
}

.foto-pegada:is([data-borde="izquierdo"], [data-borde="derecho"])::before {
  width: min(40%, 3.25rem);
}

.foto-pegada[data-borde="izquierdo"]::before {
  top: 50%;
  right: 0;
  transform: translate(50%, -50%) rotate(13deg);
}

.foto-pegada[data-borde="derecho"]::before {
  top: 50%;
  left: 0;
  transform: translate(-50%, -50%) rotate(-13deg);
}

.foto-pegada--suelta {
  z-index: 6;
  cursor: grabbing;
}

.foto-pegada--suelta::before {
  opacity: 0;
}

.foto-pegada__imagen {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #f5f0e6;
  object-fit: contain;
}

.foto-pegada__quitar {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fffdfa;
  cursor: pointer;
}

.foto-pegada__quitar svg {
  box-sizing: content-box;
  padding: 0.27rem;
  border-radius: 50%;
  background: rgb(16 13 15 / 76%);
}

.foto-pegada__quitar:is(:hover, :focus-visible) svg {
  background: #100d0f;
}

.foto-pegada__quitar:focus-visible {
  outline: 2px solid #711321;
  outline-offset: -2px;
}

.foto-pegada__quitar:disabled {
  visibility: hidden;
}

.foto-ampliada {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(16 13 15 / 83%);
  pointer-events: none;
}

.foto-ampliada__imagen {
  box-sizing: border-box;
  width: auto;
  height: auto;
  max-width: min(85vw, 56rem);
  max-height: min(80dvh, 50rem);
  padding: clamp(0.3rem, 1vw, 0.65rem);
  border-radius: 0.25rem;
  background: #fffdfa;
  object-fit: contain;
}

.foto-pegada-enter-active {
  animation: pegar-foto 760ms both;
  pointer-events: none;
}

.foto-pegada-leave-active {
  transition: opacity 200ms ease;
  pointer-events: none;
}

.foto-pegada-leave-to {
  opacity: 0;
}

@keyframes pegar-foto {
  0% {
    transform: translate(var(--entrada-x), 1rem) rotate(var(--entrada-giro));
    animation-timing-function: cubic-bezier(0.18, 0.6, 0.4, 1);
  }

  64% {
    transform: translate(calc(var(--entrada-x) * 0.06), -2rem)
      rotate(calc(var(--giro-foto) - 7deg));
    animation-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
  }

  87% {
    transform: translateY(0.18rem) rotate(calc(var(--giro-foto) + 3deg));
  }

  100% {
    transform: rotate(var(--giro-foto));
  }
}

@media (max-width: 760px) {
  .foto-pegada:is([data-borde="izquierdo"], [data-borde="derecho"])::before {
    width: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .foto-pegada-enter-active {
    animation: none;
    pointer-events: auto;
  }

  .foto-pegada-leave-active {
    transition: none;
  }
}
</style>
