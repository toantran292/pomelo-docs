<script setup>
// A screenshot/video placeholder for docs pages. Drop a real image in later:
// replace <Shot text="…"/> with ![alt](/shots/foo.png) or a <video>.
defineProps({ text: { type: String, default: 'Screenshot' } })
</script>

<template>
  <div class="pom-shot"><span>{{ text }}</span></div>
</template>

<style scoped>
.pom-shot {
  aspect-ratio: 16 / 9; margin: 22px 0; border-radius: 14px;
  border: 1px dashed var(--vp-c-border); background: var(--vp-c-bg-soft);
  display: flex; align-items: center; justify-content: center; text-align: center; padding: 18px;
  color: var(--vp-c-text-3); font-family: var(--pom-mono); font-size: 13px;
}
</style>
