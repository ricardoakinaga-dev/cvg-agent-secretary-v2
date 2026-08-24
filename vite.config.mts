import { defineConfig } from 'vite'

const apiPort = process.env.CVG_API_PORT ?? '3100'

export default defineConfig({
  server: {
    proxy: {
      '/v1': `http://127.0.0.1:${apiPort}`,
      '/health': `http://127.0.0.1:${apiPort}`
    }
  }
})
