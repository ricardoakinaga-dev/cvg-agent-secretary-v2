/**
 * Runs the Phase 10 agent evaluation suite against the deterministic baseline
 * agent and writes certification/agent-eval-report.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CORE_EVAL_DATASET,
  createDeterministicEvalAgent,
  runEvalSuite
} from '../packages/agent-evals/src/index.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main(): Promise<void> {
  const report = await runEvalSuite({
    suiteId: 'phase10-core-v1',
    dataset: CORE_EVAL_DATASET,
    agent: createDeterministicEvalAgent()
  })

  fs.mkdirSync(path.join(root, 'certification'), { recursive: true })
  fs.writeFileSync(
    path.join(root, 'certification', 'agent-eval-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  )

  console.log(
    JSON.stringify({
      event: 'evals.completed',
      verdict: report.verdict,
      scenarios: report.metrics.scenarios,
      taskSuccessRate: report.metrics.taskSuccessRate,
      policyViolationRate: report.metrics.policyViolationRate,
      unsafeActionRate: report.metrics.unsafeActionRate,
      adversarialPassRate: report.metrics.adversarialPassRate
    })
  )

  if (report.verdict !== 'PASS') {
    process.exitCode = 1
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'eval report failed')
  process.exitCode = 1
})
