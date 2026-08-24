import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

const isCoverageRun = process.argv.some(
  (arg) => arg === '--coverage' || arg.startsWith('--coverage=')
)

const workspaceRoot = process.cwd()

export default defineConfig({
  test: {
    environment: 'jsdom',
    testTimeout: 15000,
    fileParallelism: !isCoverageRun,
    include: [
      'tests/**/*.test.js',
      'tests/**/*.test.ts',
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx'
    ],
    server: {
      deps: {
        inline: [/^@cvg\//]
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      },
      include: ['packages/**/*.ts', 'apps/**/*.ts', 'apps/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    }
  },
  ssr: {
    noExternal: [/^@cvg\//]
  },
  resolve: {
    alias: {
      '@cvg/shared': resolve(workspaceRoot, 'packages/shared/src/index.ts'),
      '@cvg/persistence': resolve(
        workspaceRoot,
        'packages/persistence/src/index.ts'
      ),
      '@cvg/policy': resolve(workspaceRoot, 'packages/policy/src/index.ts'),
      '@cvg/tools': resolve(workspaceRoot, 'packages/tools/src/index.ts'),
      '@cvg/agent-core': resolve(
        workspaceRoot,
        'packages/agent-core/src/index.ts'
      ),
      '@cvg/workflows': resolve(
        workspaceRoot,
        'packages/workflows/src/index.ts'
      ),
      '@cvg/adapters': resolve(workspaceRoot, 'packages/adapters/src/index.ts'),
      '@cvg/memory': resolve(workspaceRoot, 'packages/memory/src/index.ts'),
      '@cvg/rag': resolve(workspaceRoot, 'packages/rag/src/index.ts'),
      '@cvg/platform': resolve(workspaceRoot, 'packages/platform/src/index.ts')
    }
  }
})
