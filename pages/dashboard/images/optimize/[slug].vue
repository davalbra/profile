<script setup lang="ts">
/** Services, Components */
const route = useRoute()

/** DefineModel, Ref, Computed */
const slug = computed(() => {
  const raw = route.params.slug
  return Array.isArray(raw) ? raw[0] || "" : String(raw || "")
})

/** Vue */
definePageMeta({
  layout: "dashboard",
})
</script>

<template>
  <DashboardOptimizedImageDetail :slug="slug" />
</template>
