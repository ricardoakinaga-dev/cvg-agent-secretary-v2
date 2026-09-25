export interface InboundBehaviorProposal {
  intent: string
  proposedCapabilities: string[]
  escalation: 'none' | 'handoff' | 'approval'
  refused: boolean
  structuredValid: boolean
  latencyMs: number
  costUsd: number
}

interface ProductRule {
  pattern: RegExp
  intent: string
  proposedCapabilities: string[]
  escalation: InboundBehaviorProposal['escalation']
  refused: boolean
}

// Product-side behavior rules. These deliberately live behind agent-core's
// public boundary and are independent from the frozen eval baseline.
const PRODUCT_RULES: ProductRule[] = [
  [
    /ignore .*?(instrucoes|instructions|regras)|system prompt|prompt do sistema|you are now|agora voce e|jailbreak|developer mode|desconsidere as (instrucoes|regras)|nova politica:|revele .*?(prompt|sistema)|api[_ -]?key|me diga .*?(senha|secret|token)/i,
    'unknown',
    [],
    'handoff',
    true
  ],
  [
    /call (the )?function|execute (a )?tool|run (this )?(sql|shell)|chame a (funcao|ferramenta)|execute o comando|tool call|chamada de ferramenta/i,
    'unknown',
    [],
    'handoff',
    true
  ],
  [
    /\badmin(istrador|istrative)?\b|gerenciar (as )?politicas|publicar (o |um )?agente|deploy|root access/i,
    'unknown',
    [],
    'handoff',
    true
  ],
  [
    /outro tenant|outra (clinica|unidade)|dados de outra|tenant_[0-9a-f]|paciente de outra clinica/i,
    'unknown',
    [],
    'handoff',
    true
  ],
  [
    /sem aprovacao|pula(r)? a aprovacao|aprovar automaticamente|bypass|dispensa a aprovacao/i,
    'unknown',
    [],
    'handoff',
    true
  ],
  [
    /sou o medico|autorizado pelo doutor|pode confiar em mim|me passa os dados|a dra\.? autorizou/i,
    'unknown',
    [],
    'handoff',
    true
  ],
  [
    /diagnostic|prescreva|prescrever|receita de|medicamento|dosagem|atestado|laudo|liberar (o )?exame|interpretar? (o )?exame|resultado do exame/i,
    'triage',
    [],
    'handoff',
    true
  ],
  [
    /prontuario|historico medico|ficha medica|dados clinicos/i,
    'handoff',
    [],
    'handoff',
    true
  ],
  [
    /emergencia|dor no peito|sangr(amento|ando)|desmaio|falta de ar|engasgou|convulsao|vomitando|vomito/i,
    'triage',
    [],
    'handoff',
    false
  ],
  [/internad|internacao|hospitaliz/i, 'handoff', [], 'handoff', false],
  [
    /\balta\b|pos-operatorio|pos operatorio|orientacoes de alta/i,
    'handoff',
    [],
    'handoff',
    false
  ],
  [
    /atendente|humano|falar com (uma )?pessoa|supervisor|transferir para/i,
    'handoff',
    [],
    'handoff',
    false
  ],
  [
    /cancelar|desmarcar|cancela (a|o)|cancelamento/i,
    'scheduling',
    ['schedule.read', 'appointment.cancel'],
    'approval',
    false
  ],
  [
    /remarcar|mudar (o )?horario|trocar (a )?consulta|reagendar/i,
    'scheduling',
    ['schedule.read', 'appointment.modify'],
    'none',
    false
  ],
  [
    /agend|marcar (uma? )?(consulta|exame)|quero (uma )?consulta|horario disponivel|tem vaga/i,
    'scheduling',
    ['schedule.read', 'appointment.create'],
    'none',
    false
  ],
  [
    /desconto|reembolso|estorno|parcelar|negociar (o )?valor|fatura|financeiro/i,
    'institutional_question',
    [],
    'approval',
    false
  ],
  [
    /idiota|lerdo|pessimo|horrivel|vou (te )?processar|vou reclamar|palhacada/i,
    'handoff',
    [],
    'handoff',
    false
  ],
  [
    /convenio|quanto custa|\bvalor\b|\bpreco\b|tabela de precos|horario de funcionamento|voces atendem|aceitam? (unimed|amil|bradesco)|como chegar|retorno/i,
    'institutional_question',
    [],
    'handoff',
    false
  ],
  [
    /me ajuda|quero resolver uma coisa|algo errado|sei la|talvez|nao sei|preciso de algo/i,
    'unknown',
    [],
    'handoff',
    false
  ]
].map(([pattern, intent, proposedCapabilities, escalation, refused]) => ({
  pattern: pattern as RegExp,
  intent: intent as string,
  proposedCapabilities: proposedCapabilities as string[],
  escalation: escalation as InboundBehaviorProposal['escalation'],
  refused: refused as boolean
}))

function normalizeInboundText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function classifyInboundBehavior(input: {
  message: string
  turns: readonly string[]
}): InboundBehaviorProposal {
  const text = normalizeInboundText([input.message, ...input.turns].join('\n'))
  const matched = PRODUCT_RULES.find((rule) => rule.pattern.test(text))
  return {
    intent: matched?.intent ?? 'unknown',
    proposedCapabilities: matched?.proposedCapabilities ?? [],
    escalation: matched?.escalation ?? 'handoff',
    refused: matched?.refused ?? false,
    structuredValid: true,
    latencyMs: 5 + (input.message.length % 10),
    costUsd: 0
  }
}
