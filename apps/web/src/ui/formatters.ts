const statusLabels: Record<string, string> = {
  active: 'Ativa',
  approved: 'Aprovada',
  assumed: 'Handoff assumido',
  blocked: 'Bloqueada',
  canceled: 'Cancelada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
  done: 'Concluída',
  dead_letter: 'Dead-letter',
  draft: 'Rascunho',
  executing: 'Em execução',
  expired: 'Expirada',
  failed: 'Falhou',
  in_progress: 'Em andamento',
  linked: 'Vinculado',
  open: 'Aberta',
  pending: 'Pendente',
  proposed: 'Proposta',
  rejected: 'Rejeitada',
  requested: 'Solicitada',
  reserved: 'Reservada',
  uncertain: 'Requer reconciliação',
  waiting_approval: 'Aguardando aprovação',
  waiting_human: 'Aguardando operador'
}

export function formatStatus(value: string): string {
  const normalized = value.trim().toLowerCase()
  return statusLabels[normalized] ?? normalized.replaceAll('_', ' ')
}

/**
 * Client-side last-mile defense for operator diagnostics. The API remains the
 * authority and already emits a metadata-only projection; this allowlist keeps
 * an unexpected adapter response from becoming a free-form console sink.
 */
export function formatDiagnostic(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const redacted = trimmed
    .replace(
      /\b(authorization|password|passwd|token|secret|api[_-]?key)\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi,
      (_match, key: string) => `${key}: [redacted]`
    )
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
  if (!/^[A-Za-z0-9_:.\-\[\] ]+$/.test(redacted)) {
    return '[redacted-client-diagnostic]'
  }
  return redacted.slice(0, 1_200)
}

export function formatTimestamp(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

export function formatRecordId(value?: string | null): string | null {
  return value?.trim() ? value : null
}
