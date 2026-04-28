<script setup lang="ts">
import { Toaster } from "vue-sonner";
import "vue-sonner/style.css";
</script>

<template>
  <div class="app-shell min-h-screen">
    <Toaster position="top-right" rich-colors expand close-button />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
