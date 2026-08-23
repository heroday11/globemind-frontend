import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import vueDevTools from 'vite-plugin-vue-devtools'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import { mockApiPlugin } from './scripts/mock-api-plugin.mjs'

function cloudflareSafeIndexPlugin() {
  return {
    name: 'cloudflare-safe-index',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Rocket Loader rewrites both Vite's modern feature probes and the
        // nomodule fallback. On older browsers that can prevent either entry
        // point from ever running, so keep every generated bootstrap script
        // under Vite's own control.
        return html.replace(/<script(?![^>]*\bdata-cfasync=)([^>]*)>/g, '<script data-cfasync="false"$1>')
      },
    },
  }
}

function manualChunks(id) {
  if (id.includes('node_modules/echarts')) return 'vendor-echarts'
  if (id.includes('node_modules/three')) return 'vendor-three'
  if (id.includes('node_modules/element-plus')) return 'vendor-element'
  if (id.includes('node_modules/vue')) return 'vendor-vue'
  if (id.includes('node_modules/@vue')) return 'vendor-vue'
  if (id.includes('node_modules/pinia')) return 'vendor-vue'
  if (id.includes('node_modules/vue-router')) return 'vendor-vue'
}

function envTruthy(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, root, '')
  const envDev = loadEnv('development', root, '')
  const useApiMock = envTruthy(env.VITE_USE_API_MOCK) || envTruthy(envDev.VITE_USE_API_MOCK)
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_BASE_URL ||
    envDev.VITE_API_PROXY_TARGET ||
    envDev.VITE_API_BASE_URL
  const vllmProxyTarget =
    env.VITE_VLLM_PROXY_TARGET ||
    env.VITE_VLLM_ORIGIN ||
    envDev.VITE_VLLM_PROXY_TARGET ||
    envDev.VITE_VLLM_ORIGIN
  const outputDirectory = process.env.VITE_OUT_DIR || env.VITE_OUT_DIR || 'dist'

  const devProxy = {}
  if (apiProxyTarget && !useApiMock) {
    devProxy['/api'] = {
      target: apiProxyTarget,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '/api'),
      timeout: 300000,
      proxyTimeout: 300000,
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          const u = req.url || ''
          if (u.includes('stream') || u.includes('event-stream')) {
            proxyReq.setHeader('Accept', 'text/event-stream')
            proxyReq.setHeader('Cache-Control', 'no-cache')
          }
        })
      },
    }
  } else if (mode === 'development' && !useApiMock) {
    console.warn(
      '[vite] 未设置 VITE_API_PROXY_TARGET / VITE_API_BASE_URL，/api 代理未启用。请在 .env.development 中配置（见 .env.example）。',
    )
  }
  if (useApiMock && mode === 'development') {
    console.warn('[vite] VITE_USE_API_MOCK 已开启：/api 由本地假数据中间件响应，不会转发到后端。')
  }
  if (vllmProxyTarget) {
    devProxy['/llm'] = {
      target: vllmProxyTarget,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/llm/, ''),
    }
  }

  return {
  publicDir: envTruthy(env.VITE_SKIP_PUBLIC_COPY) ? false : 'public',
  plugins: [
    ...(useApiMock && mode === 'development' ? [mockApiPlugin()] : []),
    cloudflareSafeIndexPlugin(),
    legacy({
      targets: [
        'Chrome >= 49',
        'Edge >= 15',
        'Firefox >= 52',
        'Safari >= 10.1',
      ],
      additionalLegacyPolyfills: [
        'whatwg-fetch',
        'abortcontroller-polyfill/dist/abortcontroller-polyfill-only',
      ],
      modernPolyfills: false,
      renderLegacyChunks: true,
    }),
    vue({
      script: {
        defineModel: true,
      }
    }),
    ...(mode === 'development' ? [vueDevTools()] : []),
    AutoImport({
      dts: mode === 'development' ? 'auto-imports.d.ts' : false,
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      dts: mode === 'development' ? 'components.d.ts' : false,
      resolvers: [ElementPlusResolver()],
    }),
  ],
  server: {
    // 默认仅 127.0.0.1；设为 true 等同 0.0.0.0，局域网其它设备可访问本机 dev server
    host: true,
    port: 5173,
    allowedHosts: true,
    // 局域网：在 .env.development.local 设置 VITE_DEV_PUBLIC_HOST=你的局域网IP
    // origin 让模块、资源与客户端逻辑中的「站点根」与浏览器地址栏一致，避免仍生成 127.0.0.1:5173
    ...(env.VITE_DEV_PUBLIC_HOST
      ? {
          origin: `http://${env.VITE_DEV_PUBLIC_HOST}:5173`,
          hmr: {
            host: env.VITE_DEV_PUBLIC_HOST,
            port: 5173,
            clientPort: 5173,
          },
        }
      : {
          hmr: true,
        }),
    proxy: devProxy,
  },
  // 预览构建产物时同样转发 /api，便于局域网用「生产包」联调本机后端
  preview: {
    host: true,
    port: 4173,
    proxy: devProxy,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
}
})
