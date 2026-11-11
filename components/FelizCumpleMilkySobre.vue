<script setup lang="ts">
import { Heart } from "lucide-vue-next"

defineProps<{ opening: boolean }>()
</script>

<template>
  <span class="envelope" :class="{ 'is-opening': opening }" aria-hidden="true">
    <span class="envelope__body"></span>

    <span class="envelope__note">
      <Heart class="envelope__note-heart" />
      <span class="envelope__note-greeting">Querida Milky,</span>
    </span>

    <span class="envelope__fold envelope__fold--left"></span>
    <span class="envelope__fold envelope__fold--right"></span>
    <span class="envelope__pocket"></span>
    <span class="envelope__recipient">Para Milky</span>

    <span class="envelope__flap">
      <span class="envelope__flap-front">
        <span class="envelope__flap-paper"></span>
        <span class="envelope__seal">
          <Heart class="envelope__seal-heart" />
        </span>
      </span>
      <span class="envelope__flap-lining"></span>
    </span>
  </span>
</template>

<style scoped>
.envelope {
  position: relative;
  display: block;
  width: 100%;
  max-width: 460px;
  aspect-ratio: 23 / 15;
  isolation: isolate;
  container-type: inline-size;
  perspective: 1100px;
  transform: rotate(-3deg);
}

.envelope__body {
  position: absolute;
  inset: 0;
  border-radius: 3% / 4.6%;
  background: linear-gradient(145deg, #f7d5d9, #d790a4);
  box-shadow:
    0 23px 43px -20px rgb(113 30 58 / 40%),
    0 9px 17px -10px rgb(113 30 58 / 27%),
    0 0 0 1px rgb(113 30 58 / 9%);
}

.envelope__note {
  position: absolute;
  z-index: 2;
  inset: -2% 7% 15%;
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 0.25rem;
  padding-top: 8%;
  border: 1px solid #ead4c4;
  border-radius: 3% / 4%;
  background: linear-gradient(160deg, #fffbef, #f6e7d8);
  box-shadow: 0 4px 10px rgb(113 30 58 / 15%);
  color: #bd5274;
  transition: transform 650ms 540ms cubic-bezier(0.22, 1, 0.36, 1);
}

.envelope__note-greeting {
  color: #711e3a;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(1.1rem, 8cqi, 2.4rem);
  font-style: italic;
  font-weight: 600;
  line-height: 1.2;
}

.envelope__note-heart {
  width: 6%;
  height: auto;
  fill: currentColor;
}

.envelope__fold {
  position: absolute;
  z-index: 3;
  inset: 0;
  border-radius: 3% / 4.6%;
}

.envelope__fold--left {
  clip-path: polygon(0 0, 61% 57%, 0 100%);
  background: linear-gradient(123deg, #f4cbd2, #e6a5b5 70%);
}

.envelope__fold--right {
  clip-path: polygon(100% 0, 39% 57%, 100% 100%);
  background: linear-gradient(231deg, #f4cbd3, #de96ab 77%);
}

.envelope__pocket {
  position: absolute;
  z-index: 3;
  inset: 0;
  filter: drop-shadow(0 -1px 1px rgb(113 30 58 / 24%));
}

.envelope__pocket::after {
  position: absolute;
  inset: 0;
  border-radius: 3% / 4.6%;
  background: linear-gradient(167deg, #f8d5d9 34%, #e9acbb 100%);
  clip-path: polygon(0 100%, 0 96%, 50% 42%, 100% 96%, 100% 100%);
  content: "";
}

.envelope__recipient {
  position: absolute;
  z-index: 3;
  right: 8%;
  bottom: 8%;
  color: #711e3a;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(1.05rem, 5.6cqi, 1.65rem);
  font-style: italic;
  font-weight: 500;
  line-height: 1;
}

.envelope__flap {
  position: absolute;
  z-index: 4;
  inset: 0 0 40%;
  transform-origin: center top;
  transform-style: preserve-3d;
  transition:
    transform 540ms cubic-bezier(0.4, 0, 0.2, 1),
    z-index 0s 270ms;
}

.envelope__flap-front,
.envelope__flap-lining,
.envelope__flap-paper {
  position: absolute;
  inset: 0;
}

.envelope__flap-front,
.envelope__flap-lining {
  backface-visibility: hidden;
}

.envelope__flap-front {
  filter: drop-shadow(0 4px 3px rgb(113 30 58 / 20%));
}

.envelope__flap-paper,
.envelope__flap-lining {
  border-radius: 3% 3% 0 0 / 7% 7% 0 0;
  clip-path: polygon(0 0, 100% 0, 53% 92%, 50% 96%, 47% 92%);
}

.envelope__flap-paper {
  background: linear-gradient(160deg, #fce0e1, #edb0be 77%, #eaa6b8);
}

.envelope__flap-lining {
  transform: rotateY(180deg);
  background: linear-gradient(165deg, #d891a6, #f1bfca);
}

.envelope__seal {
  position: absolute;
  bottom: -5%;
  left: 50%;
  display: grid;
  width: 15%;
  aspect-ratio: 1;
  place-items: center;
  transform: translateX(-50%) rotate(8deg);
  border-radius: 48% 52% 46% 54% / 53% 46% 54% 47%;
  background: radial-gradient(
    circle at 34% 24%,
    #aa4c66,
    #842b46 52%,
    #63192f 91%
  );
  box-shadow:
    inset 1px 2px 2px rgb(255 210 218 / 34%),
    inset -2px -3px 3px rgb(68 12 29 / 46%),
    0 3px 5px rgb(113 30 58 / 30%);
}

.envelope__seal::before {
  position: absolute;
  inset: 13%;
  border: 1px solid rgb(250 161 182 / 38%);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgb(62 9 27 / 38%);
  content: "";
}

.envelope__seal-heart {
  width: 37%;
  height: auto;
  color: #f6beca;
  fill: currentColor;
  filter: drop-shadow(0 1px 1px #59172b);
}

.is-opening .envelope__flap {
  z-index: 1;
  transform: rotateX(175deg);
}

.is-opening .envelope__note {
  transform: translateY(-58%);
}

@media (prefers-reduced-motion: reduce) {
  .envelope__flap,
  .envelope__note {
    transition: none;
  }
}
</style>
