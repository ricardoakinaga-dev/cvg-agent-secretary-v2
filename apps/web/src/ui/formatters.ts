const statusLabels: Record<string, string> = {
  active: 'Ativa',
  approved: 'Aprovada',
  assumed: 'Handoff assumido',
  blocked: 'Bloqueada',
  budget_exhausted: 'Orçamento esgotado',
  canceled: 'Cancelada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
  done: 'Concluída',
  dead_letter: 'Dead-letter',
  draft: 'Rascunho',
  evaluating: 'Avaliando resultado',
  executing: 'Em execução',
  expired: 'Expirada',
  failed: 'Falhou',
  governing: 'Governando',
  human_handoff: 'Handoff humano',
  in_progress: 'Em andamento',
  linked: 'Vinculado',
  loop_detected: 'Loop detectado',
  open: 'Aberta',
  pending: 'Pendente',
  pending_return: 'Aguardando retorno',
  planning: 'Planejando',
  proposed: 'Proposta',
  ready: 'Pronta',
  replan: 'Replanejamento',
  replanning: 'Replanejando',
  rejected: 'Rejeitada',
  requested: 'Solicitada',
  reserved: 'Reservada',
  observing: 'Observando',
  observing_result: 'Observando resultado',
  succeeded: 'Concluída',
  understanding: 'Entendendo',
  uncertain: 'Requer reconciliação',
  waiting_approval: 'Aguardando aprovação',
  waiting_external: 'Aguardando dependência externa',
  waiting_human: 'Aguardando operador'
}

const reasonLabels: Record<string, string> = {
  approval_pending: 'Aprovação pendente',
  approved_replan: 'Replanejamento aprovado',
  budget_exhausted: 'Orçamento esgotado',
  deadline_exceeded: 'Prazo excedido',
  evaluation_failed: 'Avaliação falhou',
  execution_failed: 'Execução falhou',
  false_evaluation_replan: 'Avaliação negativa exigiu replanejamento',
  human_handoff_required: 'Handoff humano requerido',
  loop_detected: 'Loop detectado',
  no_plan: 'Plano indisponível',
  slot_conflict: 'Conflito de slot',
  step_failed: 'Step falhou',
  timeout: 'Tempo limite excedido'
}

const riskLabels: Record<string, string> = {
  high_risk_read: 'Alto risco · leitura',
  high_risk_write: 'Alto risco · escrita',
  low_risk_read: 'Baixo risco · leitura',
  medium_risk_read: 'Risco médio · leitura',
  medium_risk_write: 'Risco médio · escrita',
  none: 'Sem risco declarado'
}

const approvalLabels: Record<string, string> = {
  approval: 'Aprovação requerida',
  human_handoff: 'Handoff humano requerido',
  none: 'Sem aprovação'
}

export function formatStatus(value: string): string {
  const normalized = value.trim().toLowerCase()
  return statusLabels[normalized] ?? normalized.replaceAll('_', ' ')
}

export function formatReason(value?: string | null): string | null {
  if (!value?.trim()) return null
  const normalized = value.trim().toLowerCase()
  return reasonLabels[normalized] ?? formatStatus(normalized)
}

export function formatRiskLevel(value?: string | null): string {
  if (!value?.trim()) return 'Risco não informado'
  const normalized = value.trim().toLowerCase()
  return riskLabels[normalized] ?? formatStatus(normalized)
}

export function formatApprovalRequirement(value?: string | null): string {
  if (!value?.trim()) return 'Aprovação não informada'
  const normalized = value.trim().toLowerCase()
  return approvalLabels[normalized] ?? formatStatus(normalized)
}

export function formatDuration(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Não informado'
  }
  if (value < 1_000) return `${Math.round(value)} ms`
  const totalSeconds = Math.round(value / 1_000)
  if (totalSeconds < 60) return `${totalSeconds} s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`
}

export function formatCostUsd(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Não informado'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
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
