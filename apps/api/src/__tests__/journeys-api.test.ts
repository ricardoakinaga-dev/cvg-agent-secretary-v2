import { buildServer } from '../server.ts'
import { describe, expect, it } from 'vitest'

const tenantId = 'tenant_00000000-0000-0000-0000-000000000801'
const headers = {
  'x-tenant-id': tenantId,
  'x-operator-id': 'operator.journey',
  'x-operator-role': 'Operator'
}

describe('controlled journey API', () => {
  it('exposes tenant-scoped drafts and future slots without confirmation endpoints', async () => {
    const app = buildServer()
    try {
      const owner = await app.inject({
        method: 'POST',
        url: '/v1/journeys/owner-drafts',
        headers,
        payload: {
          phone: '+5511999990001',
          idempotencyKey: 'api-journey-owner-801'
        }
      })
      expect(owner.statusCode).toBe(200)
      const ownerId = owner.json<{
        data: { id: string; candidateIds: string[] }
      }>().data.id
      const search = await app.inject({
        method: 'GET',
        url: '/v1/journeys/owners/search?phone=%2B5511999990001',
        headers
      })
      expect(search.statusCode).toBe(200)
      expect(
        search.json<{ data: { matches: unknown[] } }>().data.matches
      ).toHaveLength(1)
      const patient = await app.inject({
        method: 'POST',
        url: '/v1/journeys/patient-drafts',
        headers,
        payload: {
          ownerDraftId: ownerId,
          ownerCandidateId: owner.json<{ data: { candidateIds: string[] } }>()
            .data.candidateIds[0],
          name: 'Bolt',
          idempotencyKey: 'api-journey-patient-801'
        }
      })
      expect(patient.statusCode).toBe(200)
      const slotResponse = await app.inject({
        method: 'GET',
        url: '/v1/journeys/slots',
        headers
      })
      expect(slotResponse.statusCode).toBe(200)
      expect(
        slotResponse.json<{ data: { slots: Array<{ startsAt: string }> } }>()
          .data.slots[0]!.startsAt
      ).toMatch(/^2026-/)
    } finally {
      await app.close()
    }
  })
})
