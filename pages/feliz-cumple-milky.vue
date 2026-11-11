<script setup lang="ts">
import { ArrowDown, Heart, Pause, Play, RotateCcw } from "lucide-vue-next"
import FelizCumpleMilkySobre from "@/components/FelizCumpleMilkySobre.vue"

const DURACION_FOTO_MS = 5000
const DURACION_APERTURA_MS = 1450
const ESPERA_ANTES_DE_FOTOS_MS = 2100
const imagenRecuerdos = "/milky-recuerdos.webp"

const fotos = [
  {
    descripcion: "Pastel de cumpleaños con velas rosas encendidas",
    nota: "Pide un deseo",
  },
  {
    descripcion: "Ramo de flores rosadas y margaritas al sol",
    nota: "Flores para ti",
  },
  {
    descripcion: "Atardecer rosa sobre las montañas",
    nota: "Por más días así",
  },
]

const coloresConfeti = ["#bc456c", "#e77f97", "#a65337", "#a13d61"]
const confeti = Array.from({ length: 24 }, (_, indice) => {
  const angulo = (indice / 24) * Math.PI * 2
  const distancia = 25 + (indice % 4) * 5

  return {
    simbolo: ["✿", "✦", "♥"][indice % 3],
    estilo: {
      "--x": `${Math.cos(angulo) * distancia}vw`,
      "--y": `${Math.sin(angulo) * distancia}vh`,
      "--giro": `${(indice % 2 === 0 ? 1 : -1) * (60 + indice * 8)}deg`,
      "--demora": `${(indice % 5) * 45}ms`,
      color: coloresConfeti[indice % coloresConfeti.length],
    },
  }
})

const fase = ref<"sobre" | "abriendo" | "nota" | "recuerdos">("sobre")
const abriendo = computed(() => fase.value === "abriendo")
const abierta = computed(
  () => fase.value === "nota" || fase.value === "recuerdos",
)
const pausada = ref(false)
const fotoActiva = ref(0)
const foto = computed(() => fotos[fotoActiva.value]!)
const tituloCarta = ref<HTMLHeadingElement>()
const botonAbrir = ref<HTMLButtonElement>()
let temporizadorApertura: number | undefined
let temporizadorRecuerdos: number | undefined
let temporizadorFoto: number | undefined

useSeoMeta({
  title: "Feliz cumple, Milky",
  description: "Una carta de cumpleaños para Milky.",
})

useHead({
  link: [
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=DM+Sans:wght@400;600&display=swap",
    },
  ],
})

function programarSiguienteFoto() {
  window.clearTimeout(temporizadorFoto)
  if (fase.value !== "recuerdos" || pausada.value) return

  temporizadorFoto = window.setTimeout(() => {
    mostrarFoto((fotoActiva.value + 1) % fotos.length)
  }, DURACION_FOTO_MS)
}

function mostrarFoto(indice: number) {
  if (indice === fotoActiva.value) return

  window.clearTimeout(temporizadorFoto)
  fotoActiva.value = indice
}

function alternarPausa() {
  pausada.value = !pausada.value
  programarSiguienteFoto()
}

async function mostrarCarta() {
  fase.value = "nota"
  temporizadorRecuerdos = window.setTimeout(() => {
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
  window.clearTimeout(temporizadorFoto)
  fase.value = "sobre"
  pausada.value = false
  fotoActiva.value = 0
  await nextTick()
  botonAbrir.value?.focus()
}

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.clearTimeout(temporizadorApertura)
    window.clearTimeout(temporizadorRecuerdos)
    window.clearTimeout(temporizadorFoto)
  }
})
</script>

<template>
  <main class="cumple">
    <section v-if="!abierta" class="portada" aria-labelledby="titulo-portada">
      <div class="portada-texto">
        <div class="marca" aria-hidden="true">
          <span />
          <Heart :size="18" fill="currentColor" />
          <span />
        </div>
        <h1 id="titulo-portada">Feliz cumple,<br /><em>Milky</em></h1>
        <p>Una cartita para ti, con todo mi cariño.</p>
      </div>

      <div class="escena-sobre">
        <div class="orbita" aria-hidden="true" />
        <span class="adorno adorno-estrella" aria-hidden="true">✦</span>
        <span class="adorno adorno-flor" aria-hidden="true">✿</span>
        <span class="adorno adorno-destello" aria-hidden="true">✧</span>
        <span class="adorno adorno-corazon" aria-hidden="true">♥</span>
        <button
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
      <div class="confeti" aria-hidden="true">
        <span
          v-for="(particula, indice) in confeti"
          :key="indice"
          :style="particula.estilo"
        >
          {{ particula.simbolo }}
        </span>
      </div>

      <article class="papel">
        <div class="marca" aria-hidden="true">
          <span />
          <Heart :size="18" fill="currentColor" />
          <span />
        </div>
        <h1 id="titulo-carta" ref="tituloCarta" tabindex="-1">
          Querida <em>Milky,</em>
        </h1>
        <p>
          Feliz cumpleaños. Ojalá hoy te sobren las razones para sonreír, los
          abrazos duren un poquito más y te guardes la mejor parte del pastel.
        </p>
        <p>
          Deseo que este año te traiga planes que te ilusionen, días tranquilos
          cuando los necesites y un montón de momentos que quieras volver a
          vivir.
        </p>
        <p class="firma">Con mucho cariño,<br /><em>David</em></p>
      </article>

      <Transition name="galeria" @after-enter="programarSiguienteFoto">
        <section
          v-if="fase === 'recuerdos'"
          class="recuerdos"
          aria-label="Fotos de cumpleaños"
        >
          <div class="album">
            <Transition
              name="foto"
              mode="out-in"
              @after-enter="programarSiguienteFoto"
            >
              <figure :key="fotoActiva" class="polaroid">
                <div
                  class="ventana-foto"
                  role="img"
                  :aria-label="foto.descripcion"
                >
                  <img
                    :src="imagenRecuerdos"
                    alt=""
                    :style="{
                      translate: `${(-100 * fotoActiva) / fotos.length}%`,
                    }"
                  />
                </div>
                <figcaption>{{ foto.nota }}</figcaption>
              </figure>
            </Transition>
          </div>

          <div class="controles-fotos">
            <button
              v-for="(elemento, indice) in fotos"
              :key="elemento.nota"
              class="boton-foto"
              type="button"
              :aria-label="`Ver foto: ${elemento.nota}`"
              :aria-current="fotoActiva === indice ? 'true' : undefined"
              @click="mostrarFoto(indice)"
            >
              <span />
            </button>
            <button
              class="boton-pausa"
              type="button"
              :aria-label="pausada ? 'Reanudar fotos' : 'Pausar fotos'"
              @click="alternarPausa"
            >
              <Play v-if="pausada" :size="17" aria-hidden="true" />
              <Pause v-else :size="17" aria-hidden="true" />
            </button>
          </div>
        </section>
      </Transition>

      <button class="boton-cerrar" type="button" @click="cerrarCarta">
        <RotateCcw :size="15" aria-hidden="true" />
        Volver al sobre
      </button>
    </section>
  </main>
</template>

<style scoped>
.cumple {
  --tinta: #711e3a;
  --tinta-suave: #6e3f4d;
  --rosa: #bd5274;
  --papel: #fffaf4;
  --serif: "Cormorant Garamond", Georgia, serif;

  position: relative;
  isolation: isolate;
  display: grid;
  min-height: 100svh;
  padding: clamp(2.75rem, 6vw, 5rem) clamp(1.25rem, 6vw, 5rem);
  overflow: clip;
  place-items: center;
  color: var(--tinta);
  background:
    radial-gradient(ellipse at 76% 49%, #f7cdd6 0, transparent 54%),
    radial-gradient(ellipse at 9% 0%, #fffdf7 0, transparent 57%), #fff3ed;
  font-family: "DM Sans", sans-serif;
}

.cumple::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    radial-gradient(circle at 25% 25%, #8b3f4a18 0.45px, transparent 0.8px),
    radial-gradient(circle at 70% 70%, #a35d3e18 0.4px, transparent 0.85px);
  background-size:
    5px 7px,
    7px 5px;
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
  color: var(--rosa);
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
  font-size: clamp(4.15rem, 8.15vw, 8.2rem);
  line-height: 0.83;
}

.portada h1 em,
.papel h1 em {
  color: #a33457;
  font-weight: 600;
}

.portada p {
  margin-block: 1.65rem 0;
  color: var(--tinta-suave);
  font-size: clamp(1rem, 1.5vw, 1.15rem);
  line-height: 1.55;
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
  border: 1px solid #711e3a;
  border-radius: 100vw;
  color: #fff9f5;
  background: var(--tinta);
  box-shadow: 0 8px 16px #731e3a29;
  font-size: 0.95rem;
  font-weight: 600;
}

.boton-abrir:hover {
  background: #8c2e4c;
}

.cumple button {
  cursor: pointer;
}

.cumple button[aria-disabled="true"] {
  cursor: wait;
}

.cumple button:focus-visible {
  outline: 2px solid var(--tinta);
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
  border: 1px dashed #a334573b;
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
  color: #b54a68;
  font-size: clamp(1.6rem, 3vw, 2.6rem);
}

.adorno-flor {
  right: 5%;
  bottom: 8%;
  color: #bd5274;
  font-size: clamp(1.8rem, 3.5vw, 3.1rem);
  rotate: 14deg;
}

.adorno-destello {
  top: 16%;
  right: 4%;
  color: #9d522d;
  font-size: clamp(1.4rem, 2.7vw, 2.4rem);
}

.adorno-corazon {
  bottom: 5%;
  left: 12%;
  color: #c36d84;
  font-size: 1.1rem;
  rotate: -17deg;
}

.carta-abierta {
  display: grid;
  width: min(100%, 65rem);
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.85fr);
  align-items: center;
  gap: 2rem clamp(2.5rem, 7vw, 6.5rem);
  animation: revelar 500ms ease-out both;
}

.papel {
  position: relative;
  padding: clamp(2rem, 5vw, 3.65rem);
  border: 1px solid #edc8c9;
  border-radius: 3px;
  background: var(--papel);
  box-shadow:
    0 21px 64px #721c3121,
    0 2px 4px #721c310d;
}

.papel::before {
  position: absolute;
  inset: 0.6rem;
  border: 1px solid #edd2cf;
  border-radius: 2px;
  content: "";
  pointer-events: none;
}

.papel h1 {
  font-size: clamp(3.1rem, 6.35vw, 6rem);
  line-height: 0.98;
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

.recuerdos {
  display: grid;
  min-width: 0;
  width: min(100%, 21rem);
  justify-self: center;
  gap: 1.05rem;
}

.album {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-areas: "foto";
  rotate: 4deg;
}

.album::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  border: 1px solid #e9a9b8;
  border-radius: 3px;
  background: #f4c3d0;
  box-shadow: 0 12px 28px #84234e15;
  rotate: -11deg;
  content: "";
}

.polaroid {
  z-index: 1;
  grid-area: foto;
  margin: 0;
  padding: 0.85rem 0.85rem 0.6rem;
  border: 1px solid #eed4d0;
  border-radius: 3px;
  background: #fffcf7;
  box-shadow: 0 14px 38px #651d352b;
}

.ventana-foto {
  overflow: hidden;
  aspect-ratio: 1;
  background: #e9bcc8;
}

.ventana-foto img {
  display: block;
  width: 300%;
  max-width: none;
  height: 100%;
  object-fit: cover;
}

.polaroid figcaption {
  padding: 0.5rem 0.4rem 0.2rem;
  color: var(--tinta);
  font-family: var(--serif);
  font-size: clamp(1.4rem, 3vw, 1.95rem);
  font-style: italic;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.controles-fotos {
  display: flex;
  align-items: center;
  justify-content: center;
}

.boton-foto,
.boton-pausa {
  display: grid;
  width: 2rem;
  min-height: 2.75rem;
  place-items: center;
  border: 0;
  border-radius: 100vw;
  color: var(--tinta);
  background: transparent;
}

.boton-foto span {
  width: 0.65rem;
  height: 0.65rem;
  border: 1px solid #9e405e;
  border-radius: 50%;
}

.boton-foto[aria-current="true"] span {
  background: var(--tinta);
}

.boton-foto:hover,
.boton-pausa:hover,
.boton-cerrar:hover {
  background: #b43f6315;
}

.boton-cerrar {
  display: inline-flex;
  min-height: 2.75rem;
  grid-column: 1 / -1;
  align-items: center;
  justify-self: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid #b9607b66;
  border-radius: 100vw;
  color: var(--tinta);
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
}

.galeria-enter-active {
  transition:
    opacity 650ms ease,
    transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
}

.galeria-enter-from {
  opacity: 0;
  transform: translateY(26px) rotate(-7deg) scale(0.92);
}

.foto-enter-active,
.foto-leave-active {
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}

.foto-enter-from {
  opacity: 0;
  transform: translate(12px, 8px) rotate(4deg) scale(0.96);
}

.foto-leave-to {
  opacity: 0;
  transform: translate(-12px, -8px) rotate(-4deg) scale(0.96);
}

.confeti {
  position: fixed;
  z-index: 3;
  inset: 0;
  pointer-events: none;
}

.confeti span {
  position: absolute;
  top: 48%;
  left: 50%;
  font-size: clamp(1rem, 2.6vw, 1.9rem);
  animation: celebrar 1450ms var(--demora) cubic-bezier(0.12, 0.65, 0.22, 1)
    both;
}

@keyframes revelar {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

@keyframes celebrar {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }

  19% {
    opacity: 0.95;
  }

  100% {
    opacity: 0;
    transform: translate(var(--x), var(--y)) rotate(var(--giro)) scale(0.8);
  }
}

@media (max-width: 760px) {
  .cumple {
    background:
      radial-gradient(ellipse at 62% 54%, #f7cdd6 0, transparent 68%), #fff6ef;
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
    font-size: clamp(3.65rem, 11.7vw, 5.5rem);
  }

  .portada .marca {
    justify-content: center;
  }

  .portada p {
    margin-top: 1.05rem;
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
    max-width: 30rem;
    grid-template-columns: minmax(0, 1fr);
    gap: 2.65rem;
  }

  .recuerdos {
    width: min(85%, 19rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .boton-sobre,
  .galeria-enter-active,
  .foto-enter-active,
  .foto-leave-active {
    transition: none;
  }

  .carta-abierta {
    animation: none;
  }

  .confeti {
    display: none;
  }
}
</style>
