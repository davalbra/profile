<script setup lang="ts">
import { ArrowDown, Heart, RotateCcw } from "lucide-vue-next"
import FelizCumpleMilkyFoto from "@/components/FelizCumpleMilkyFoto.vue"
import FelizCumpleMilkyStickers from "@/components/FelizCumpleMilkyStickers.vue"
import FelizCumpleMilkySobre from "@/components/FelizCumpleMilkySobre.vue"
import { useGaleriaMilky } from "@/composables/useGaleriaMilky"

const DURACION_APERTURA_MS = 1450
const ESPERA_ANTES_DE_FOTOS_MS = 2100
const imagenStickerPortada = "/milky-sticker.webp"
const imagenStickersCaida = "/milky-stickers-caida.webp"
const fotos = [
  "/milky/fotos/IMG-20261107-WA0016.jpg",
  "/milky/fotos/IMG-20261107-WA0039.jpg",
  "/milky/fotos/20260224_214339.jpg",
  "/milky/fotos/IMG_20260109_160406.jpg",
  "/milky/fotos/20260726_170146.jpg",
  "/milky/fotos/20260224_231154.jpg",
  "/milky/fotos/IMG_20260125_232003.jpg",
  "/milky/fotos/IMG_20260109_165155.jpg",
  "/milky/fotos/IMG_20260116_225728.jpg",
  "/milky/fotos/IMG_20260205_003010.jpg",
]
const girosFotos: Record<string, number> = {
  "/milky/fotos/20260224_214339.jpg": 90,
  "/milky/fotos/20260726_170146.jpg": 90,
  "/milky/fotos/20260224_231154.jpg": 270,
}

const fase = ref<"sobre" | "abriendo" | "nota" | "recuerdos">("sobre")
const abriendo = computed(() => fase.value === "abriendo")
const abierta = computed(
  () => fase.value === "nota" || fase.value === "recuerdos",
)
const {
  fotosVisibles,
  iniciar: iniciarGaleria,
  cerrar: cerrarGaleria,
  programarSiguienteRecuerdo,
  iniciarInteraccion,
  finalizarInteraccion,
  desprenderFoto,
  descartarFoto,
} = useGaleriaMilky(fotos)
const tituloCarta = ref<HTMLHeadingElement>()
const botonAbrir = ref<HTMLButtonElement>()
const botonSobre = ref<HTMLButtonElement>()
const origenStickers = ref<{ x: number; y: number } | null>(null)
let temporizadorApertura: number | undefined
let temporizadorRecuerdos: number | undefined

useSeoMeta({
  title: "Feliz cumple, Milky",
  description: "Una carta de cumpleaños para Milky.",
})

useHead({
  link: [
    { rel: "preload", as: "image", href: imagenStickersCaida },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=DM+Sans:wght@400;600&display=swap",
    },
  ],
})

function alPegarFoto(elemento: Element) {
  const numero = elemento.getAttribute("data-numero-foto")
  elemento.setAttribute("data-obstaculo-sticker", `foto-pegada-${numero}`)
  programarSiguienteRecuerdo()
}

function alDespegarFoto(elemento: Element) {
  elemento.removeAttribute("data-obstaculo-sticker")
}

async function mostrarCarta() {
  const sobre = botonSobre.value?.getBoundingClientRect()
  origenStickers.value = sobre
    ? { x: sobre.left + sobre.width / 2, y: sobre.top + sobre.height * 0.42 }
    : null
  fase.value = "nota"
  temporizadorRecuerdos = window.setTimeout(() => {
    iniciarGaleria()
    fase.value = "recuerdos"
  }, ESPERA_ANTES_DE_FOTOS_MS)

  await nextTick()
  tituloCarta.value?.focus()
}

function abrirCarta() {
  if (fase.value !== "sobre") return

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    void mostrarCarta()
    return
  }

  fase.value = "abriendo"
  temporizadorApertura = window.setTimeout(mostrarCarta, DURACION_APERTURA_MS)
}

async function cerrarCarta() {
  window.clearTimeout(temporizadorRecuerdos)
  cerrarGaleria()
  fase.value = "sobre"
  await nextTick()
  botonAbrir.value?.focus()
}

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.clearTimeout(temporizadorApertura)
    window.clearTimeout(temporizadorRecuerdos)
  }
})
</script>

<template>
  <main class="cumple" :class="{ 'cumple--abierta': abierta }">
    <section v-if="!abierta" class="portada" aria-labelledby="titulo-portada">
      <div class="portada-texto">
        <div class="marca" aria-hidden="true">
          <span />
          <Heart :size="18" fill="currentColor" />
          <span />
        </div>
        <h1 id="titulo-portada">Feliz cumple,<br /><em>Milky</em></h1>
        <img
          class="portada-sticker"
          :src="imagenStickerPortada"
          alt=""
          width="160"
          height="160"
        />
      </div>

      <div class="escena-sobre">
        <div class="orbita" aria-hidden="true" />
        <span class="adorno adorno-estrella" aria-hidden="true">✦</span>
        <span class="adorno adorno-flor" aria-hidden="true">✿</span>
        <span class="adorno adorno-destello" aria-hidden="true">✧</span>
        <span class="adorno adorno-corazon" aria-hidden="true">♥</span>
        <button
          ref="botonSobre"
          class="boton-sobre"
          type="button"
          aria-label="Abrir el sobre de Milky"
          :aria-disabled="abriendo"
          @click="abrirCarta"
        >
          <FelizCumpleMilkySobre :opening="abriendo" />
        </button>
      </div>

      <div class="portada-accion">
        <button
          ref="botonAbrir"
          class="boton-abrir"
          type="button"
          :aria-disabled="abriendo"
          @click="abrirCarta"
        >
          Abrir la carta
          <ArrowDown :size="17" aria-hidden="true" />
        </button>
      </div>
    </section>

    <section v-else class="carta-abierta" aria-labelledby="titulo-carta">
      <div class="soporte-carta">
        <article class="papel" data-obstaculo-sticker="carta">
          <h1 id="titulo-carta" ref="tituloCarta" tabindex="-1">
            Querida <em>Milky,</em>
          </h1>
          <p>
            Feliz cumpleaños. Ojalá hoy te sobren las razones para sonreír, los
            abrazos duren un poquito más y te guardes la mejor parte del pastel.
          </p>
          <p>
            Deseo que este año te traiga planes que te ilusionen, días
            tranquilos cuando los necesites y un montón de momentos que quieras
            volver a vivir.
          </p>
          <p class="firma">Con mucho cariño,<br /><em>David</em></p>
        </article>

        <TransitionGroup
          name="foto-pegada"
          @after-enter="alPegarFoto"
          @before-leave="alDespegarFoto"
        >
          <FelizCumpleMilkyFoto
            v-for="foto in fase === 'recuerdos' ? fotosVisibles : []"
            :key="foto.src"
            :src="foto.src"
            :alt="`Foto de Milky, recuerdo ${foto.numero}`"
            :giro="girosFotos[foto.src]"
            :borde="foto.borde"
            :lado="
              foto.borde === 'izquierdo' || foto.borde === 'superior'
                ? 'izquierda'
                : 'derecha'
            "
            :data-numero-foto="foto.numero"
            @interaccion="iniciarInteraccion(foto.src)"
            @finalizar="finalizarInteraccion(foto.src)"
            @desprendida="desprenderFoto(foto.src)"
            @descartar="descartarFoto(foto.src)"
          />
        </TransitionGroup>
      </div>

      <button
        class="boton-cerrar"
        type="button"
        data-obstaculo-sticker="cerrar"
        @click="cerrarCarta"
      >
        <RotateCcw :size="15" aria-hidden="true" />
        Volver al sobre
      </button>
    </section>

    <FelizCumpleMilkyStickers
      v-if="abierta"
      :imagen="imagenStickersCaida"
      :origen="origenStickers"
    />
  </main>
</template>

<style scoped>
.cumple {
  --carbon: #100d0f;
  --tinta: #21181b;
  --tinta-suave: #493a3b;
  --rojo: #ff414e;
  --rojo-tinta: #a80e24;
  --oro: #ffda7d;
  --blanco: #ffffff;
  --papel: #fffcf6;
  --serif: "Cormorant Garamond", Georgia, serif;

  position: relative;
  isolation: isolate;
  display: grid;
  min-height: 100svh;
  padding: clamp(2.75rem, 6vw, 5rem) clamp(1.25rem, 6vw, 5rem);
  overflow: clip;
  place-items: center;
  color: var(--blanco);
  background:
    radial-gradient(ellipse at 75% 48%, #521522, transparent 55%),
    radial-gradient(ellipse at 8% 0%, #2f2118, transparent 48%), var(--carbon);
  font-family: "DM Sans", sans-serif;
}

.cumple--abierta {
  padding-block: clamp(1.35rem, 3.5vw, 3rem);
}

.cumple::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    radial-gradient(circle at 25% 25%, #ffda7d19 0.45px, transparent 0.8px),
    radial-gradient(circle at 70% 70%, #ffffff0d 0.4px, transparent 0.85px);
  background-size:
    5px 7px,
    7px 5px;
  content: "";
  pointer-events: none;
}

.cumple::after {
  position: absolute;
  z-index: -1;
  inset: clamp(0.6rem, 1.6vw, 1.35rem);
  border: 1px solid #ffda7d42;
  border-radius: 0.75rem;
  content: "";
  pointer-events: none;
}

.portada {
  display: grid;
  width: min(100%, 70rem);
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: "texto sobre" "accion sobre";
  align-content: center;
  align-items: center;
  gap: 1.9rem clamp(1.5rem, 6vw, 6rem);
}

.portada-texto {
  grid-area: texto;
  align-self: end;
}

.marca {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--oro);
}

.marca span {
  width: 1.6rem;
  height: 1px;
  background: currentColor;
  opacity: 0.55;
}

.portada h1,
.papel h1 {
  margin-block: 0.9rem 0;
  font-family: var(--serif);
  font-weight: 600;
  letter-spacing: -0.055em;
}

.portada h1 {
  font-size: clamp(4.15rem, 7.2vw, 6.45rem);
  line-height: 0.9;
}

.portada h1 em {
  color: var(--rojo);
}

.portada-sticker {
  display: block;
  width: clamp(3.65rem, 5.2vw, 4.8rem);
  height: auto;
  margin-top: 1.05rem;
  rotate: -9deg;
}

.portada-accion {
  grid-area: accion;
  align-self: start;
}

.boton-abrir {
  display: inline-flex;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1.35rem;
  border: 1px solid #ffe8a9;
  border-radius: 100vw;
  color: var(--tinta);
  background: linear-gradient(135deg, #ffe89d, #edb64b);
  box-shadow: 0 8px 28px #eab75036;
  font-size: 0.95rem;
  font-weight: 600;
}

.boton-abrir:hover {
  background: #ffe89d;
}

.cumple button {
  cursor: pointer;
}

.cumple button[aria-disabled="true"] {
  cursor: wait;
}

.cumple button:focus-visible {
  outline: 2px solid var(--oro);
  outline-offset: 5px;
}

.escena-sobre {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: clamp(18rem, 36vw, 29rem);
  grid-area: sobre;
  place-items: center;
}

.orbita {
  position: absolute;
  inset: 12% -6% 10%;
  border: 1px dashed #ffda7d6b;
  border-radius: 50%;
  transform: rotate(-18deg);
  pointer-events: none;
}

.boton-sobre {
  position: relative;
  z-index: 1;
  display: block;
  width: min(100%, 29rem);
  padding: 0;
  border: 0;
  border-radius: 0.75rem;
  background: transparent;
  transition: translate 240ms ease;
}

.boton-sobre:hover:not([aria-disabled="true"]) {
  translate: 0 -5px;
}

.adorno {
  position: absolute;
  z-index: 2;
  line-height: 1;
  pointer-events: none;
}

.adorno-estrella {
  top: 6%;
  left: 12%;
  color: var(--oro);
  font-size: clamp(1.6rem, 3vw, 2.6rem);
}

.adorno-flor {
  right: 5%;
  bottom: 8%;
  color: var(--rojo);
  font-size: clamp(1.8rem, 3.5vw, 3.1rem);
  rotate: 14deg;
}

.adorno-destello {
  top: 16%;
  right: 4%;
  color: var(--blanco);
  font-size: clamp(1.4rem, 2.7vw, 2.4rem);
}

.adorno-corazon {
  bottom: 5%;
  left: 12%;
  color: var(--oro);
  font-size: 1.1rem;
  rotate: -17deg;
}

.carta-abierta {
  --tamano-foto-lateral: clamp(9rem, 13.5vw, 12.25rem);
  --tamano-foto-horizontal: clamp(7rem, 11vw, 10rem);
  --espacio-foto-horizontal: calc(
    var(--tamano-foto-horizontal) * 1.13 + 0.5rem
  );
  --separacion-paneles: clamp(1.3rem, 3vw, 3rem);
  position: relative;
  z-index: 2;
  display: grid;
  width: min(100%, 74rem);
  padding-block-start: var(--espacio-foto-horizontal);
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr) minmax(0, 1fr);
  align-items: center;
  gap: 2rem var(--separacion-paneles);
  animation: revelar 500ms ease-out both;
  pointer-events: none;
}

.papel,
.boton-cerrar {
  pointer-events: auto;
}

.soporte-carta {
  position: relative;
  grid-area: 1 / 2;
  min-width: 0;
  margin-block-end: var(--espacio-foto-horizontal);
}

.papel {
  position: relative;
  padding: clamp(2rem, 5vw, 3.65rem);
  border: 1px solid #e0b455;
  border-radius: 3px;
  color: var(--tinta);
  background: linear-gradient(145deg, var(--blanco), var(--papel));
  box-shadow:
    0 21px 64px #00000070,
    0 2px 4px #00000036;
}

.papel::before {
  position: absolute;
  inset: 0.6rem;
  border: 1px solid #c8903e8a;
  border-radius: 2px;
  content: "";
  pointer-events: none;
}

.papel h1 {
  margin-top: 0;
  font-size: clamp(3.1rem, 6.35vw, 6rem);
  line-height: 0.98;
}

.papel h1 em,
.firma em {
  color: var(--rojo-tinta);
}

.papel h1:focus {
  outline: none;
}

.papel p {
  margin: 1.35rem 0 0;
  color: var(--tinta-suave);
  font-size: 1rem;
  line-height: 1.7;
}

.papel .firma {
  color: var(--tinta);
  line-height: 1.2;
}

.firma em {
  font-family: var(--serif);
  font-size: 2.4rem;
  font-weight: 600;
}

.boton-cerrar:hover {
  background: #ffda7d24;
}

.boton-cerrar {
  display: inline-flex;
  min-height: 2.75rem;
  grid-column: 1 / -1;
  align-items: center;
  justify-self: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid #ffda7d73;
  border-radius: 100vw;
  color: var(--oro);
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
}

@keyframes revelar {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

@media (max-width: 760px) {
  .cumple {
    background:
      radial-gradient(ellipse at 65% 50%, #46131f, transparent 64%),
      var(--carbon);
  }

  .portada {
    max-width: 29rem;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "texto" "sobre" "accion";
    justify-items: center;
    gap: 1.1rem;
    text-align: center;
  }

  .portada h1 {
    font-size: clamp(3.4rem, 11.7vw, 5.5rem);
  }

  .portada .marca {
    justify-content: center;
  }

  .portada-sticker {
    margin-inline: auto;
  }

  .escena-sobre {
    width: 100%;
    min-height: 0;
    padding: 2.25rem 1.15rem;
  }

  .orbita {
    inset: 8% 1% 8%;
  }

  .adorno-estrella {
    top: 4%;
  }

  .adorno-flor {
    right: 1%;
  }

  .carta-abierta {
    --margen-foto-lateral: clamp(3.4rem, 17vw, 5rem);
    --tamano-foto-lateral: calc(var(--margen-foto-lateral) + 0.25rem);
    --tamano-foto-horizontal: clamp(7rem, 33vw, 9.25rem);
    max-width: 30rem;
    grid-template-columns: minmax(0, 1fr);
    align-self: start;
    gap: 2.65rem;
  }

  .soporte-carta {
    width: min(100%, calc(100vw - 2 * var(--margen-foto-lateral)));
    grid-area: 1 / 1;
    justify-self: center;
  }

  .papel {
    padding-inline: clamp(1.4rem, 5vw, 2rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .boton-sobre {
    transition: none;
  }

  .carta-abierta {
    animation: none;
  }
}
</style>
