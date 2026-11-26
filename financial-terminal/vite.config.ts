import { defineConfig, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'

const outDir = process.env.FINANCIAL_TERMINAL_OUT_DIR || 'dist'
let config: ResolvedConfig

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'disable-cloudflare-rocket-loader',
      transformIndexHtml(html) {
        return html.replace(
          /<script(?![^>]*data-cfasync=)([^>]*type="module"[^>]*)>/g,
          '<script data-cfasync="false"$1>',
        )
      },
    },
    {
      name: 'preload-financial-dashboard',
      apply: 'build',
      configResolved(resolved) {
        config = resolved
      },
      transformIndexHtml() {
        if (config.env.VITE_API_BASE_URL?.trim() ||
            String(config.env.VITE_USE_FIN_API_MOCK).toLowerCase() === 'true') return
        return [{
          tag: 'link', injectTo: 'head-prepend',
          attrs: { rel: 'preload', as: 'fetch', crossorigin: 'anonymous', href: '/api/financial/dashboard' },
        }]
      },
    },
  ],
  base: process.env.NODE_ENV === 'production' ? '/fin-terminal/' : '/',
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) return 'vendor-react'
          if (id.includes('node_modules')) return 'vendor-other'
        },
      },
    },
  },
  server: {
    port: 5175,
    strictPort: true,
  },
})
