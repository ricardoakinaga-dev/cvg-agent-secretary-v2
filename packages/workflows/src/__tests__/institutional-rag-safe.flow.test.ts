import { describe, expect, it } from 'vitest'
import { answerInstitutionalQuestion } from '../index.ts'

describe('institutional RAG safe flow', () => {
  it('answers only with approved non-clinical source', () => {
    expect(answerInstitutionalQuestion({ question: 'Qual horario?' })).toEqual({
      status: 'handoff',
      reason: 'approved_source_missing'
    })
    expect(
      answerInstitutionalQuestion({
        question: 'Qual tratamento?',
        approvedSource: { answer: 'x', source: 'manual' }
      })
    ).toEqual({ status: 'handoff', reason: 'medical_question' })
    expect(
      answerInstitutionalQuestion({
        question: 'Qual endereco?',
        approvedSource: { answer: 'Rua 1', source: 'manual-cvg' }
      })
    ).toEqual({
      status: 'answered',
      answer: 'Rua 1',
      source: 'manual-cvg'
    })
  })
})
