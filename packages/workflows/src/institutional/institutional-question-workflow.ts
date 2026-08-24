export function answerInstitutionalQuestion(input: {
  question: string
  approvedSource?: { answer: string; source: string }
}) {
  if (!input.approvedSource) {
    return { status: 'handoff', reason: 'approved_source_missing' }
  }
  if (/diagn[oó]stico|rem[eé]dio|tratamento/i.test(input.question)) {
    return { status: 'handoff', reason: 'medical_question' }
  }
  return {
    status: 'answered',
    answer: input.approvedSource.answer,
    source: input.approvedSource.source
  }
}
