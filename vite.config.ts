import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const apiUrl = env.VITE_API_URL

  if (!apiUrl) {
    throw new Error('VITE_API_URL must be set in the frontend environment.')
  }

  const apiBase = new URL(apiUrl)
  if (!['http:', 'https:'].includes(apiBase.protocol)) {
    throw new Error('VITE_API_URL must use HTTP or HTTPS.')
  }
  const backendPath = apiBase.pathname.replace(/\/$/, '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, 'src'),
      },
    },
    server: {
      proxy: {
        '/api/v1': {
          target: apiBase.origin,
          changeOrigin: true,
          ...(backendPath && {
            rewrite: (requestPath) => `${backendPath}${requestPath}`,
          }),
        },
      },
    },
  }
})
