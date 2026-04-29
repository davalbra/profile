<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
});

const route = useRoute();
const slug = computed(() => {
  const raw = route.params.slug;
  return Array.isArray(raw) ? raw[0] || "" : String(raw || "");
});
</script>

<template>
  <DashboardOptimizedImageDetail :slug="slug" />
</template>
