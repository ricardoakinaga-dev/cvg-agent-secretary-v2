import { createHash } from 'node:crypto'
import { z } from 'zod'
import { canonicalizeJson } from '@cvg/shared'

export const GENESIS_HASH = '0'.repeat(64)

export const AuditLedgerEntrySchema = z
  .object({
    eventId: z.string().min(1).max(200),
    type: z.string().min(1).max(160),
    actor: z.string().min(1).max(200),
    tenantId: z.string().min(1).max(120),
    correlationId: z.string().min(8).max(120),
    timestamp: z.string().datetime(),
    payload: z.unknown().optional()
  })
  .strict()

export type AuditLedgerEntry = z.output<typeof AuditLedgerEntrySchema>
export type AuditLedgerEntryInput = z.input<typeof AuditLedgerEntrySchema>

export interface AuditLedgerRecord extends AuditLedgerEntry {
  sequence: number
  previousHash: string
  payloadHash: string
  eventHash: string
}

export interface AuditLedgerVerification {
  valid: boolean
  brokenAt?: number
  reason?: string
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function computePayloadHash(payload: unknown): string {
  return sha256(canonicalizeJson(payload ?? null))
}

function computeEventHash(
  record: Omit<AuditLedgerRecord, 'eventHash'>
): string {
  return sha256(
    canonicalizeJson({
      sequence: record.sequence,
      previousHash: record.previousHash,
      payloadHash: record.payloadHash,
      eventId: record.eventId,
      type: record.type,
      actor: record.actor,
      tenantId: record.tenantId,
      correlationId: record.correlationId,
      timestamp: record.timestamp
    })
  )
}

/**
 * Append-only hash-chained audit ledger. Each event binds the previous event
 * hash, its own payload hash and its metadata, so silent tampering breaks the
 * chain and is detectable. This is integrity, not blockchain.
 */
export class HashChainedAuditLedger {
  readonly #records: AuditLedgerRecord[] = []

  append(entry: AuditLedgerEntryInput): AuditLedgerRecord {
    const parsed = AuditLedgerEntrySchema.parse(entry)
    const previous = this.#records[this.#records.length - 1]
    const base: Omit<AuditLedgerRecord, 'eventHash'> = {
      ...parsed,
      sequence: (previous?.sequence ?? 0) + 1,
      previousHash: previous?.eventHash ?? GENESIS_HASH,
      payloadHash: computePayloadHash(parsed.payload)
    }
    const record: AuditLedgerRecord = {
      ...base,
      eventHash: computeEventHash(base)
    }
    this.#records.push(record)
    return record
  }

  /**
   * Returns the internal records for inspection/verification. References are
   * exposed so adversarial tests can prove tampering is detected; callers must
   * not mutate them in production paths.
   */
  records(): AuditLedgerRecord[] {
    return [...this.#records]
  }

  recordsForTrace(traceId: string): AuditLedgerRecord[] {
    const prefix = `evt_${traceId}_`
    return this.#records.filter((record) => record.eventId.startsWith(prefix))
  }

  head(): AuditLedgerRecord | undefined {
    const head = this.#records[this.#records.length - 1]
    return head ? { ...head } : undefined
  }

  size(): number {
    return this.#records.length
  }

  verify(): AuditLedgerVerification {
    let previousHash = GENESIS_HASH
    for (const [index, record] of this.#records.entries()) {
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
      const expectedPayload = computePayloadHash(record.payload)
      if (record.payloadHash !== expectedPayload) {
        return {
          valid: false,
          brokenAt: index,
          reason: 'payload_hash_mismatch'
        }
      }
      const recomputed = computeEventHash({
        sequence: record.sequence,
        previousHash: record.previousHash,
        payloadHash: record.payloadHash,
        eventId: record.eventId,
        type: record.type,
        actor: record.actor,
        tenantId: record.tenantId,
        correlationId: record.correlationId,
        timestamp: record.timestamp,
        ...(record.payload !== undefined ? { payload: record.payload } : {})
      })
      if (record.eventHash !== recomputed) {
        return { valid: false, brokenAt: index, reason: 'event_hash_mismatch' }
      }
      previousHash = record.eventHash
    }
    return { valid: true }
  }
}
