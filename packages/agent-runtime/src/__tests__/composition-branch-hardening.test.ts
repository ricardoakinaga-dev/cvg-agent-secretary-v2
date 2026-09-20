import { describe, expect, it } from 'vitest'
import { InMemoryTelemetry } from '@cvg/observability'
import {
  createGovernedRuntimeComposition,
  RuntimeCompositionError,
  toGovernedTurnInput,
  type GovernedRuntimeCompositionInput,
  type GovernedTurnEnvelope,
  type WorkflowPlan,
  type WorkflowStep
} from '../composition.ts'
import { InMemoryEffectJournal } from '../effect-journal.ts'
import { GovernedAgentRuntime } from '../runtime.ts'

const NOW = new Date('2026-09-15T12:00:00.000Z')
const TENANT = 'tenant_00000000-0000-4000-8000-000000000001'

function validCompositionInput(
  overrides: Partial<GovernedRuntimeCompositionInput> = {}
): GovernedRuntimeCompositionInput {
  return {
    policy: { evaluate: async () => ({ decision: 'ALLOW' }) },
    approvals: {
      request: async () => ({}),
      reserve: async () => ({}),
      confirm: async () => ({}),
      get: async () => null,
      list: async () => []
    },
    modelGateway: { generate: async () => ({}) },
    telemetry: new InMemoryTelemetry({ clock: () => NOW }),
    audit: { append: async () => ({}), verify: async () => true },
    toolExecutor: async () => ({ result: { synthetic: true } }),
    outbox: async () => ({ eventId: 'evt_synthetic' }),
    ...overrides
  } as unknown as GovernedRuntimeCompositionInput
}

function envelope(
  overrides: Partial<GovernedTurnEnvelope> = {}
): GovernedTurnEnvelope {
  return {
    operatorId: 'op_synthetic',
    operatorRole: 'Operator',
    agentId: 'agent_synthetic',
    agentVersion: 'v1',
    agentProfile: 'secretary',
    prompt: { promptId: 'prompt_synthetic', version: '1.0.0' },
    modelProfile: 'fast',
    ...overrides
  }
}

const plan: WorkflowPlan = {
  planId: 'plan_synthetic',
  tenantId: TENANT,
  conversationId: 'conv_synthetic',
  correlationId: 'corr_00000000-0000-4000-8000-000000000001',
  steps: []
}

const step: WorkflowStep = {
  stepId: 'step_synthetic',
  capability: 'appointment.create',
  action: 'appointment.create',
  resource: { type: 'synthetic_appointment', id: 'apt_synthetic' },
  dataClassification: 'INTERNAL'
}

describe('governed turn mapping branch hardening', () => {
  it('carries the optional envelope task into the governed turn input', () => {
    const withTask = toGovernedTurnInput(
      plan,
      step,
      envelope({ task: 'synthetic-task' })
    )
    expect(withTask.task).toBe('synthetic-task')
    const withoutTask = toGovernedTurnInput(plan, step, envelope())
    expect('task' in withoutTask).toBe(false)
  })

  it('projects optional plan, envelope and step fields only when present', () => {
    const projected = toGovernedTurnInput(
      { ...plan, sessionId: 'sess_synthetic' },
      {
        ...step,
        idempotencyKey: 'synthetic-key',
        structuredOutput: { name: 'synthetic_contract', schema: {} } as never
      },
      envelope({
        inboundMessageId: 'msg_synthetic',
        traceContext: {
          traceId: '1'.repeat(32),
          spanId: '2'.repeat(16),
          correlationId: plan.correlationId
        },
        limits: { maxToolCalls: 1 },
        approvalId: 'approval_synthetic',
        task: 'synthetic-task'
      })
    )
    expect(projected.sessionId).toBe('sess_synthetic')
    expect(projected.inboundMessageId).toBe('msg_synthetic')
    expect(projected.traceContext).toMatchObject({ traceId: '1'.repeat(32) })
    expect(projected.limits).toEqual({ maxToolCalls: 1 })
    expect(projected.approvalId).toBe('approval_synthetic')
    expect(projected.idempotencyKey).toBe('synthetic-key')
    expect(projected.structuredOutput).toBeDefined()
  })
})

describe('governed runtime composition branch hardening', () => {
  it('reports every required port whose declared method is missing', () => {
    const input = validCompositionInput()
    ;(input as { policy: unknown }).policy = { notEvaluate: true }
    const error = (() => {
      try {
        createGovernedRuntimeComposition(input)
        return null
      } catch (thrown) {
        return thrown
      }
    })()
    expect(error).toBeInstanceOf(RuntimeCompositionError)
    expect((error as RuntimeCompositionError).code).toBe(
      'runtime_composition_invalid'
    )
    expect((error as RuntimeCompositionError).message).toContain('policy')
  })

  it('reports a missing tool executor and outbox function', () => {
    const input = validCompositionInput()
    delete (input as { toolExecutor?: unknown }).toolExecutor
    expect(() => createGovernedRuntimeComposition(input)).toThrow(
      /toolExecutor/
    )
    const noOutbox = validCompositionInput()
    delete (noOutbox as { outbox?: unknown }).outbox
    expect(() => createGovernedRuntimeComposition(noOutbox)).toThrow(/outbox/)
    const nonFunction = validCompositionInput({
      toolExecutor: 'not-a-function'
    } as never)
    expect(() => createGovernedRuntimeComposition(nonFunction)).toThrow(
      /toolExecutor/
    )
  })

  it('fails closed in durable mode without a journal and without attestation', () => {
    expect(() =>
      createGovernedRuntimeComposition(
        validCompositionInput({ requireDurable: true })
      )
    ).toThrow(/durable effectJournal/)
    expect(() =>
      createGovernedRuntimeComposition(
        validCompositionInput({
          requireDurable: true,
          effectJournal: new InMemoryEffectJournal()
        })
      )
    ).toThrow(/durable approvals/)
  })

  it('builds a durable governed runtime when journal and attestation are supplied', () => {
    const composed = createGovernedRuntimeComposition(
      validCompositionInput({
        requireDurable: true,
        durableApprovals: true,
        effectJournal: new InMemoryEffectJournal(),
        clock: () => NOW,
        effectScopes: { 'appointment.create': 'fake_authorized' } as never,
        realEffectAuthorizations: ['appointment.create'],
        reservationTtlMs: 5_000
      })
    )
    expect(composed.requireDurable).toBe(true)
    expect(composed.runtime).toBeInstanceOf(GovernedAgentRuntime)
  })

  it('defaults to the non-durable runtime when no optional wiring is supplied', () => {
    const composed = createGovernedRuntimeComposition(validCompositionInput())
    expect(composed.requireDurable).toBe(false)
    expect(composed.runtime).toBeInstanceOf(GovernedAgentRuntime)
  })
})
