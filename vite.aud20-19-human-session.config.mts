import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.join(repositoryRoot, 'apps/web'),
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
    hmr: false,
    proxy: {}
  },
  clearScreen: false
})
