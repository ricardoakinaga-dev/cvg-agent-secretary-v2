import { createDomainId, sanitizeAuditEvidencePayload } from '@cvg/shared'
import { TenantIdSchema, type TenantId } from '@cvg/platform'
import type { InMemoryDatabase } from '../db.ts'
import type {
  AuditEventRecord,
  AuditEvidenceFilters,
  AuditEvidencePage,
  AuditEvidenceQuery,
  AuditEvidenceSummary
} from '../schema.ts'

export class AuditRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  append(
    input: Omit<AuditEventRecord, 'id' | 'createdAt'>,
    rawTenantId?: TenantId
  ): AuditEventRecord {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const event: AuditEventRecord = {
      ...input,
      ...(tenantId ? { tenantId } : {}),
      payload: sanitizeAuditEvidencePayload(input.payload).payload,
      id: createDomainId('audit'),
      createdAt: new Date()
    }
    this.db.state.auditEvents = [...this.db.state.auditEvents, event]
    return event
  }

  listByCorrelation(
    correlationId: string,
    rawTenantId?: TenantId
  ): AuditEventRecord[] {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    return this.db.state.auditEvents.filter(
      (event) =>
        event.correlationId === correlationId &&
        (!tenantId || this.eventBelongsToTenant(event, tenantId))
    )
  }

  listBySession(sessionId: string, rawTenantId?: TenantId): AuditEventRecord[] {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    return this.db.state.auditEvents.filter((event) => {
      if (!payloadHasSession(event.payload, sessionId)) {
        return false
      }
      return !tenantId || this.eventBelongsToTenant(event, tenantId)
    })
  }

  listEvidence(
    query: AuditEvidenceQuery,
    rawTenantId?: TenantId
  ): AuditEvidencePage {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const filtered = this.filterEvidence(query, tenantId)
    const items = filtered.slice(query.offset, query.offset + query.limit)
    return {
      items,
      pageInfo: {
        limit: query.limit,
        offset: query.offset,
        total: filtered.length,
        hasNextPage: query.offset + items.length < filtered.length
      }
    }
  }

  summarizeEvidence(
    filters: AuditEvidenceFilters = {},
    rawTenantId?: TenantId
  ): AuditEvidenceSummary {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const filtered = this.filterEvidence(filters, tenantId)
    return summarizeAuditEvents(filtered)
  }

  private filterEvidence(
    filters: AuditEvidenceFilters,
    tenantId?: TenantId
  ): AuditEventRecord[] {
    return this.db.state.auditEvents.filter(
      (event) =>
        auditEventMatches(event, filters) &&
        (!tenantId || this.eventBelongsToTenant(event, tenantId))
    )
  }

  private eventBelongsToTenant(
    event: AuditEventRecord,
    tenantId: TenantId
  ): boolean {
    return event.tenantId === tenantId
  }
}

export function summarizeAuditEvents(
  events: AuditEventRecord[]
): AuditEvidenceSummary {
  return events.reduce<AuditEvidenceSummary>(
    (summary, event) => {
      const sessionId = readPayloadSessionId(event.payload)
      return {
        totalEvents: summary.totalEvents + 1,
        byType: {
          ...summary.byType,
          [event.type]: (summary.byType[event.type] ?? 0) + 1
        },
        byActorType: {
          ...summary.byActorType,
          [event.actorType]: (summary.byActorType[event.actorType] ?? 0) + 1
        },
        byCorrelationId: {
          ...summary.byCorrelationId,
          [event.correlationId]:
            (summary.byCorrelationId[event.correlationId] ?? 0) + 1
        },
        bySessionId: sessionId
          ? {
              ...summary.bySessionId,
              [sessionId]: (summary.bySessionId[sessionId] ?? 0) + 1
            }
          : summary.bySessionId
      }
    },
    {
      totalEvents: 0,
      byType: {},
      byActorType: {},
      byCorrelationId: {},
      bySessionId: {}
    }
  )
}

export function auditEventMatches(
  event: AuditEventRecord,
  filters: AuditEvidenceFilters
): boolean {
  if (filters.sessionId && !payloadHasSession(event.payload, filters.sessionId))
    return false
  if (filters.correlationId && event.correlationId !== filters.correlationId)
    return false
  if (filters.type && event.type !== filters.type) return false
  if (filters.actorId && event.actorId !== filters.actorId) return false
  return true
}

function payloadHasSession(payload: unknown, sessionId: string): boolean {
  return readPayloadSessionId(payload) === sessionId
}

function readPayloadSessionId(payload: unknown): string | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('sessionId' in payload)
  ) {
    return null
  }
  const sessionId = payload.sessionId
  return typeof sessionId === 'string' ? sessionId : null
}
