import { defineConfig } from 'vitest/config'
import base from './vitest.config.mts'

const baseCoverage = base.test?.coverage ?? {}

/**
 * AUD19-08 report-only coverage scope.
 *
 * The primary `vitest.config.mts` scope intentionally keeps bootstrap,
 * browser-rendering and PostgreSQL adapters out of the threshold denominator
 * because they are exercised by dedicated E2E/PostgreSQL smoke gates. This
 * auxiliary scope makes those same files visible in a raw coverage report
 * (frontend TSX and PostgreSQL adapters included) WITHOUT attaching
 * thresholds: the contract floors of the primary scope are neither reduced
 * nor silently replaced. AUD19-12 owns aligning the floors with
 * aaa_quality_contract.md 9.1.
 *
 * Usage:
 *   npx vitest run --coverage --config vitest.coverage-all.config.mts
 */
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      ...baseCoverage,
      include: ['packages/**/*.ts', 'apps/**/*.ts', 'apps/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/node_modules/**',
        '**/main.ts',
        '**/main.tsx',
        '**/dist/**'
      ],
      thresholds: {},
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage/full'
    }
  }
})
