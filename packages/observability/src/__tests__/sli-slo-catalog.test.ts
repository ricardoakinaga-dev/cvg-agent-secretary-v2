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

const APPROVED_BY = 'operations'
const APPROVED_AT = '2026-09-25T00:00:00.000Z'
const RECEIPT_PATH =
  'docs/04_audit/evidence/AUD20/AUD20-10-slo-human-approval-20260925.md'

function assertApprovalBacked(
  value: unknown,
  path: string,
  expected: { approvedBy: string; approvedAt: string }
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertApprovalBacked(item, `${path}[${index}]`, expected)
    )
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (key === 'approvedBy') {
      expect(child, `${childPath} must match the human receipt`).toBe(
        expected.approvedBy
      )
    }
    if (key === 'approvedAt') {
      expect(child, `${childPath} must match the human receipt`).toBe(
        expected.approvedAt
      )
    }
    assertApprovalBacked(child, childPath, expected)
  }
}

describe('AUD19-09 SLI/SLO catalog', () => {
  it('covers every alert domain with an SLI and the approved operations owner', () => {
    expect(catalog.schemaVersion).toBe(1)
    expect(catalog.kind).toBe('aud19-09-sli-slo-catalog')
    expect(catalog.task).toBe('AUD19-09')
    const domains = new Set(catalog.slis.map((entry) => entry.domain))
    expect([...domains].sort()).toEqual([...ALERT_DOMAINS].sort())
    for (const entry of catalog.slis) {
      expect(entry.owner).toBe(APPROVED_BY)
      expect(entry.proposedObjective.status).toBe('APPROVED')
      expect(entry.proposedObjective.approvedBy).toBe(APPROVED_BY)
      expect(entry.proposedObjective.approvedAt).toBe(APPROVED_AT)
      expect(entry.unit.length).toBeGreaterThan(0)
      expect(entry.alertRules.length).toBeGreaterThan(0)
      expect(entry.emission.metrics.length).toBeGreaterThan(0)
    }
  })

  it('binds every approval to the human receipt and keeps the guard', () => {
    expect(catalog.governance.sloStatus).toBe('APPROVED')
    expect(catalog.governance.approvalRequired).toBe(true)
    expect(catalog.governance.approvedBy).toBe(APPROVED_BY)
    expect(catalog.governance.approvedAt).toBe(APPROVED_AT)
    const receipt = readFileSync(RECEIPT_PATH, 'utf8')
    expect(receipt).toContain(APPROVED_BY)
    expect(receipt).toContain('2026-12-31')
    assertApprovalBacked(catalog, 'catalog', {
      approvedBy: APPROVED_BY,
      approvedAt: APPROVED_AT
    })
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
