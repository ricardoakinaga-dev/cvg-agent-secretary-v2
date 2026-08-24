import type { Intent } from '@cvg/shared'

export function classifyIntent(message: string): Intent {
  const text = message.toLowerCase()
  if (
    text.includes('consulta') ||
    text.includes('horario') ||
    text.includes('agenda')
  )
    return 'scheduling'
  if (text.includes('vomit') || text.includes('sangue') || text.includes('dor'))
    return 'triage'
  if (text.includes('endereco') || text.includes('horario de funcionamento'))
    return 'institutional_question'
  if (text.includes('tarefa') || text.includes('retorno')) return 'task'
  return 'unknown'
}
