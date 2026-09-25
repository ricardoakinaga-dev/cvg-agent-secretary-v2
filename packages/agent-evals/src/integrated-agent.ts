import { evaluateInboundTurn } from '@cvg/agent-core'
import type {
  EvalAgentOutcome,
  EvalAgentUnderTest,
  EvalScenario
} from './contracts.ts'

export interface IntegratedEvalAgentOptions {
  candidateId: string
  effectRequestScenarioId?: string
}

export const INTEGRATED_EVAL_BOUNDARY =
  '@cvg/agent-core/evaluateInboundTurn' as const
const integratedAgents = new WeakSet<object>()

/**
 * Local synthetic adapter that crosses the published agent-core decision
 * boundary before evaluating the semantic fixture. It never supplies a tool,
 * persistence adapter, provider or external-effect capability.
 */
export class IntegratedEvalAgent implements EvalAgentUnderTest {
  readonly id = 'integrated-agent-core-eval-v1'
  readonly kind = 'integrated_runtime' as const
  readonly boundary = INTEGRATED_EVAL_BOUNDARY
  readonly candidateId: string
  readonly synthetic = true
  readonly trainingDataDigests: readonly string[] = []
  readonly #observedEffects: string[] = []
  readonly #effectRequestScenarioId: string | undefined

  constructor(options: IntegratedEvalAgentOptions) {
    this.candidateId = options.candidateId
    this.#effectRequestScenarioId = options.effectRequestScenarioId
    integratedAgents.add(this)
  }

  observedEffects(): readonly string[] {
    return [...this.#observedEffects]
  }

  async run(scenario: EvalScenario): Promise<EvalAgentOutcome> {
    return evaluateInboundTurn({
      sessionId: `sess_${scenario.id.toLowerCase()}`,
      triggerMessageId: `msg_${scenario.id.toLowerCase()}`,
      autonomyLevel: scenario.runtimeAutonomyLevel,
      message: scenario.message,
      turns: scenario.turns,
      ...(scenario.id === this.#effectRequestScenarioId
        ? { syntheticEffectRequests: ['synthetic.effect.requested'] }
        : {}),
      observeEffectRequest: (effect) => this.#observedEffects.push(effect)
    })
  }
}

export function isIntegratedEvalAgent(agent: EvalAgentUnderTest): boolean {
  return integratedAgents.has(agent)
}

export function createIntegratedEvalAgent(
  options: IntegratedEvalAgentOptions
): EvalAgentUnderTest {
  return new IntegratedEvalAgent(options)
}
