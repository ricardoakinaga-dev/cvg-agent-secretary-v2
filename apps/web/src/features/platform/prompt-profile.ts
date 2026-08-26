export type PromptBlockKind =
  | 'system'
  | 'persona'
  | 'instruction'
  | 'safety'
  | 'context'
  | 'response'

export interface PromptBlockEditorValue {
  id: string
  kind: PromptBlockKind
  content: string
  priority: number
  enabled: boolean
  locked?: boolean
}

export const CONTROLLED_KERNEL_PROMPT_BLOCK: Readonly<PromptBlockEditorValue> =
  Object.freeze({
    id: 'kernel-safety',
    kind: 'safety',
    content:
      'Não prescreva, diagnostique, confirme consultas reais nem exponha dados confidenciais. Encaminhe ações sensíveis para revisão humana.',
    priority: -10000,
    enabled: true,
    locked: true
  })

const promptBlockKinds: PromptBlockKind[] = [
  'system',
  'persona',
  'instruction',
  'safety',
  'context',
  'response'
]

const reservedTemplateKeys = new Set([
  'security_blocked',
  'emergency',
  'medication_advice',
  'human_takeover',
  'system_error'
])

const identifierPattern = /^[A-Za-z0-9._:-]+$/
const prototypeKeys = new Set(['__proto__', 'constructor', 'prototype'])
const secretPattern =
  /(sk-[A-Za-z0-9][A-Za-z0-9_-]*|pk_[A-Za-z0-9][A-Za-z0-9_-]*|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=])/i

export type PromptProfileParseResult<T> = { value: T } | { error: string }

export interface PromptProfileEditorInput {
  promptBlocksText: string
  responseTemplatesText: string
  basePromptBlocks?: unknown
  baseResponseTemplates?: unknown
}

export interface PromptProfileEditorValue {
  promptBlocks: PromptBlockEditorValue[]
  responseTemplates: Record<string, string>
}

export function serializePromptBlocks(raw: unknown): string {
  const source = readPromptBlocks(raw)
  const blocks = source.some(isProtectedPromptBlock)
    ? source
    : [CONTROLLED_KERNEL_PROMPT_BLOCK, ...source]
  return JSON.stringify(blocks, null, 2)
}

export function serializeResponseTemplates(raw: unknown): string {
  const templates = readStringRecord(raw)
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(templates).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    ),
    null,
    2
  )
}

export function parsePromptProfile(
  input: PromptProfileEditorInput
): PromptProfileParseResult<PromptProfileEditorValue> {
  const baseBlocks = readPromptBlocks(input.basePromptBlocks)
  const protectedBaseBlocks = baseBlocks.filter(isProtectedPromptBlock)
  const parsedBlocks = parsePromptBlocks(input.promptBlocksText)
  if ('error' in parsedBlocks) return parsedBlocks

  const protectedIds = new Set(protectedBaseBlocks.map((block) => block.id))
  for (const protectedBlock of protectedBaseBlocks) {
    const candidate = parsedBlocks.value.find(
      (block) => block.id === protectedBlock.id
    )
    if (!candidate || !sameProtectedFields(candidate, protectedBlock)) {
      return {
        error: `O bloco protegido ${protectedBlock.id} é somente leitura e deve ser preservado.`
      }
    }
  }

  const hasBaseProtection = protectedBaseBlocks.length > 0
  const kernelCandidate = parsedBlocks.value.find(
    (block) => block.id === CONTROLLED_KERNEL_PROMPT_BLOCK.id
  )
  if (!hasBaseProtection) {
    if (
      !kernelCandidate ||
      !sameProtectedFields(kernelCandidate, CONTROLLED_KERNEL_PROMPT_BLOCK)
    ) {
      return {
        error: 'O bloco kernel-safety é obrigatório e não pode ser alterado.'
      }
    }
  }

  for (const block of parsedBlocks.value) {
    if (protectedIds.has(block.id)) continue
    if (
      isProtectedPromptBlock(block) &&
      !sameProtectedFields(block, CONTROLLED_KERNEL_PROMPT_BLOCK)
    ) {
      return {
        error: `O bloco ${block.id} é protegido e não pode ser criado ou editado.`
      }
    }
  }

  const promptBlocks = hasBaseProtection
    ? [
        ...protectedBaseBlocks,
        ...parsedBlocks.value.filter((block) => !protectedIds.has(block.id))
      ]
    : [
        CONTROLLED_KERNEL_PROMPT_BLOCK,
        ...parsedBlocks.value.filter(
          (block) => block.id !== CONTROLLED_KERNEL_PROMPT_BLOCK.id
        )
      ]
  const templates = parseResponseTemplates(input.responseTemplatesText)
  if ('error' in templates) return templates

  return {
    value: {
      promptBlocks,
      responseTemplates: templates.value
    }
  }
}

function parsePromptBlocks(
  text: string
): PromptProfileParseResult<PromptBlockEditorValue[]> {
  const parsed = parseJson(text, 'prompt blocks')
  if ('error' in parsed) return parsed
  if (!Array.isArray(parsed.value)) {
    return { error: 'Prompt blocks devem ser um array JSON.' }
  }
  if (parsed.value.length > 64) {
    return { error: 'O perfil pode ter no máximo 64 prompt blocks.' }
  }

  const ids = new Set<string>()
  const blocks: PromptBlockEditorValue[] = []
  for (const [index, rawBlock] of parsed.value.entries()) {
    if (!isRecord(rawBlock)) {
      return { error: `Prompt block ${index + 1} deve ser um objeto JSON.` }
    }
    const allowedKeys = new Set([
      'id',
      'kind',
      'content',
      'priority',
      'enabled',
      'locked'
    ])
    if (Object.keys(rawBlock).some((key) => !allowedKeys.has(key))) {
      return { error: `Prompt block ${index + 1} contém campos desconhecidos.` }
    }
    const id = rawBlock.id
    const kind = rawBlock.kind
    const content = rawBlock.content
    const priority = rawBlock.priority
    const enabled = rawBlock.enabled
    if (
      typeof id !== 'string' ||
      id.trim().length === 0 ||
      id.length > 80 ||
      !identifierPattern.test(id)
    ) {
      return { error: `Prompt block ${index + 1} tem id inválido.` }
    }
    if (ids.has(id)) return { error: `Prompt block duplicado: ${id}.` }
    ids.add(id)
    if (
      typeof kind !== 'string' ||
      !promptBlockKinds.includes(kind as PromptBlockKind)
    ) {
      return { error: `Prompt block ${id} tem kind inválido.` }
    }
    if (
      typeof content !== 'string' ||
      content.trim().length === 0 ||
      content.length > 8000
    ) {
      return { error: `Prompt block ${id} tem conteúdo inválido.` }
    }
    if (
      typeof priority !== 'number' ||
      !Number.isInteger(priority) ||
      priority < -10000 ||
      priority > 10000
    ) {
      return { error: `Prompt block ${id} tem prioridade inválida.` }
    }
    if (typeof enabled !== 'boolean') {
      return { error: `Prompt block ${id} precisa de enabled booleano.` }
    }
    if (rawBlock.locked !== undefined && typeof rawBlock.locked !== 'boolean') {
      return { error: `Prompt block ${id} precisa de locked booleano.` }
    }
    if (secretPattern.test(content)) {
      return { error: `Prompt block ${id} contém valor semelhante a segredo.` }
    }
    blocks.push({
      id,
      kind: kind as PromptBlockKind,
      content,
      priority,
      enabled,
      ...(typeof rawBlock.locked === 'boolean'
        ? { locked: rawBlock.locked }
        : {})
    })
  }
  return { value: blocks }
}

function parseResponseTemplates(
  text: string
): PromptProfileParseResult<Record<string, string>> {
  const parsed = parseJson(text, 'response templates')
  if ('error' in parsed) return parsed
  if (!isRecord(parsed.value)) {
    return { error: 'Response templates devem ser um objeto JSON.' }
  }
  const entries = Object.entries(parsed.value)
  if (entries.length > 128) {
    return { error: 'O perfil pode ter no máximo 128 response templates.' }
  }
  const templates: Record<string, string> = {}
  for (const [key, value] of entries) {
    if (
      key.length === 0 ||
      key.length > 120 ||
      !identifierPattern.test(key) ||
      prototypeKeys.has(key)
    ) {
      return { error: `Template ${key || '(vazio)'} tem chave inválida.` }
    }
    if (reservedTemplateKeys.has(key)) {
      return { error: `Template ${key} é reservado pelo kernel de segurança.` }
    }
    if (
      typeof value !== 'string' ||
      value.trim().length === 0 ||
      value.length > 4000
    ) {
      return { error: `Template ${key} tem conteúdo inválido.` }
    }
    if (secretPattern.test(value)) {
      return { error: `Template ${key} contém valor semelhante a segredo.` }
    }
    templates[key] = value
  }
  return { value: templates }
}

function parseJson(
  text: string,
  label: string
): PromptProfileParseResult<unknown> {
  try {
    return { value: JSON.parse(text) as unknown }
  } catch {
    return { error: `O campo de ${label} precisa conter JSON válido.` }
  }
}

function readPromptBlocks(raw: unknown): PromptBlockEditorValue[] {
  return Array.isArray(raw)
    ? raw.filter(isRecord).flatMap((block) => {
        if (
          typeof block.id !== 'string' ||
          typeof block.kind !== 'string' ||
          typeof block.content !== 'string' ||
          typeof block.priority !== 'number' ||
          typeof block.enabled !== 'boolean'
        ) {
          return []
        }
        return [
          {
            id: block.id,
            kind: block.kind as PromptBlockKind,
            content: block.content,
            priority: block.priority,
            enabled: block.enabled,
            ...(typeof block.locked === 'boolean'
              ? { locked: block.locked }
              : {})
          }
        ]
      })
    : []
}

function readStringRecord(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  )
}

function isProtectedPromptBlock(block: PromptBlockEditorValue): boolean {
  return (
    block.locked === true ||
    block.kind === 'system' ||
    block.kind === 'safety' ||
    block.id === CONTROLLED_KERNEL_PROMPT_BLOCK.id
  )
}

function sameProtectedFields(
  left: PromptBlockEditorValue,
  right: PromptBlockEditorValue
): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.content === right.content &&
    left.priority === right.priority &&
    left.enabled === right.enabled
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
