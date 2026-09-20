import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALERT_DOMAINS } from '../alerts.ts'

interface SliEntry {
  domain: string
  sli: string
  unit: string
  emission: {
    status: string
    metrics: string[]
    source: string
    notes?: string
  }
  proposedObjective: {
    target: string
    window: string
    status: string
    approvedBy: string | null
    approvedAt: string | null
  }
  owner: string | null
  alertRules: string[]
}

interface SliSloCatalog {
  schemaVersion: number
  kind: string
  task: string
  governance: {
    sloStatus: string
    approvalRequired: boolean
    approvedBy: string | null
    approvedAt: string | null
    policy: string
  }
  slis: SliEntry[]
  limitations: string[]
}

const catalogPath = 'docs/04_audit/evidence/AUD19/AUD19-09-sli-slo.json'
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as SliSloCatalog

function sourceFiles(root: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry === '__tests__') continue
    const path = join(root, entry)
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(path)
    }
  }
  return files
}

function assertNoInventedApproval(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoInventedApproval(item, `${path}[${index}]`)
    )
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (key === 'approvedBy' || key === 'approvedAt') {
      expect(
        child,
        `${childPath} must stay null until a human owner approves`
      ).toBeNull()
    }
    if (
      key === 'status' &&
      typeof child === 'string' &&
      child.includes('APPROVED') &&
      !child.includes('NOT_APPROVED')
    ) {
      throw new Error(`${childPath} claims an approved status: ${child}`)
    }
    assertNoInventedApproval(child, childPath)
  }
}

describe('AUD19-09 SLI/SLO catalog', () => {
  it('covers every alert domain with an SLI and a pending owner', () => {
    expect(catalog.schemaVersion).toBe(1)
    expect(catalog.kind).toBe('aud19-09-sli-slo-catalog')
    expect(catalog.task).toBe('AUD19-09')
    const domains = new Set(catalog.slis.map((entry) => entry.domain))
    expect([...domains].sort()).toEqual([...ALERT_DOMAINS].sort())
    for (const entry of catalog.slis) {
      expect(entry.owner).toBeNull()
      expect(entry.proposedObjective.status).toBe('PROPOSED_NOT_APPROVED')
      expect(entry.proposedObjective.approvedBy).toBeNull()
      expect(entry.proposedObjective.approvedAt).toBeNull()
      expect(entry.unit.length).toBeGreaterThan(0)
      expect(entry.alertRules.length).toBeGreaterThan(0)
      expect(entry.emission.metrics.length).toBeGreaterThan(0)
    }
  })

  it('never invents an approvedBy or an approved SLO', () => {
    expect(catalog.governance.sloStatus).toBe('PROPOSED_NOT_APPROVED')
    expect(catalog.governance.approvalRequired).toBe(true)
    assertNoInventedApproval(catalog, 'catalog')
    const serialized = JSON.stringify(catalog)
    expect(serialized).not.toContain('"approvalState":"APPROVED"')
  })

  it('only claims emission for metrics that exist in the codebase', () => {
    const sources = [...sourceFiles('apps'), ...sourceFiles('packages')].filter(
      (file) => !file.startsWith('packages/observability')
    )
    const corpus = sources.map((file) => readFileSync(file, 'utf8')).join('\n')
    for (const entry of catalog.slis) {
      if (entry.emission.status !== 'EMITTED') {
        expect(entry.emission.notes?.length ?? 0).toBeGreaterThan(0)
        continue
      }
      for (const metric of entry.emission.metrics) {
        expect(
          corpus.includes(metric),
          `${entry.domain} claims emitted metric ${metric}`
        ).toBe(true)
      }
      expect(entry.emission.source.length).toBeGreaterThan(0)
    }
  })

  it('declares the non-production limitations', () => {
    expect(catalog.limitations.length).toBeGreaterThanOrEqual(4)
    expect(JSON.stringify(catalog.limitations)).toContain('owner')
  })
})
