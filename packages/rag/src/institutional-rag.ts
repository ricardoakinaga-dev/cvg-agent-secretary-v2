export interface ApprovedInstitutionalSource {
  version: string
  answer: string
  source: string
}

export function answerFromInstitutionalSource(
  question: string,
  source: ApprovedInstitutionalSource | null
) {
  if (!source) return { status: 'handoff', reason: 'approved_source_missing' }
  if (/diagn[oó]stico|tratamento|prescri/i.test(question))
    return { status: 'handoff', reason: 'medical_question' }
  return {
    status: 'answered',
    answer: source.answer,
    source: source.source,
    version: source.version
  }
}
