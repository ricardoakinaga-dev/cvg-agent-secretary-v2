import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import {
  buildCandidateRecord,
  collectCandidateFiles,
  computeCandidateId,
  diffCandidateFiles,
  sha256Bytes
} from './certification-rules.mjs'

export const PHASE11_REQUIRED_GATES = [
  'prompt_integrity',
  'format',
  'typecheck',
  'lint',
  'build',
  'unit',
  'coverage',
  'security',
  'worker_startup',
  'postgres',
  'e2e',
  'phase10_current_verification',
  'candidate_clean',
  'node_target'
]

export const PHASE11_GATE_STATUSES = ['PASS', 'FAIL', 'NOT_EXECUTED', 'BLOCKED']

export const PHASE11_VERDICTS = [
  'NO_GO',
  'AAA_CONTROLLED',
  'AAA_CANDIDATE',
  'STATE_OF_ART_TRIPLE_AAA'
]

export const PHASE11_PROMPT_SHA256 = {
  'pasted-text-1.txt':
    'a3993d1794b04ad53bb6c3388ff5bb0d8a8595b31ad8ec2989f8551424ad4ac0',
  'pasted-text-2.txt':
    '0fb73260f751c3fe4f0c5ba6b966c6d71c7c6e213c6020ad2e4b9e51faeb1331',
  'pasted-text-3.txt':
    '83be2719497e03f318a6f7a218d086242db6cfad88f3e784d51687f3040db968',
  'pasted-text-4.txt':
    'c4dbf03dc9592aace80d9572a21c6db01be7d3cdccbbf03436cb160191b45e4d',
  'pasted-text-5.txt':
    '091dea50ab43cd7cb82dd9fd65891f41317bca1d09d6449209bd54af38bf1d9e',
  'pasted-text-6.txt':
    'f32b51e251cbea05fc90679c652991136ea34cc56d5fd22ddd508591c35c04ef',
  'pasted-text-7.txt':
    '98402ac70b5f4ba7a28ccb5f9c5be83b2d941ca91b7f0ef590b5ca53ffa0660c',
  'pasted-text-8.txt':
    '8a4deee9d8316c706bc3aeb1eaa84d2702f8a7550f303e17d9841ed672026797',
  'pasted-text-9.txt':
    '9c0e2c12ed3139cabc243c704c798b0ee5d3db0095fe0c7bebc194b8a0101100',
  'pasted-text-10.txt':
    'ad3b73d34e0f3879c9dafe4cab0eaabd472e6900ecc91bdeb2f838f8bf4514bd',
  'pasted-text-11.txt':
    '02b1870dc47aa29ad6b2f54c3f54b662cd6c61f25dcf954a8e6591571c537b2f',
  'pasted-text-12.txt':
    '25b0ba6a8fab58e4ab2735c0906a7b544baf24013e70fcf39340ff89bbf6415c',
  'pasted-text-13.txt':
    '4f709b70a38c13de2dc1b918b80b5979871d7f25c76834efa1a4a15942aa2ce0',
  'pasted-text-14.txt':
    'c8ffad766acfc83efabb391bd044e7cc146f8adfe792cf49f62263024703d91b'
}

export const Phase11GateSchema = z.object({
  id: z.string().min(1),
  command: z.string().min(1),
  status: z.enum(PHASE11_GATE_STATUSES),
  exitCode: z.number().int(),
  durationMs: z.number().int().nonnegative(),
  log: z.string().optional(),
  logSha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  blocker: z.string().min(1).optional()
})

export const Phase11RequirementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  promptItems: z.string().min(1),
  implementation: z.array(z.string()),
  tests: z.array(z.string()),
  evidence: z.array(z.string()),
  gates: z.array(z.string()),
  status: z.enum(['IMPLEMENTED', 'PARTIAL', 'BLOCKED', 'MISSING']),
  blocking: z.boolean()
})

export const Phase11ResultSchema = z.object({
  schemaVersion: z.literal(1),
  phase: z.literal('11'),
  kind: z.literal('phase11-result'),
  commit: z.string().min(7),
  runId: z.string().min(1),
  timestamp: z.string().datetime(),
  candidate: z.object({
    candidateId: z.string().regex(/^[0-9a-f]{64}$/),
    dirty: z.boolean(),
    head: z.string().min(7),
    fileCount: z.number().int().positive()
  }),
  promptIntegrity: z.object({
    expectedCount: z.literal(14),
    observedCount: z.number().int().nonnegative(),
    files: z.array(
      z.object({
        path: z.string(),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
        expectedSha256: z.string().regex(/^[0-9a-f]{64}$/),
        status: z.enum(['PASS', 'FAIL'])
      })
    ),
    status: z.enum(['PASS', 'FAIL'])
  }),
  requirements: z.array(Phase11RequirementSchema),
  gates: z.array(Phase11GateSchema),
  externalGates: z
    .object({
      modelProvider: z.string(),
      channel: z.string(),
      externalIdentity: z.string(),
      humanSignoff: z.string(),
      notes: z.array(z.string()).optional()
    })
    .passthrough(),
  engine: z.object({
    actualNode: z.string(),
    targetNode: z.string(),
    status: z.enum(['PASS', 'FAIL'])
  }),
  evidenceGraph: z.object({
    nodes: z.array(z.object({ id: z.string(), kind: z.string() })),
    edges: z.array(
      z.object({ from: z.string(), to: z.string(), relation: z.string() })
    )
  }),
  decision: z.enum(['GO', 'CONDITIONAL_GO', 'NO_GO']),
  certification: z.enum(PHASE11_VERDICTS),
  blockers: z.array(z.string())
})

export const Phase11ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  phase: z.literal('11'),
  kind: z.literal('phase11-manifest'),
  commit: z.string().min(7),
  candidateId: z.string().regex(/^[0-9a-f]{64}$/),
  result: z.object({
    path: z.string(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    size: z.number().int().nonnegative()
  }),
  artifacts: z.array(
    z.object({
      path: z.string(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      size: z.number().int().nonnegative()
    })
  )
})

export function verifyPromptIntegrity(root) {
  const sourceRoot = path.join(root, 'docs/11_phase11/prompt-master/source')
  const files = Object.entries(PHASE11_PROMPT_SHA256).map(
    ([file, expectedSha256]) => {
      const target = path.join(sourceRoot, file)
      if (!fs.existsSync(target)) {
        return {
          path: `docs/11_phase11/prompt-master/source/${file}`,
          sha256: '0'.repeat(64),
          expectedSha256,
          status: 'FAIL'
        }
      }
      const content = fs.readFileSync(target)
      const sha256 = sha256Bytes(content)
      return {
        path: `docs/11_phase11/prompt-master/source/${file}`,
        sha256,
        expectedSha256,
        status: sha256 === expectedSha256 ? 'PASS' : 'FAIL'
      }
    }
  )
  return {
    expectedCount: 14,
    observedCount: files.filter((file) => file.sha256 !== '0'.repeat(64))
      .length,
    files,
    status: files.every((file) => file.status === 'PASS') ? 'PASS' : 'FAIL'
  }
}

export function readNodeTarget(root) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  )
  const target = packageJson.engines?.node ?? 'unspecified'
  const actual = process.versions.node
  const major = Number(actual.split('.')[0])
  const status = target === '>=22 <23' && major === 22 ? 'PASS' : 'FAIL'
  return { actualNode: actual, targetNode: target, status }
}

export function buildEvidenceGraph(requirements, gates, promptIntegrity) {
  const nodes = []
  const edges = []
  const add = (id, kind) => {
    if (!nodes.some((node) => node.id === id)) nodes.push({ id, kind })
  }
  for (const file of promptIntegrity.files) {
    add(`source:${file.path}`, 'prompt')
  }
  for (const requirement of requirements) {
    const requirementNode = `requirement:${requirement.id}`
    add(requirementNode, 'requirement')
    for (const source of promptIntegrity.files) {
      edges.push({
        from: `source:${source.path}`,
        to: requirementNode,
        relation: 'defines_scope_for'
      })
    }
    for (const item of requirement.implementation) {
      const node = `implementation:${item}`
      add(node, 'implementation')
      edges.push({
        from: requirementNode,
        to: node,
        relation: 'implemented_by'
      })
    }
    for (const item of requirement.tests) {
      const node = `test:${item}`
      add(node, 'test')
      edges.push({ from: requirementNode, to: node, relation: 'verified_by' })
    }
    for (const item of requirement.evidence) {
      const node = `evidence:${item}`
      add(node, 'evidence')
      edges.push({ from: requirementNode, to: node, relation: 'evidenced_by' })
    }
    for (const item of requirement.gates) {
      const node = `gate:${item}`
      add(node, 'gate')
      edges.push({ from: requirementNode, to: node, relation: 'gated_by' })
    }
  }
  for (const gate of gates) add(`gate:${gate.id}`, 'gate')
  return { nodes, edges }
}

export function evaluatePhase11({
  candidate,
  gates,
  promptIntegrity,
  engine,
  externalGates,
  requirements
}) {
  const blockers = []
  if (promptIntegrity.status !== 'PASS')
    blockers.push('prompt_integrity_failed')
  for (const id of PHASE11_REQUIRED_GATES) {
    const gate = gates.find((entry) => entry.id === id)
    if (!gate) {
      blockers.push(`missing_required_gate:${id}`)
    } else if (gate.status !== 'PASS') {
      blockers.push(`required_gate_not_pass:${id}:${gate.status}`)
    }
  }
  if (candidate.git.dirty) blockers.push('candidate_worktree_dirty')
  if (engine.status !== 'PASS') blockers.push('node_target_mismatch')
  const externalPending = Object.entries(externalGates).filter(
    ([name, value]) => name !== 'notes' && value !== 'VALIDATED'
  )
  for (const [name] of externalPending)
    blockers.push(`external_gate_pending:${name}`)
  const incomplete = requirements.filter(
    (item) => item.status !== 'IMPLEMENTED'
  )
  for (const requirement of incomplete) {
    blockers.push(
      `requirement_not_implemented:${requirement.id}:${requirement.status}`
    )
  }
  const hardLocalFailure = blockers.some(
    (blocker) =>
      blocker.startsWith('prompt_integrity') ||
      blocker.startsWith('missing_required_gate') ||
      blocker.startsWith('required_gate_not_pass') ||
      blocker === 'candidate_worktree_dirty' ||
      blocker === 'node_target_mismatch'
  )
  if (hardLocalFailure) {
    return {
      decision: 'NO_GO',
      certification: 'NO_GO',
      blockers
    }
  }
  if (externalPending.length > 0 || incomplete.length > 0) {
    return {
      decision: 'CONDITIONAL_GO',
      certification: 'AAA_CONTROLLED',
      blockers
    }
  }
  return {
    decision: 'GO',
    certification: 'AAA_CANDIDATE',
    blockers
  }
}

export function buildPhase11Candidate(root) {
  const candidate = buildCandidateRecord({
    root,
    files: collectCandidateFiles(root)
  })
  return {
    ...candidate,
    candidateId: computeCandidateId(candidate.files)
  }
}

export function candidateDrift(root, candidate) {
  return diffCandidateFiles(candidate.files, collectCandidateFiles(root))
}

export function artifactRecord(root, relativePath) {
  const content = fs.readFileSync(path.join(root, relativePath))
  return {
    path: relativePath,
    sha256: createHash('sha256').update(content).digest('hex'),
    size: content.byteLength
  }
}
