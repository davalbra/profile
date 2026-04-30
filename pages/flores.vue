<script setup lang="ts">
type Rosa = {
  id: number;
  x: number;
  y: number;
  scale: number;
  rot: number;
  delay: number;
};

type Petalo = {
  id: number;
  left: number;
  duration: number;
  delay: number;
};

useHead({
  title: "Flores amarillas | davalbra",
  meta: [
    {
      name: "description",
      content: "Un bouquet animado de flores amarillas.",
    },
  ],
});

const montado = ref(false);
const petalos = ref<Petalo[]>([]);

const bouquetRoses = computed<Rosa[]>(() => {
  const center = { x: 200, y: 150 };
  const roses: Rosa[] = [{ id: 0, x: center.x, y: center.y, scale: 1.25, rot: 0, delay: 0 }];

  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI) / 3;
    roses.push({
      id: roses.length,
      x: center.x + Math.cos(angle) * 55,
      y: center.y + Math.sin(angle) * 55,
      scale: 1.15,
      rot: index * 45,
      delay: 300 + index * 100,
    });
  }

  for (let index = 0; index < 12; index += 1) {
    const angle = (index * Math.PI) / 6;
    roses.push({
      id: roses.length,
      x: center.x + Math.cos(angle) * 110,
      y: center.y + Math.sin(angle) * 110,
      scale: 0.95,
      rot: index * 25,
      delay: 1000 + index * 80,
    });
  }

  return roses.sort((first, second) => first.y - second.y);
});

onMounted(() => {
  montado.value = true;
  petalos.value = Array.from({ length: 45 }).map((_, index) => ({
    id: index,
    left: Math.random() * 100,
    duration: 5 + Math.random() * 7,
    delay: Math.random() * 10,
  }));
});
</script>

<template>
  <div v-if="montado" class="flowers-page">
    <div class="ambient ambient-main" aria-hidden="true" />
    <div class="ambient ambient-bottom" aria-hidden="true" />

    <div
      v-for="petalo in petalos"
      :key="petalo.id"
      class="petal-fall"
      :style="{
        left: `${petalo.left}%`,
        animationDuration: `${petalo.duration}s`,
        animationDelay: `${petalo.delay}s`,
      }"
      aria-hidden="true"
    >
      <svg width="24" height="24" viewBox="-12 -12 24 24" class="petal-svg">
        <path
          d="M 0 -10 C -12 -15 -18 -5 -10 0 C -5 5 5 5 10 0 C 18 -5 12 -15 0 -10 Z"
          fill="#fff59d"
        />
      </svg>
    </div>

    <section class="hero-copy text-bloom">
      <h1>Flores Amarillas</h1>
      <div class="title-line" />
      <p>Especialmente para ti</p>
    </section>

    <div class="bouquet-stage">
      <div class="bouquet-scale">
        <div class="bouquet-container">
          <svg viewBox="0 0 400 550" class="bouquet-background" aria-hidden="true">
            <path d="M 40 180 Q 200 120 360 180 L 220 500 Q 200 520 180 500 Z" fill="#d7ccc8" opacity="0.4" />
            <path d="M 40 180 Q 200 120 360 180" fill="none" stroke="#a1887f" stroke-width="2" opacity="0.6" />

            <line
              v-for="rosa in bouquetRoses"
              :key="`stem-${rosa.id}`"
              :x1="rosa.x"
              :y1="rosa.y + 10"
              x2="200"
              y2="420"
              stroke="#2e7d32"
              stroke-width="4"
              opacity="0.8"
            />

            <path d="M 60 220 Q 30 180 50 160 Q 80 180 60 220 Z" fill="#1b5e20" opacity="0.8" />
            <path d="M 340 220 Q 370 180 350 160 Q 320 180 340 220 Z" fill="#2e7d32" opacity="0.8" />
            <path d="M 120 100 Q 100 60 130 50 Q 150 70 120 100 Z" fill="#388e3c" opacity="0.9" />
            <path d="M 280 100 Q 300 60 270 50 Q 250 70 280 100 Z" fill="#2e7d32" opacity="0.9" />
          </svg>

          <div class="roses-layer">
            <div
              v-for="rosa in bouquetRoses"
              :key="`rose-${rosa.id}`"
              class="rose-bloom"
              :style="{
                left: `${rosa.x}px`,
                top: `${rosa.y}px`,
                '--target-scale': String(rosa.scale),
                '--target-rot': `${rosa.rot}deg`,
                animationDelay: `${rosa.delay}ms`,
              }"
            >
              <svg width="100" height="100" viewBox="-40 -40 80 80" class="rose-svg" aria-hidden="true">
                <defs>
                  <radialGradient :id="`petal-outer-${rosa.id}`" cx="50%" cy="100%" r="100%">
                    <stop offset="0%" stop-color="#f57f17" />
                    <stop offset="100%" stop-color="#ffca28" />
                  </radialGradient>
                  <radialGradient :id="`petal-mid-${rosa.id}`" cx="50%" cy="100%" r="100%">
                    <stop offset="0%" stop-color="#f9a825" />
                    <stop offset="100%" stop-color="#ffee58" />
                  </radialGradient>
                  <radialGradient :id="`petal-inner-${rosa.id}`" cx="50%" cy="100%" r="100%">
                    <stop offset="0%" stop-color="#fbc02d" />
                    <stop offset="100%" stop-color="#fff59d" />
                  </radialGradient>
                </defs>
                <circle cx="0" cy="0" r="32" fill="rgba(0,0,0,0.15)" filter="blur(4px)" />
                <path
                  v-for="grado in [0, 72, 144, 216, 288]"
                  :key="`outer-${rosa.id}-${grado}`"
                  :transform="`rotate(${grado})`"
                  d="M 0 -10 C -25 -38 -45 -18 -18 0 C -5 12 18 12 25 0 C 45 -18 25 -38 0 -10 Z"
                  :fill="`url(#petal-outer-${rosa.id})`"
                  stroke="#e65100"
                  stroke-width="0.5"
                />
                <path
                  v-for="grado in [36, 108, 180, 252, 324]"
                  :key="`mid-${rosa.id}-${grado}`"
                  :transform="`rotate(${grado}) scale(0.8)`"
                  d="M 0 -10 C -25 -38 -45 -18 -18 0 C -5 12 18 12 25 0 C 45 -18 25 -38 0 -10 Z"
                  :fill="`url(#petal-mid-${rosa.id})`"
                  stroke="#e65100"
                  stroke-width="0.5"
                />
                <path
                  v-for="grado in [0, 72, 144, 216, 288]"
                  :key="`inner-${rosa.id}-${grado}`"
                  :transform="`rotate(${grado + 15}) scale(0.6)`"
                  d="M 0 -10 C -25 -38 -45 -18 -18 0 C -5 12 18 12 25 0 C 45 -18 25 -38 0 -10 Z"
                  :fill="`url(#petal-inner-${rosa.id})`"
                  stroke="#e65100"
                  stroke-width="0.5"
                />
                <circle cx="0" cy="0" r="12" fill="#fff59d" />
                <path
                  d="M -5 3 C -10 -8 0 -12 6 -3 C 10 7 0 10 -3 2"
                  fill="none"
                  stroke="#f57f17"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
          </div>

          <svg viewBox="0 0 400 550" class="bouquet-front" aria-hidden="true">
            <defs>
              <linearGradient id="frontWrapGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#d7ccc8" />
                <stop offset="50%" stop-color="#faf2ee" />
                <stop offset="100%" stop-color="#a1887f" />
              </linearGradient>
              <filter id="bouquetShadow">
                <feDropShadow dx="0" dy="10" stdDeviation="15" flood-opacity="0.3" />
              </filter>
            </defs>
            <path
              d="M 20 230 C 130 380 180 500 200 520 C 220 500 270 380 380 230 C 280 340 240 380 200 380 C 160 380 120 340 20 230 Z"
              fill="url(#frontWrapGrad)"
              filter="url(#bouquetShadow)"
            />
            <path d="M 20 230 L 160 500 L 200 500 L 100 280 Z" fill="#efebe9" opacity="0.6" />
            <path d="M 380 230 L 240 500 L 200 500 L 300 280 Z" fill="#8d6e63" opacity="0.3" />
            <g transform="translate(200, 390)">
              <path d="M -5 0 C -60 -40 -80 30 -5 10" fill="none" stroke="#ffc107" stroke-width="12" stroke-linecap="round" />
              <path d="M 5 0 C 60 -40 80 30 5 10" fill="none" stroke="#ffca28" stroke-width="12" stroke-linecap="round" />
              <path d="M -8 8 Q -30 60 -20 100" fill="none" stroke="#ffb300" stroke-width="12" stroke-linecap="round" />
              <path d="M 8 8 Q 30 60 20 100" fill="none" stroke="#ffa000" stroke-width="12" stroke-linecap="round" />
              <circle cx="0" cy="5" r="12" fill="#ff8f00" />
              <circle cx="0" cy="5" r="12" fill="none" stroke="#ffe082" stroke-width="2" opacity="0.6" />
            </g>
          </svg>
        </div>
      </div>
    </div>

    <section class="dedication text-bloom">
      <p>
        "Milka, te dedico estas rosas amarillas con muchísimo cariño. Eres alguien verdaderamente especial para mí.
        Me encanta el brillo y la alegría que traes a mi vida, y este detalle es solo una forma de darte las gracias
        por estar en ella."
      </p>
    </section>
  </div>
</template>

<style scoped>
.flowers-page {
  position: relative;
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
  background: #050505;
  padding: 3rem 0;
  color: #fefce8;
}

.ambient {
  pointer-events: none;
  position: absolute;
  border-radius: 9999px;
}

.ambient-main {
  left: 50%;
  top: 50%;
  width: 120vw;
  height: 120vw;
  transform: translate(-50%, -50%);
  background: rgba(234, 179, 8, 0.1);
  filter: blur(140px);
}

.ambient-bottom {
  bottom: 0;
  left: 50%;
  width: 80vw;
  height: 40vw;
  transform: translateX(-50%);
  background: rgba(161, 98, 7, 0.1);
  filter: blur(100px);
}

.hero-copy {
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1rem;
  text-align: center;
  animation-delay: 1500ms;
}

.hero-copy h1 {
  margin: 0 0 1rem;
  background: linear-gradient(135deg, #fefce8, #fde047, #ff8f00);
  background-clip: text;
  color: transparent;
  font-family: Georgia, serif;
  font-size: clamp(3rem, 12vw, 5rem);
  font-style: italic;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  text-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.hero-copy p {
  margin: 0;
  color: rgba(254, 249, 195, 0.8);
  font-size: clamp(1rem, 3vw, 1.25rem);
  font-weight: 300;
  letter-spacing: 0.4em;
  text-transform: uppercase;
}

.title-line {
  width: 16rem;
  height: 1px;
  margin-bottom: 1.5rem;
  background: linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.8), transparent);
}

.bouquet-stage {
  position: relative;
  display: flex;
  width: 100%;
  justify-content: center;
  margin-top: 1.5rem;
}

.bouquet-scale {
  width: 400px;
  height: 550px;
  flex-shrink: 0;
  transform: scale(0.8);
  transform-origin: top;
  margin-bottom: -110px;
}

.bouquet-container {
  position: relative;
  width: 100%;
  height: 100%;
  animation: float 5s ease-in-out infinite;
  transform-origin: center bottom;
}

.bouquet-background,
.bouquet-front {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.bouquet-background {
  z-index: 10;
}

.bouquet-front {
  z-index: 30;
  filter: drop-shadow(0 25px 25px rgba(0, 0, 0, 0.35));
}

.roses-layer {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 20;
}

.rose-bloom {
  position: absolute;
  opacity: 0;
  animation: bloom 1.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.rose-svg {
  overflow: visible;
  filter: drop-shadow(0 18px 12px rgba(0, 0, 0, 0.35));
}

.petal-fall {
  pointer-events: none;
  position: absolute;
  top: -10vh;
  z-index: 20;
  animation: fall linear forwards infinite;
}

.petal-svg {
  opacity: 0.8;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.dedication {
  z-index: 50;
  max-width: 48rem;
  margin-top: 2rem;
  padding: 0 1.5rem;
  text-align: center;
  animation-delay: 2500ms;
}

.dedication p {
  margin: 0;
  color: rgba(254, 252, 232, 0.9);
  font-family: Georgia, serif;
  font-size: clamp(1.1rem, 4vw, 1.5rem);
  font-style: italic;
  font-weight: 300;
  letter-spacing: 0.025em;
  line-height: 1.75;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}

.text-bloom {
  opacity: 0;
  animation: text-bloom 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-10px) rotate(1deg);
  }
}

@keyframes fall {
  0% {
    transform: translateY(-100vh) rotate(0deg) scale(0.5);
    opacity: 0;
  }

  10%,
  90% {
    opacity: 1;
  }

  100% {
    transform: translateY(100vh) rotate(360deg) scale(1);
    opacity: 0;
  }
}

@keyframes bloom {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(var(--target-rot, 0deg));
    opacity: 0;
  }

  100% {
    transform: translate(-50%, -50%) scale(var(--target-scale, 1)) rotate(var(--target-rot, 0deg));
    opacity: 1;
  }
}

@keyframes text-bloom {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (min-width: 640px) {
  .bouquet-scale {
    transform: scale(0.9);
    margin-bottom: -55px;
  }
}

@media (min-width: 768px) {
  .bouquet-stage {
    margin-top: 2rem;
  }

  .bouquet-scale {
    transform: scale(1);
    margin-bottom: 0;
  }
}
</style>
