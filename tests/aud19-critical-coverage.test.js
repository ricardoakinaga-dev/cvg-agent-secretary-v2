import { describe, expect, it } from 'vitest'
import {
  evaluateCriticalCoverage,
  evaluateGlobalCoverage,
  loadCriticalCoverageManifest
} from '../scripts/aud19-critical-coverage.mjs'

const manifest = {
  kind: 'aud19-critical-coverage',
  floorBranchesPct: 95,
  criticalModules: {
    kernel: ['packages/agent-runtime/src/orchestration.ts'],
    canal: ['packages/channel-gateway/src']
  }
}

function metrics(pct, total) {
  return {
    branches: { pct, total, covered: Math.round((pct / 100) * total) }
  }
}

describe('AUD19 critical coverage gate', () => {
  it('accepts modules at or above the frozen floor', () => {
    const report = evaluateCriticalCoverage({
      manifest,
      summary: {
        '/repo/packages/agent-runtime/src/orchestration.ts': metrics(96, 100),
        '/repo/packages/channel-gateway/src/adapters/evolution.ts': metrics(
          95,
          40
        )
      }
    })
    expect(report.valid).toBe(true)
    expect(report.blockers).toEqual([])
  })

  it('rejects a module below the floor and names the blocker', () => {
    const report = evaluateCriticalCoverage({
      manifest,
      summary: {
        '/repo/packages/agent-runtime/src/orchestration.ts': metrics(
          68.38,
          699
        ),
        '/repo/packages/channel-gateway/src/adapters/evolution.ts': metrics(
          100,
          40
        )
      }
    })
    expect(report.valid).toBe(false)
    expect(report.blockers).toContain('critical_branch_coverage:kernel:68.38')
    expect(
      report.modules.find((module) => module.module === 'kernel').pass
    ).toBe(false)
  })

  it('fails closed when a critical module has no measured branches', () => {
    const report = evaluateCriticalCoverage({ manifest, summary: {} })
    expect(report.valid).toBe(false)
    expect(report.modules.every((module) => module.pass === false)).toBe(true)
  })

  it('enforces the global contract floors mechanically', () => {
    const passing = evaluateGlobalCoverage({
      summary: {
        total: {
          statements: { pct: 95.95 },
          branches: { pct: 92.53 },
          functions: { pct: 95.48 },
          lines: { pct: 96.65 }
        }
      }
    })
    expect(passing.valid).toBe(true)
    expect(passing.blockers).toEqual([])

    const failing = evaluateGlobalCoverage({
      summary: {
        total: {
          statements: { pct: 95.95 },
          branches: { pct: 82.51 },
          functions: { pct: 95.48 },
          lines: { pct: 96.65 }
        }
      }
    })
    expect(failing.valid).toBe(false)
    expect(failing.blockers).toContain(
      'global_coverage_below_floor:branches:82.51'
    )

    const missing = evaluateGlobalCoverage({ summary: {} })
    expect(missing.valid).toBe(false)
    expect(missing.blockers).toHaveLength(4)
  })

  it('loads the versioned manifest from the tracking directory', () => {
    const loaded = loadCriticalCoverageManifest(process.cwd())
    expect(loaded).toMatchObject({ kind: 'aud19-critical-coverage' })
    expect(loaded.floorBranchesPct).toBe(95)
  })
})
