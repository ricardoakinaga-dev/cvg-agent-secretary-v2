import { DomainError } from '@cvg/shared'
import { TenantIdSchema, type TenantId } from '@cvg/platform'
import type { InMemoryDatabase } from '../db.ts'
import type { ApprovalRequestRecord } from '../schema.ts'

export class ApprovalRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  save(
    request: ApprovalRequestRecord,
    rawTenantId?: TenantId
  ): ApprovalRequestRecord {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    if (tenantId && !this.sessionBelongsToTenant(request.sessionId, tenantId)) {
      throw new DomainError('invalid_action', 'Session not found')
    }
    const exists = this.db.state.approvals.some(
      (approval) =>
        approval.id === request.id &&
        (!tenantId || this.sessionBelongsToTenant(approval.sessionId, tenantId))
    )
    this.db.state.approvals = exists
      ? this.db.state.approvals.map((approval) =>
          approval.id === request.id ? request : approval
        )
      : [...this.db.state.approvals, request]
    return request
  }

  findById(id: string, rawTenantId?: TenantId): ApprovalRequestRecord | null {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    return (
      this.db.state.approvals.find(
        (approval) =>
          approval.id === id &&
          (!tenantId ||
            this.sessionBelongsToTenant(approval.sessionId, tenantId))
      ) ?? null
    )
  }

  list(rawTenantId?: TenantId): ApprovalRequestRecord[] {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    return this.db.state.approvals.filter(
      (approval) =>
        !tenantId || this.sessionBelongsToTenant(approval.sessionId, tenantId)
    )
  }

  private sessionBelongsToTenant(
    sessionId: string,
    tenantId: TenantId
  ): boolean {
    const session = this.db.state.sessions.find((item) => item.id === sessionId)
    const conversation = session
      ? this.db.state.conversations.find(
          (item) => item.id === session.conversationId
        )
      : undefined
    return conversation?.tenantId === tenantId
  }
}
