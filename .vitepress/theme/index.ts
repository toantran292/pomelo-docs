import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './custom.css'

// Default theme restyled to the app's color language (custom.css), with a
// custom Layout that drops a product mockup under the home hero.
export default { ...DefaultTheme, Layout }
