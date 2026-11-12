<script setup lang="ts">
defineProps<{
  src: string
  alt: string
  giro?: number
  lado: "izquierda" | "derecha"
}>()
</script>

<template>
  <figure class="foto-pegada" :class="`foto-pegada--${lado}`">
    <NuxtImg
      class="foto-pegada__imagen"
      :src="src"
      :alt="alt"
      width="420"
      format="webp"
      :modifiers="giro === undefined ? undefined : { rotate: giro }"
    />
  </figure>
</template>

<style scoped>
.foto-pegada {
  --entrada-x: 100vw;
  --entrada-giro: 20deg;
  --giro-foto: 7deg;
  position: absolute;
  z-index: 2;
  top: 0.4rem;
  left: calc(100% - 0.7rem);
  box-sizing: border-box;
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  width: var(--tamano-foto-pegada);
  aspect-ratio: 1 / 1.06;
  margin: 0;
  padding: clamp(0.22rem, 0.6vw, 0.48rem);
  padding-bottom: clamp(0.36rem, 0.9vw, 0.73rem);
  transform: rotate(var(--giro-foto));
  border: 1px solid #e9e0ce;
  border-radius: 0.2rem;
  background: #fffdfa;
  box-shadow: 0 0.5rem 1.1rem rgb(36 8 12 / 27%);
}

.foto-pegada--izquierda {
  --entrada-x: -100vw;
  --entrada-giro: -20deg;
}

.foto-pegada::before {
  position: absolute;
  z-index: 1;
  top: 1.05rem;
  left: 2%;
  width: 35%;
  height: 14%;
  transform: translate(-50%, -42%) rotate(-13deg);
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

.foto-pegada__imagen {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #f5f0e6;
  object-fit: contain;
}

.foto-pegada-enter-active {
  animation: pegar-foto 760ms both;
}

.foto-pegada-leave-active {
  transition: opacity 200ms ease;
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
  .foto-pegada {
    --giro-foto: 5deg;
    top: -0.5rem;
    right: 0.75rem;
    left: auto;
  }

  .foto-pegada::before {
    top: 0;
    left: 40%;
    width: 45%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .foto-pegada-enter-active {
    animation: none;
  }

  .foto-pegada-leave-active {
    transition: none;
  }
}
</style>
