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
  background: linear-gradient(145deg, #b21928, #650c18);
  box-shadow:
    0 23px 43px -20px rgb(0 0 0 / 74%),
    0 9px 17px -10px rgb(0 0 0 / 62%),
    0 0 0 1px rgb(255 218 142 / 19%);
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
  border: 1px solid #ddcda9;
  border-radius: 3% / 4%;
  background: linear-gradient(160deg, #fffdfa, #f5f0e6);
  box-shadow: 0 4px 10px rgb(36 8 12 / 22%);
  color: #b71728;
  transition: transform 650ms 540ms cubic-bezier(0.22, 1, 0.36, 1);
}

.envelope__note-greeting {
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
  background: linear-gradient(123deg, #c11d2b, #850e1c 77%);
}

.envelope__fold--right {
  clip-path: polygon(100% 0, 39% 57%, 100% 100%);
  background: linear-gradient(231deg, #b21828, #760e1c 77%);
}

.envelope__pocket {
  position: absolute;
  z-index: 3;
  inset: 0;
  filter: drop-shadow(0 -1px 0 rgb(255 218 142 / 34%))
    drop-shadow(0 -3px 4px rgb(40 2 7 / 38%));
}

.envelope__pocket::after {
  position: absolute;
  inset: 0;
  border-radius: 3% / 4.6%;
  background: linear-gradient(167deg, #bc1d2b 34%, #8e1221 100%);
  clip-path: polygon(0 100%, 0 96%, 50% 42%, 100% 96%, 100% 100%);
  content: "";
}

.envelope__recipient {
  position: absolute;
  z-index: 3;
  right: 8%;
  bottom: 8%;
  color: #ffe5a5;
  text-shadow: 0 1px 1px rgb(62 6 12 / 55%);
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(1.05rem, 5.6cqi, 1.65rem);
  font-style: italic;
  font-weight: 600;
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
  filter: drop-shadow(0 1px 0 rgb(255 218 142 / 35%))
    drop-shadow(0 5px 5px rgb(45 3 8 / 49%));
}

.envelope__flap-paper,
.envelope__flap-lining {
  border-radius: 3% 3% 0 0 / 7% 7% 0 0;
  clip-path: polygon(0 0, 100% 0, 53% 92%, 50% 96%, 47% 92%);
}

.envelope__flap-paper {
  background:
    radial-gradient(
      ellipse at 23% -24%,
      rgb(247 207 134 / 48%),
      transparent 43%
    ),
    linear-gradient(160deg, #e12935, #bb1223 68%, #9e0e1e);
  box-shadow: inset 0 1px 0 rgb(255 225 171 / 46%);
}

.envelope__flap-lining {
  transform: rotateY(180deg);
  background: linear-gradient(165deg, #720b18, #b71728);
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
    #484043,
    #231b20 52%,
    #100d0f 91%
  );
  box-shadow:
    inset 1px 2px 2px rgb(251 222 160 / 34%),
    inset -2px -3px 3px rgb(0 0 0 / 46%),
    0 3px 5px rgb(47 5 11 / 64%);
}

.envelope__seal::before {
  position: absolute;
  inset: 13%;
  border: 1px solid #ad7e35;
  border-top-color: #ffe1a1;
  border-left-color: #e5b669;
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 64%);
  content: "";
}

.envelope__seal-heart {
  width: 37%;
  height: auto;
  color: #f4cd80;
  fill: currentColor;
  filter: drop-shadow(0 1px 1px #000);
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
