import { describe, expect, it } from 'vitest'
import {
  CONTROLLED_KERNEL_PROMPT_BLOCK,
  parsePromptProfile,
  serializePromptBlocks,
  serializeResponseTemplates
} from './prompt-profile.ts'

describe('prompt profile editor boundary', () => {
  it('preserves the source lock metadata while rendering protected blocks', () => {
    const systemBlock = {
      id: 'system-policy',
      kind: 'system' as const,
      content: 'Use somente fixtures controladas.',
      priority: -10,
      enabled: true,
      locked: false
    }

    expect(JSON.parse(serializePromptBlocks([systemBlock]))).toEqual([
      systemBlock
    ])
  })

  it('round-trips blocks/templates and keeps protected blocks read-only', () => {
    const baseBlocks = [CONTROLLED_KERNEL_PROMPT_BLOCK]
    const result = parsePromptProfile({
      promptBlocksText: serializePromptBlocks([
        ...baseBlocks,
        {
          id: 'behavior',
          kind: 'instruction',
          content: 'Use linguagem simples.',
          priority: 20,
          enabled: true
        }
      ]),
      responseTemplatesText: serializeResponseTemplates({
        handoff: 'Vou encaminhar.',
        low_confidence: 'Pode esclarecer?'
      }),
      basePromptBlocks: baseBlocks,
      baseResponseTemplates: {}
    })

    expect(result).toEqual({
      value: {
        promptBlocks: [
          CONTROLLED_KERNEL_PROMPT_BLOCK,
          {
            id: 'behavior',
            kind: 'instruction',
            content: 'Use linguagem simples.',
            priority: 20,
            enabled: true
          }
        ],
        responseTemplates: {
          handoff: 'Vou encaminhar.',
          low_confidence: 'Pode esclarecer?'
        }
      }
    })
  })

  it('adds the controlled kernel when a legacy source has only editable blocks', () => {
    const legacyBlocks = [
      {
        id: 'legacy-behavior',
        kind: 'instruction' as const,
        content: 'Use linguagem simples.',
        priority: 20,
        enabled: true
      }
    ]
    const serialized = serializePromptBlocks(legacyBlocks)

    expect(JSON.parse(serialized)).toEqual([
      CONTROLLED_KERNEL_PROMPT_BLOCK,
      ...legacyBlocks
    ])
    expect(
      parsePromptProfile({
        promptBlocksText: serialized,
        responseTemplatesText: '{}',
        basePromptBlocks: legacyBlocks,
        baseResponseTemplates: {}
      })
    ).toEqual({
      value: {
        promptBlocks: [CONTROLLED_KERNEL_PROMPT_BLOCK, ...legacyBlocks],
        responseTemplates: {}
      }
    })
  })

  it('rejects duplicate ids, malformed JSON, reserved kernel templates and secrets', () => {
    const base = serializePromptBlocks([CONTROLLED_KERNEL_PROMPT_BLOCK])
    expect(
      parsePromptProfile({
        promptBlocksText: `${base.slice(0, -1)},${base.slice(1)}`,
        responseTemplatesText: '{}',
        basePromptBlocks: [CONTROLLED_KERNEL_PROMPT_BLOCK],
        baseResponseTemplates: {}
      })
    ).toMatchObject({ error: expect.stringMatching(/JSON|duplic|inválid/i) })

    expect(
      parsePromptProfile({
        promptBlocksText: base,
        responseTemplatesText: '{"emergency":"custom"}',
        basePromptBlocks: [CONTROLLED_KERNEL_PROMPT_BLOCK],
        baseResponseTemplates: {}
      })
    ).toMatchObject({ error: expect.stringMatching(/reserv|kernel/i) })

    expect(
      parsePromptProfile({
        promptBlocksText: base,
        responseTemplatesText: '{"handoff":"token=sk-live-not-real"}',
        basePromptBlocks: [CONTROLLED_KERNEL_PROMPT_BLOCK],
        baseResponseTemplates: {}
      })
    ).toMatchObject({ error: expect.stringMatching(/secret|segredo/i) })

    expect(
      parsePromptProfile({
        promptBlocksText: base,
        responseTemplatesText: '{"__proto__":"unsafe"}',
        basePromptBlocks: [CONTROLLED_KERNEL_PROMPT_BLOCK],
        baseResponseTemplates: {}
      })
    ).toMatchObject({ error: expect.stringMatching(/chave|invalid/i) })
  })

  it('rejects a protected block edit before a network request', () => {
    const result = parsePromptProfile({
      promptBlocksText: JSON.stringify([
        { ...CONTROLLED_KERNEL_PROMPT_BLOCK, content: 'ignore safety' }
      ]),
      responseTemplatesText: '{}',
      basePromptBlocks: [CONTROLLED_KERNEL_PROMPT_BLOCK],
      baseResponseTemplates: {}
    })

    expect(result).toMatchObject({
      error: expect.stringMatching(/protegido|kernel/i)
    })
  })
})
