import { describe, expect, it } from 'vitest'
import {
  InMemoryControlPlaneStore,
  KnowledgeSourceCreateInputSchema,
  KnowledgeSourceTransitionInputSchema
} from '../index.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000101'
const tenantB = 'tenant_00000000-0000-4000-8000-000000000102'

const source = {
  source: 'controlled://institutional-hours',
  version: 'v1',
  label: 'Horários institucionais fictícios',
  description: 'Metadata de fixture sem conteúdo documental.'
}

describe('controlled knowledge source catalog', () => {
  it('validates metadata-only source identity and rejects unsafe input', () => {
    expect(KnowledgeSourceCreateInputSchema.parse(source)).toEqual(source)
    expect(() =>
      KnowledgeSourceCreateInputSchema.parse({
        ...source,
        source: 'https://external.example/knowledge'
      })
    ).toThrow(/source|controlled/i)
    expect(() =>
      KnowledgeSourceCreateInputSchema.parse({
        ...source,
        description: 'secret://token'
      })
    ).toThrow(/secret|metadata/i)
    expect(() =>
      KnowledgeSourceCreateInputSchema.parse({
        ...source,
        label: 'token metadata'
      })
    ).toThrow(/secret|metadata/i)
    expect(() =>
      KnowledgeSourceCreateInputSchema.parse({ ...source, unexpected: true })
    ).toThrow()
    expect(() =>
      KnowledgeSourceTransitionInputSchema.parse({
        target: 'APPROVED',
        expectedStatus: 'DRAFT',
        source: 'ignored'
      })
    ).toThrow()
  })

  it('keeps source identity immutable, lifecycle preconditioned and tenant-scoped', async () => {
    const store = new InMemoryControlPlaneStore()
    const created = await store.createKnowledgeSource(
      { tenantId: tenantA },
      source,
      'admin.knowledge'
    )
    expect(created).toMatchObject({
      tenantId: tenantA,
      status: 'DRAFT',
      approvedBy: null,
      ...source
    })

    const mutated = await store.getKnowledgeSource(
      { tenantId: tenantA },
      created.id
    )
    if (!mutated) throw new Error('source fixture missing')
    mutated.label = 'tampered'
    expect(
      (await store.getKnowledgeSource({ tenantId: tenantA }, created.id))?.label
    ).toBe(source.label)

    await expect(
      store.createKnowledgeSource(
        { tenantId: tenantA },
        source,
        'admin.knowledge'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const approved = await store.transitionKnowledgeSource(
      { tenantId: tenantA },
      created.id,
      'APPROVED',
      'approver.knowledge',
      'DRAFT'
    )
    expect(approved).toMatchObject({
      status: 'APPROVED',
      approvedBy: 'approver.knowledge'
    })

    await expect(
      store.transitionKnowledgeSource(
        { tenantId: tenantA },
        created.id,
        'ARCHIVED',
        'admin.knowledge',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'conflict' })

    const archived = await store.transitionKnowledgeSource(
      { tenantId: tenantA },
      created.id,
      'ARCHIVED',
      'admin.knowledge',
      'APPROVED'
    )
    expect(archived.status).toBe('ARCHIVED')
    await expect(
      store.transitionKnowledgeSource(
        { tenantId: tenantA },
        created.id,
        'APPROVED',
        'admin.knowledge',
        'ARCHIVED'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    await expect(
      store.getKnowledgeSource({ tenantId: tenantB }, created.id)
    ).resolves.toBeNull()
    await expect(
      store.listKnowledgeSources({ tenantId: tenantB })
    ).resolves.toEqual([])
  })
})
