import { describe, expect, it } from 'vitest'
import {
  evaluateCriticalCoverage,
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

  it('loads the versioned manifest from the tracking directory', () => {
    const loaded = loadCriticalCoverageManifest(process.cwd())
    expect(loaded).toMatchObject({ kind: 'aud19-critical-coverage' })
    expect(loaded.floorBranchesPct).toBe(95)
  })
})
