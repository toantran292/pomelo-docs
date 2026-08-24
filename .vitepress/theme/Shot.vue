<script setup>
// A screenshot/video slot for docs pages. Two ways to fill it:
//   1. Drop a file in public/shots/ and set src: <Shot src="/shots/db.png" text="…" />
//   2. Or a video:                                <Shot video="/shots/demo.mp4" />
// With neither, it renders a labelled placeholder (the text prop).
defineProps({
  text: { type: String, default: 'Screenshot' },
  src: { type: String, default: '' },
  video: { type: String, default: '' }
})
</script>

<template>
  <img v-if="src" :src="src" :alt="text" class="pom-shot-media" />
  <video v-else-if="video" :src="video" class="pom-shot-media" autoplay loop muted playsinline />
  <div v-else class="pom-shot"><span>{{ text }}</span></div>
</template>

<style scoped>
.pom-shot {
  aspect-ratio: 16 / 9; margin: 22px 0; border-radius: 14px;
  border: 1px dashed var(--vp-c-border); background: var(--vp-c-bg-soft);
  display: flex; align-items: center; justify-content: center; text-align: center; padding: 18px;
  color: var(--vp-c-text-3); font-family: var(--pom-mono); font-size: 13px;
}
.pom-shot-media {
  display: block; width: 100%; margin: 22px 0; border-radius: 14px;
  border: 1px solid var(--vp-c-border);
}
</style>
