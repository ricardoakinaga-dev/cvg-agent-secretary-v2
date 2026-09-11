import { describe, expect, it } from 'vitest'
import {
  answerFromInstitutionalSource,
  noopRagSource,
  VersionedKnowledgeCatalog
} from '../index.ts'

describe('institutional RAG safety', () => {
  it('hands off when source is missing or question is clinical', () => {
    expect(noopRagSource()).toBeNull()
    expect(answerFromInstitutionalSource('Qual horario?', null)).toEqual({
      status: 'handoff',
      reason: 'approved_source_missing'
    })
    expect(
      answerFromInstitutionalSource('Qual tratamento?', {
        version: 'v1',
        answer: 'x',
        source: 'manual'
      })
    ).toEqual({
      status: 'handoff',
      reason: 'medical_question'
    })
  })

  it('answers institutional questions with source and version evidence', () => {
    expect(
      answerFromInstitutionalSource('Qual endereco?', {
        version: 'v1',
        answer: 'Rua 1',
        source: 'manual-cvg'
      })
    ).toEqual({
      status: 'answered',
      answer: 'Rua 1',
      source: 'manual-cvg',
      version: 'v1'
    })
  })

  it('requires publication and hands off after revocation', () => {
    const catalog = new VersionedKnowledgeCatalog()
    const tenantId = 'tenant_00000000-0000-0000-0000-000000000501' as const
    const source = catalog.add({
      tenantId,
      version: 'fixture-v1',
      question: 'horário',
      answer: 'Resposta administrativa',
      source: 'fixture-manual'
    })
    expect(catalog.answer(tenantId, 'Qual o horário?')).toEqual({
      status: 'handoff',
      reason: 'approved_source_missing'
    })
    catalog.publish(tenantId, source.id)
    expect(catalog.answer(tenantId, 'Qual o horário?')).toMatchObject({
      status: 'answered',
      version: 'fixture-v1'
    })
    catalog.revoke(tenantId, source.id)
    expect(catalog.answer(tenantId, 'Qual o horário?')).toEqual({
      status: 'handoff',
      reason: 'approved_source_missing'
    })
    expect(
      catalog.answer(
        'tenant_00000000-0000-0000-0000-000000000502',
        'Qual o horário?'
      )
    ).toEqual({ status: 'handoff', reason: 'approved_source_missing' })
  })
})
