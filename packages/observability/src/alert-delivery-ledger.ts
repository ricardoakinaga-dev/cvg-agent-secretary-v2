import { createHash } from 'node:crypto'
import { canonicalizeJson } from '@cvg/shared'
import type { AlertEvaluation, AlertSeverity } from './alerts.ts'

/**
 * Local, append-only delivery ledger for synthetic alert cycles. Every
 * transition is a new hash-chained record: nothing is mutated in place, and
 * out-of-order or missing transitions fail closed instead of being repaired.
 */

export type AlertDeliveryStatus = 'detected' | 'acknowledged' | 'closed'

export const ALERT_DELIVERY_GENESIS_HASH = '0'.repeat(64)

export interface AlertDeliveryEntryInput {
  alertId: string
  ruleId: string
  severity: AlertSeverity
  status: AlertDeliveryStatus
  at: string
  correlationId?: string
}

export interface AlertDeliveryEntry extends AlertDeliveryEntryInput {
  sequence: number
  previousHash: string
  entryHash: string
}

export interface AlertDeliveryVerification {
  valid: boolean
  brokenAt?: number
  reason?: string
}

/**
 * Pure chain verification over supplied entries. Exported so adversarial tests
 * can prove that a tampered copy is detected without exposing the internal
 * record array.
 */
export function verifyAlertDeliveryEntries(
  records: readonly AlertDeliveryEntry[]
): AlertDeliveryVerification {
  let previousHash = ALERT_DELIVERY_GENESIS_HASH
  for (const [index, record] of records.entries()) {
    if (record.sequence !== index + 1) {
      return { valid: false, brokenAt: index, reason: 'sequence_mismatch' }
    }
    if (record.previousHash !== previousHash) {
      return {
        valid: false,
        brokenAt: index,
        reason: 'previous_hash_mismatch'
      }
    }
    const recomputed = computeEntryHash({
      sequence: record.sequence,
      previousHash: record.previousHash,
      alertId: record.alertId,
      ruleId: record.ruleId,
      severity: record.severity,
      status: record.status,
      at: record.at,
      ...(record.correlationId !== undefined
        ? { correlationId: record.correlationId }
        : {})
    })
    if (record.entryHash !== recomputed) {
      return { valid: false, brokenAt: index, reason: 'entry_hash_mismatch' }
    }
    previousHash = record.entryHash
  }
  return { valid: true }
}

export interface AlertDeliveryLedgerPort {
  detect(
    input: AlertDeliveryEntryInput & { status: 'detected' }
  ): AlertDeliveryEntry
  acknowledge(
    alertId: string,
    at: string,
    correlationId?: string
  ): AlertDeliveryEntry
  close(alertId: string, at: string, correlationId?: string): AlertDeliveryEntry
  entries(): AlertDeliveryEntry[]
  status(alertId: string): AlertDeliveryStatus | null
  verify(): AlertDeliveryVerification
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function computeEntryHash(
  record: Omit<AlertDeliveryEntry, 'entryHash'>
): string {
  return sha256(
    canonicalizeJson({
      sequence: record.sequence,
      previousHash: record.previousHash,
      alertId: record.alertId,
      ruleId: record.ruleId,
      severity: record.severity,
      status: record.status,
      at: record.at,
      correlationId: record.correlationId ?? null
    })
  )
}

function requireTimestamp(at: string, label: string): number {
  const parsed = Date.parse(at)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Alert delivery ${label} timestamp is invalid`)
  }
  return parsed
}

export function createInMemoryAlertDeliveryLedger(): AlertDeliveryLedgerPort {
  const records: AlertDeliveryEntry[] = []
  const latestByAlert = new Map<string, AlertDeliveryEntry>()

  const append = (input: AlertDeliveryEntryInput): AlertDeliveryEntry => {
    const atMs = requireTimestamp(input.at, input.status)
    const previousRecord = latestByAlert.get(input.alertId)
    if (input.status === 'detected') {
      if (previousRecord) {
        throw new Error('Alert delivery alert id already exists')
      }
    } else {
      if (!previousRecord) {
        throw new Error('Alert delivery transition requires a detected alert')
      }
      const expectedFrom =
        input.status === 'acknowledged' ? 'detected' : 'acknowledged'
      if (previousRecord.status !== expectedFrom) {
        throw new Error(
          `Alert delivery transition ${input.status} requires ${expectedFrom}`
        )
      }
      const previousMs = requireTimestamp(
        previousRecord.at,
        previousRecord.status
      )
      if (atMs < previousMs) {
        throw new Error('Alert delivery timestamps are out of order')
      }
    }
    const previous = records[records.length - 1]
    const base: Omit<AlertDeliveryEntry, 'entryHash'> = {
      ...input,
      sequence: (previous?.sequence ?? 0) + 1,
      previousHash: previous?.entryHash ?? ALERT_DELIVERY_GENESIS_HASH
    }
    const record: AlertDeliveryEntry = {
      ...base,
      entryHash: computeEntryHash(base)
    }
    records.push(record)
    latestByAlert.set(input.alertId, record)
    return { ...record }
  }

  return {
    detect(input) {
      return append({ ...input, status: 'detected' })
    },
    acknowledge(alertId, at, correlationId) {
      const previous = latestByAlert.get(alertId)
      if (!previous) {
        throw new Error('Alert delivery transition requires a detected alert')
      }
      return append({
        alertId,
        ruleId: previous.ruleId,
        severity: previous.severity,
        status: 'acknowledged',
        at,
        ...(correlationId !== undefined ? { correlationId } : {})
      })
    },
    close(alertId, at, correlationId) {
      const previous = latestByAlert.get(alertId)
      if (!previous) {
        throw new Error('Alert delivery transition requires a detected alert')
      }
      return append({
        alertId,
        ruleId: previous.ruleId,
        severity: previous.severity,
        status: 'closed',
        at,
        ...(correlationId !== undefined ? { correlationId } : {})
      })
    },
    entries() {
      return records.map((record) => ({ ...record }))
    },
    status(alertId) {
      return latestByAlert.get(alertId)?.status ?? null
    },
    verify() {
      return verifyAlertDeliveryEntries(records)
    }
  }
}

export interface AlertDeliveryCycleRecord {
  alertId: string
  ruleId: string
  severity: AlertSeverity
  detectedAt: string
  acknowledgedAt: string
  closedAt: string
  correlationId?: string
}

export interface AlertDeliveryCycleInput {
  evaluations: readonly AlertEvaluation[]
  ledger: AlertDeliveryLedgerPort
  /** Injected operator acknowledgement time; must not precede detection. */
  acknowledgeAt: string
  /** Injected operator close time; must not precede acknowledgement. */
  closeAt: string
  correlationId?: string
  /** Operator simulation; returning false leaves the cycle incomplete. */
  acknowledge?: (evaluation: AlertEvaluation) => boolean
}

export interface AlertDeliveryCycleResult {
  cycles: AlertDeliveryCycleRecord[]
  firingRules: string[]
  noDataRules: string[]
}

/**
 * Delivers every firing evaluation through the full
 * detected -> acknowledged -> closed cycle. `no_data` is treated as OK (no
 * cycle, no failure); a missing acknowledgement or an out-of-order timestamp
 * throws, so the exercise cannot pass on a partial delivery.
 */
export function deliverAlertCycles(
  input: AlertDeliveryCycleInput
): AlertDeliveryCycleResult {
  const cycles: AlertDeliveryCycleRecord[] = []
  const firingRules: string[] = []
  const noDataRules: string[] = []
  for (const evaluation of input.evaluations) {
    if (evaluation.state === 'no_data') {
      noDataRules.push(evaluation.ruleId)
      continue
    }
    if (evaluation.state !== 'firing') continue
    firingRules.push(evaluation.ruleId)
    const alertId = `${evaluation.ruleId}:${evaluation.evaluatedAt}`
    input.ledger.detect({
      alertId,
      ruleId: evaluation.ruleId,
      severity: evaluation.severity,
      status: 'detected',
      at: evaluation.evaluatedAt,
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {})
    })
    const acknowledged = input.acknowledge?.(evaluation) ?? true
    if (!acknowledged) {
      throw new Error('Alert delivery acknowledgement is missing')
    }
    input.ledger.acknowledge(alertId, input.acknowledgeAt, input.correlationId)
    input.ledger.close(alertId, input.closeAt, input.correlationId)
    cycles.push({
      alertId,
      ruleId: evaluation.ruleId,
      severity: evaluation.severity,
      detectedAt: evaluation.evaluatedAt,
      acknowledgedAt: input.acknowledgeAt,
      closedAt: input.closeAt,
      ...(input.correlationId !== undefined
        ? { correlationId: input.correlationId }
        : {})
    })
  }
  return { cycles, firingRules, noDataRules }
}
