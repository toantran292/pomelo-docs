<script setup>
import DefaultTheme from 'vitepress/theme'
import AppMock from './AppMock.vue'
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #home-hero-after>
      <div class="pom-hero-mock">
        <AppMock />
      </div>
    </template>
  </Layout>
</template>
