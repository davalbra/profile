<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
})
</script>

<template>
  <section class="space-y-3">
    <DashboardScrapPlacesOsHeader
      titulo="Exportar Places OS"
      detalle="Neon · tabla unica indexada por pais"
      estado="Exportar"
    />
    <DashboardScrapPlacesOsExportPanel />
  </section>
</template>
