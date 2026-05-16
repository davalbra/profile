<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
})
</script>

<template>
  <section class="space-y-3">
    <DashboardScrapPlacesOsHeader
      titulo="Mapa 3D Places OS"
      detalle="Neon · ubicaciones guardadas"
      estado="Mapa 3D"
    />
    <DashboardScrapPlacesOsMapPanel />
  </section>
</template>
