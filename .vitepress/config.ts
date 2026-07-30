import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Pomelo',
  description: 'Workspace + service manager for dev (tmux + Docker + Git worktrees)',
  base: '/pomelo-docs/',
  cleanUrls: true,
  ignoreDeadLinks: true,

  // head hrefs are NOT auto-prefixed with `base` (unlike themeConfig.logo),
  // so the site base is spelled out here.
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/pomelo-docs/logo.svg' }],
    ['link', { rel: 'icon', href: '/pomelo-docs/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'apple-touch-icon', href: '/pomelo-docs/icon-192.png' }],
  ],

  // Pomelo docs are full of `{{var:NAME}}` / `{{db:name}}` templates. Inside
  // code, Vue's template tokenizer still scans `{{ }}` (even under v-pre)
  // and errors on the `:` (reads it as a TS annotation). Rather than change
  // Vue's delimiters globally — which breaks the default theme's own
  // `{{ }}` — we entity-encode the braces in rendered code so the tokenizer
  // never sees them; the browser decodes them back to literal `{{ }}`.
  markdown: {
    config: (md) => {
      const enc = (html: string) =>
        html.replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')
      for (const rule of ['fence', 'code_inline'] as const) {
        const orig = md.renderer.rules[rule]!
        md.renderer.rules[rule] = (...args) => enc(orig(...args))
      }
    },
  },

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/install' },
      { text: 'Reference', link: '/reference/config' },
      { text: 'Releases', link: 'https://github.com/toantran292/pomelo-releases/releases' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Install', link: '/guide/install' },
            { text: 'Quick Start', link: '/guide/quickstart' },
            { text: 'Concepts', link: '/guide/concepts' },
            { text: 'The dashboard', link: '/guide/dashboard' },
            { text: 'Architecture', link: '/guide/architecture' }
          ]
        },
        {
          text: 'Workflows',
          items: [
            { text: 'Workspace lifecycle', link: '/guide/workspace' },
            { text: 'Services', link: '/guide/services' },
            { text: 'Databases', link: '/guide/databases' }
          ]
        },
        {
          text: 'Remote & integrations',
          items: [
            { text: 'Remote & failover', link: '/guide/remote' },
            { text: 'Webhooks & OAuth', link: '/guide/webhooks' }
          ]
        },
        {
          text: 'Help',
          items: [
            { text: 'FAQ & troubleshooting', link: '/guide/faq' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'pom.yml', link: '/reference/config' },
            { text: 'CLI commands', link: '/reference/cli' },
            { text: 'Templates', link: '/reference/templates' }
          ]
        }
      ]
    },

    search: { provider: 'local' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/toantran292/pomelo-releases' }
    ],

    footer: {
      message: 'Released under MIT',
      copyright: 'Copyright © toantran292'
    }
  }
})
