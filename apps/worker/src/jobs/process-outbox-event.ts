export async function processOutboxEvent(input: { id: string; type: string }) {
  return { ...input, status: 'processed' as const }
}
