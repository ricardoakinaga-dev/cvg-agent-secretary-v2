#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createIntegratedEvalAgent,
  HOLDOUT_EVAL_DATASET,
  HOLDOUT_EVAL_DATASET_CONTRACT,
  runEvalSuite,
  validateIntegratedHoldoutReport
} from '@cvg/agent-evals'
import { buildPhase11Candidate } from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name: string, fallback: string): string => {
  const prefix = `--${name}=`
  return (
    args
      .find((argument) => argument.startsWith(prefix))
      ?.slice(prefix.length) ?? fallback
  )
}

async function main(): Promise<void> {
  const candidate = buildPhase11Candidate(root)
  const output = option(
    'out',
    'docs/04_audit/evidence/AUD20/AUD20-09-integrated-holdout-report.json'
  )
  const report = await runEvalSuite({
    suiteId: 'AUD20-09-INTEGRATED-HOLDOUT-v1',
    partition: 'holdout',
    dataset: HOLDOUT_EVAL_DATASET,
    datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
    seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
    candidateId: candidate.candidateId,
    agent: createIntegratedEvalAgent({ candidateId: candidate.candidateId })
  })
  const verification = validateIntegratedHoldoutReport(report, {
    contract: HOLDOUT_EVAL_DATASET_CONTRACT,
    candidateId: candidate.candidateId
  })
  const artifact = {
    schemaVersion: 1,
    kind: 'aud20-09-integrated-holdout-report',
    candidate: {
      candidateId: candidate.candidateId,
      commit: candidate.commit,
      treeHash: candidate.treeHash,
      dirty: candidate.dirty
    },
    report,
    verification: {
      status: verification.length === 0 ? 'PASS' : 'FAIL',
      failures: verification
    },
    releaseEligible: false
  }
  const absolute = path.resolve(root, output)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, `${JSON.stringify(artifact, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`)
  if (report.verdict !== 'PASS' || verification.length > 0) {
    process.exitCode = 1
  }
}

void main()
