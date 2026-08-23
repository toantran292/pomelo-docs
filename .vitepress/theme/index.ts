import DefaultTheme from 'vitepress/theme'
import PomHome from './PomHome.vue'
import Shot from './Shot.vue'
import './custom.css'

// Default theme, restyled (custom.css) + a bespoke landing (PomHome) and a
// screenshot placeholder (<Shot>) usable in any docs page.
export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('PomHome', PomHome)
    app.component('Shot', Shot)
  },
}
