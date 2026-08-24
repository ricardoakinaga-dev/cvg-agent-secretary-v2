export interface MemoryFact {
  subjectId: string
  key: string
  value: string
  approved: boolean
}

export function createApprovedMemoryFact(
  input: Omit<MemoryFact, 'approved'>
): MemoryFact {
  return { ...input, approved: true }
}
