import { randomBytes } from 'node:crypto'
import { Client } from 'pg'
import { describe, expect, it, vi } from 'vitest'
import {
  PostgresRuntimeRepository,
  runPostgresMigrations
} from '../postgres.ts'
const databaseUrl = process.env.TEST_DATABASE_URL
const tenant = 'tenant_00000000-0000-4000-8000-000000000093'
const correlationId = 'corr_00000000-0000-4000-8000-000000000093'
describe('attendance approval PostgreSQL atomicity', () => {
  it.skipIf(!databaseUrl)(
    'forces two connections past the same pending read and rolls back failed audit',
    async () => {
      const schema = `cvg_attendance_${Date.now()}_${randomBytes(3).toString('hex')}`
      const first = new Client({ connectionString: databaseUrl })
      const second = new Client({ connectionString: databaseUrl })
      await first.connect()
      await second.connect()
      try {
        await runPostgresMigrations(first, { schemaName: schema })
        await second.query(`SET search_path TO ${schema}`)
        await first.query("SELECT set_config('cvg.tenant_id', $1, false)", [
          tenant
        ])
        await second.query("SELECT set_config('cvg.tenant_id', $1, false)", [
          tenant
        ])
        const a = new PostgresRuntimeRepository(first, {
            tenantIsolation: true
          }),
          b = new PostgresRuntimeRepository(second, { tenantIsolation: true })
        const { session } = await a.createWithSession({
          tenantId: tenant,
          channel: 'internal',
          senderRef: 'synthetic-attendance',
          externalMessageId: 'synthetic-attendance',
          body: 'Synthetic only'
        })
        const fixture = {
          id: 'approval_synthetic',
          sessionId: session.id,
          proposedAction: 'synthetic_review',
          summary: 'Synthetic only',
          riskLevel: 'low' as const,
          status: 'pending' as const,
          decidedBy: null,
          decidedAt: null,
          createdAt: new Date()
        }
        await a.saveApproval(fixture, tenant)
        let arrivals = 0
        let release!: () => void
        const barrier = new Promise<void>((resolve) => {
          release = resolve
        })
        const spies = [a, b].map((repo) => {
          const original = repo.findApprovalById.bind(repo)
          return vi
            .spyOn(repo, 'findApprovalById')
            .mockImplementationOnce(async (...args) => {
              const snapshot = await original(...args)
              expect(snapshot?.status).toBe('pending')
              arrivals++
              if (arrivals === 2) release()
              await barrier
              return snapshot
            })
        })
        const input = {
          approvalRequestId: fixture.id,
          operatorId: 'synthetic-a',
          role: 'Approver' as const,
          correlationId
        }
        const results = await Promise.allSettled([
          a.decideApprovalWithAudit({ ...input, decision: 'approved' }, tenant),
          b.decideApprovalWithAudit(
            { ...input, operatorId: 'synthetic-b', decision: 'rejected' },
            tenant
          )
        ])
        spies.forEach((spy) => spy.mockRestore())
        expect(arrivals).toBe(2)
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
        expect(results.find((r) => r.status === 'rejected')).toMatchObject({
          reason: { code: 'conflict' }
        })
        const winner = results.find((r) => r.status === 'fulfilled')
        if (winner?.status !== 'fulfilled') throw new Error('winner missing')
        const stored = await a.findApprovalById(fixture.id, tenant)
        expect(stored).toEqual(winner.value)
        const audit = await first.query(
          "SELECT actor_id,payload FROM audit_events WHERE payload->>'approvalRequestId' = $1",
          [fixture.id]
        )
        expect(audit.rows).toHaveLength(1)
        expect(audit.rows[0]).toMatchObject({
          actor_id: stored!.decidedBy,
          payload: { status: stored!.status }
        })
        await expect(
          a.saveApproval({ ...fixture, status: 'approved' }, tenant)
        ).rejects.toMatchObject({ code: 'invalid_action' })
        await expect(a.saveApproval(fixture, tenant)).rejects.toMatchObject({
          code: 'conflict'
        })
        await a.saveApproval({ ...fixture, id: 'approval_rollback' }, tenant)
        await first.query(
          `CREATE FUNCTION reject_attendance_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$`
        )
        await first.query(
          'CREATE TRIGGER reject_attendance_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_attendance_audit()'
        )
        await expect(
          a.decideApprovalWithAudit(
            {
              ...input,
              approvalRequestId: 'approval_rollback',
              decision: 'assumed'
            },
            tenant
          )
        ).rejects.toThrow('synthetic audit failure')
        expect(
          await a.findApprovalById('approval_rollback', tenant)
        ).toMatchObject({ status: 'pending', decidedBy: null, decidedAt: null })
        expect(
          (await first.query('SELECT count(*)::int AS count FROM audit_events'))
            .rows[0].count
        ).toBe(1)
      } finally {
        await first.query('ROLLBACK')
        await first.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
        await Promise.all([first.end(), second.end()])
      }
    },
    20000
  )
})
