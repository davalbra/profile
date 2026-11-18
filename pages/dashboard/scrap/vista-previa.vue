<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
})
</script>

<template>
  <section class="space-y-3">
    <DashboardScrapPlacesOsHeader
      titulo="Scrap"
      detalle="/api/scrap/foursquare-os"
      estado="Vista previa"
    />
    <DashboardScrapPlacesOsRowsTable />
  </section>
</template>
