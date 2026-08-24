import { describe, expect, it } from 'vitest'
import { answerFromInstitutionalSource, noopRagSource } from '../index.ts'

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
})
