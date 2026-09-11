/**
 * Phase 10 backup/restore consistency check. Captures a snapshot of a
 * synthetic database, restores it into a fresh database and verifies digest,
 * tenant isolation and outbox state. Scope: controlled in-memory restore, not
 * a production RPO/RTO measurement.
 *
 * Usage: npx tsx scripts/phase10-restore-check.ts
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  InMemoryDatabase,
  OutboxRepository,
  createDatabaseSnapshot,
  digestDatabaseState,
  restoreDatabaseSnapshot
} from '../packages/persistence/src/index.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tenantId = 'tenant_00000000-0000-4000-8000-000000000098'
const otherTenant = 'tenant_00000000-0000-4000-8000-000000000097'

const source = new InMemoryDatabase()
const outbox = new OutboxRepository(source, { leaseMs: 30_000 })
for (let index = 0; index < 250; index += 1) {
  outbox.enqueue({
    tenantId,
    type: 'message.outbound',
    payload: { index, synthetic: true },
    idempotencyKey: `restore-${String(index).padStart(8, '0')}`,
    correlationId: 'corr_00000000-0000-4000-8000-000000000098'
  })
}

const captureStarted = process.hrtime.bigint()
const snapshot = createDatabaseSnapshot(source, { tenantId })
const captureMs = Number(process.hrtime.bigint() - captureStarted) / 1_000_000

const target = new InMemoryDatabase()
const restoreStarted = process.hrtime.bigint()
const restored = restoreDatabaseSnapshot(target, snapshot, { tenantId })
const restoreMs = Number(process.hrtime.bigint() - restoreStarted) / 1_000_000

let tenantIsolation = false
try {
  createDatabaseSnapshot(source, { tenantId: otherTenant })
} catch {
  tenantIsolation = true
}

const digestMatches =
  restored.digest === snapshot.digest &&
  digestDatabaseState(target.state) === snapshot.digest
const outboxPreserved =
  target.state.outbox.length === source.state.outbox.length
const report = {
  schemaVersion: 1,
  kind: 'phase10-restore-report',
  generatedAt: new Date().toISOString(),
  scope:
    'controlled in-memory snapshot/restore; production RPO/RTO require infrastructure measurement',
  snapshotFormatVersion: snapshot.formatVersion,
  snapshotDigestPrefix: snapshot.digest.slice(0, 16),
  snapshotSha256: createHash('sha256').update(snapshot.digest).digest('hex'),
  captureMs: Math.round(captureMs * 1000) / 1000,
  restoreMs: Math.round(restoreMs * 1000) / 1000,
  integrity: {
    digestMatches,
    outboxPreserved,
    tenantIsolation,
    restoredEvents: target.state.outbox.length
  },
  rpoMeasured: false,
  rtoMeasuredSec: Math.round(restoreMs) / 1000,
  rpoRtoVerdict: 'NOT_VALIDATED_ON_PRODUCTION_INFRASTRUCTURE'
}

fs.mkdirSync(path.join(root, 'certification'), { recursive: true })
fs.writeFileSync(
  path.join(root, 'certification', 'restore-report.json'),
  `${JSON.stringify(report, null, 2)}\n`
)
console.log(JSON.stringify(report))
if (!digestMatches || !outboxPreserved || !tenantIsolation) {
  process.exitCode = 1
}
