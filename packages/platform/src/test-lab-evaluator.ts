import { z } from 'zod'
import type { ControlPlaneStore } from './control-plane-store.ts'
import { PlatformDecisionSchema, type TestRunTrace } from './contracts.ts'
import type { AgentId, AgentVersionId, TenantId } from './ids.ts'
import { runTestLab, type TestLabInput } from './test-lab.ts'

export const TestLabCaseSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9._:-]+$/),
    message: z.string().trim().min(1).max(4000),
    history: z.array(z.string().max(4000)).max(50).default([]),
    expectedPolicyDecision: PlatformDecisionSchema.optional(),
    expectedResponseMode: z.enum(['answer', 'clarify', 'handoff', 'blocked']),
    expectedHandoff: z.boolean().optional(),
    approvedKnowledge: z
      .object({
        version: z.string().trim().min(1).max(120),
        answer: z.string().trim().min(1).max(4000),
        source: z
          .string()
          .trim()
          .regex(/^controlled:\/\//)
      })
      .strict()
      .optional()
  })
  .strict()

export type TestLabCase = z.infer<typeof TestLabCaseSchema>

export interface TestLabEvaluation {
  caseId: string
  passed: boolean
  failures: string[]
  trace: TestRunTrace
}

export interface TestLabSuiteResult {
  passed: boolean
  results: TestLabEvaluation[]
}

export async function evaluateTestLabCase(input: {
  store: ControlPlaneStore
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  testCase: TestLabCase
}): Promise<TestLabEvaluation> {
  const testCase = TestLabCaseSchema.parse(input.testCase)
  const traceInput: TestLabInput = {
    store: input.store,
    tenantId: input.tenantId,
    agentId: input.agentId,
    versionId: input.versionId,
    message: testCase.message,
    history: testCase.history,
    ...(testCase.approvedKnowledge
      ? { approvedKnowledge: testCase.approvedKnowledge }
      : {})
  }
  const trace = await runTestLab(traceInput)
  const failures = [
    ...(testCase.expectedPolicyDecision &&
    trace.policy[0]?.decision !== testCase.expectedPolicyDecision
      ? [
          `policy_expected_${testCase.expectedPolicyDecision}_got_${trace.policy[0]?.decision ?? 'missing'}`
        ]
      : []),
    ...(trace.response.mode !== testCase.expectedResponseMode
      ? [
          `response_expected_${testCase.expectedResponseMode}_got_${trace.response.mode}`
        ]
      : []),
    ...(testCase.expectedHandoff !== undefined &&
    trace.handoff.requested !== testCase.expectedHandoff
      ? [
          `handoff_expected_${String(testCase.expectedHandoff)}_got_${String(trace.handoff.requested)}`
        ]
      : []),
    ...(trace.provider.externalCall ? ['external_call_must_remain_false'] : [])
  ]
  return {
    caseId: testCase.id,
    passed: failures.length === 0,
    failures,
    trace
  }
}

export async function evaluateTestLabSuite(input: {
  store: ControlPlaneStore
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  cases: TestLabCase[]
}): Promise<TestLabSuiteResult> {
  const cases = z.array(TestLabCaseSchema).min(1).max(100).parse(input.cases)
  let results: TestLabEvaluation[] = []
  for (const testCase of cases) {
    const result = await evaluateTestLabCase({ ...input, testCase })
    results = [...results, result]
  }
  return {
    passed: results.every((result) => result.passed),
    results
  }
}
