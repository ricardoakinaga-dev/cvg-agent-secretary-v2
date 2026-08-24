export const auditEvidenceGovernance = {
  retention: {
    policyId: 'controlled-construction-audit-retention-v1',
    mode: 'controlled_construction',
    defaultRetentionDays: 30,
    auditEvidenceRetentionDays: 180,
    approvedForRealData: false,
    humanSignoffRequired: true
  },
  payload: {
    mode: 'minimized',
    rawPayloadReturned: false
  },
  export: {
    externalDispatch: false,
    externalExportRequiresApproval: true
  }
} as const

export interface SanitizedAuditEvidencePayload {
  payload: unknown
  redactedFields: string[]
}

const sensitivePayloadKeys = new Set([
  'authorization',
  'body',
  'clinicalnote',
  'clinicalnotes',
  'diagnosis',
  'email',
  'externalmessageid',
  'address',
  'cpf',
  'cnpj',
  'document',
  'documentid',
  'dateofbirth',
  'birthdate',
  'medicalrecord',
  'password',
  'patientname',
  'phone',
  'prescription',
  'rg',
  'secret',
  'senderref',
  'symptoms',
  'taxid',
  'token'
])

const sensitivePayloadFragments = [
  'address',
  'authorization',
  'birthdate',
  'body',
  'clinicalnote',
  'cnpj',
  'cpf',
  'dateofbirth',
  'diagnosis',
  'document',
  'email',
  'externalmessageid',
  'medicalrecord',
  'patientname',
  'password',
  'phone',
  'prescription',
  'taxid',
  'secret',
  'senderref',
  'symptom',
  'token'
]

export function sanitizeAuditEvidencePayload(
  payload: unknown
): SanitizedAuditEvidencePayload {
  const result = sanitizeValue(payload, '')
  return {
    payload: result.value,
    redactedFields: result.redactedFields
  }
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[redacted-cpf]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[redacted-cnpj]')
    .replace(
      /\b(?:rua|r\.?|avenida|av\.?|alameda|travessa|tv\.?|rodovia)\s+[^,.;\n]+(?:,\s*\d+)?/gi,
      '[redacted-address]'
    )
    .replace(
      /\b(?:meu nome [eé]|me chamo|nome completo [eé])\s+[^,.;!?\n]+/gi,
      (match) => `${match.split(/\s+/).slice(0, 3).join(' ')} [redacted-name]`
    )
    .replace(
      /\b(?:nascido|nascida|data de nascimento)\s*(?:e|é|em|:)?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi,
      '[redacted-birth-date]'
    )
    .replace(
      /(?<![A-Za-z0-9_-])\+?\d[\d\s().-]{7,}\d(?![A-Za-z0-9_-])/g,
      (match) => {
        const uuidLike =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            match
          )
        return uuidLike ? match : '[redacted-phone]'
      }
    )
}

function sanitizeValue(
  value: unknown,
  path: string
): { value: unknown; redactedFields: string[] } {
  if (Array.isArray(value)) {
    return value.reduce<{ value: unknown[]; redactedFields: string[] }>(
      (result, item, index) => {
        const sanitized = sanitizeValue(item, joinPath(path, String(index)))
        return {
          value: [...result.value, sanitized.value],
          redactedFields: [
            ...result.redactedFields,
            ...sanitized.redactedFields
          ]
        }
      },
      { value: [], redactedFields: [] }
    )
  }

  if (typeof value === 'string') {
    const sanitized = redactSensitiveText(value)
    return {
      value: sanitized,
      redactedFields: sanitized === value && path ? [] : path ? [path] : []
    }
  }

  if (typeof value !== 'object' || value === null) {
    return { value, redactedFields: [] }
  }

  return Object.entries(value).reduce<{
    value: Record<string, unknown>
    redactedFields: string[]
  }>(
    (result, [key, child]) => {
      const childPath = joinPath(path, key)
      if (isSensitivePayloadKey(key)) {
        return {
          value: result.value,
          redactedFields: [...result.redactedFields, childPath]
        }
      }

      const sanitized = sanitizeValue(child, childPath)
      return {
        value: { ...result.value, [key]: sanitized.value },
        redactedFields: [...result.redactedFields, ...sanitized.redactedFields]
      }
    },
    { value: {}, redactedFields: [] }
  )
}

function joinPath(parent: string, child: string): string {
  return parent ? `${parent}.${child}` : child
}

function isSensitivePayloadKey(key: string): boolean {
  const normalized = key.toLowerCase()
  return (
    sensitivePayloadKeys.has(normalized) ||
    sensitivePayloadFragments.some((fragment) => normalized.includes(fragment))
  )
}
