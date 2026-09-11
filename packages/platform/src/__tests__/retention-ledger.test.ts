import { describe, expect, it } from 'vitest'
import { RetentionLedger } from '../index.ts'

const tenantId = 'tenant_00000000-0000-0000-0000-000000000601' as const

describe('controlled retention ledger', () => {
  it('purges expired operational records and preserves audit evidence', () => {
    let now = new Date('2026-09-05T12:00:00.000Z')
    const ledger = new RetentionLedger(() => now)
    const trace = ledger.append({
      tenantId,
      kind: 'trace',
      expiresAt: new Date('2026-09-05T13:00:00.000Z'),
      metadata: { route: '/fixture' }
    })
    const audit = ledger.append({
      tenantId,
      kind: 'audit',
      expiresAt: new Date('2026-09-05T13:00:00.000Z')
    })
    now = new Date('2026-09-05T14:00:00.000Z')
    expect(ledger.purge(tenantId)).toMatchObject({
      purgedIds: [trace.id],
      preservedAuditIds: [audit.id]
    })
    expect(ledger.list(tenantId).map((item) => item.kind)).toEqual(['audit'])
  })

  it('redacts PII/secrets and exposes tenant-scoped operational aggregates', () => {
    let now = new Date('2026-09-05T12:00:00.000Z')
    const ledger = new RetentionLedger(() => now)
    const trace = ledger.append({
      tenantId,
      kind: 'trace',
      expiresAt: new Date('2026-09-05T13:00:00.000Z'),
      metadata: {
        route: '/fixture',
        email: 'ana@example.com',
        phone: '+5511999999999',
        note: 'token=fixture-secret'
      }
    })
    ledger.append({
      tenantId,
      kind: 'audit',
      expiresAt: new Date('2026-09-05T13:00:00.000Z')
    })
    ledger.append({
      tenantId: 'tenant_00000000-0000-0000-0000-000000000602',
      kind: 'metric',
      expiresAt: new Date('2026-09-05T13:00:00.000Z'),
      metadata: { owner: 'tenant-b@example.com' }
    })

    expect(trace.metadata).toEqual({
      route: '/fixture',
      note: '[redacted-secret]'
    })
    expect(JSON.stringify(trace)).not.toContain('ana@example.com')
    expect(JSON.stringify(trace)).not.toContain('fixture-secret')
    expect(ledger.aggregate(tenantId)).toMatchObject({
      totalRecords: 2,
      activeRecords: 2,
      expiredRecords: 0,
      byKind: { trace: 1, metric: 0, integration: 0, audit: 1 },
      counters: { appended: 2, purged: 0, preservedAudit: 0 }
    })

    now = new Date('2026-09-05T14:00:00.000Z')
    expect(ledger.purge(tenantId)).toMatchObject({
      purgedIds: [trace.id],
      preservedAuditIds: [expect.any(String)]
    })
    expect(ledger.counters(tenantId)).toEqual({
      appended: 2,
      purged: 1,
      preservedAudit: 1
    })
    expect(ledger.aggregate(tenantId)).toMatchObject({
      totalRecords: 1,
      activeRecords: 0,
      expiredRecords: 1,
      byKind: { trace: 0, metric: 0, integration: 0, audit: 1 }
    })
  })
})
