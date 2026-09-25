import fs from 'node:fs'
import path from 'node:path'

export const CURRENT_STATE_PATH = 'docs/03_build/tracking/current_state.json'
export const OFFICIAL_STATES = Object.freeze([
  'IN_PROGRESS',
  'READY_FOR_NEXT_STEP',
  'BLOCKED',
  'WAITING_HUMAN_APPROVAL',
  'COMPLETED'
])

const normalize = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

export function parseCurrentIndex(content) {
  return {
    status: /- status: `([^`]+)`/.exec(content)?.[1] ?? null,
    task: /- task corrente: `([^`]+)`/.exec(content)?.[1] ?? null,
    nextAction:
      /- Próxima ação: ([\s\S]*?)(?=\n\n|\n#|$)/m
        .exec(content)?.[1]
        ?.replace(/\n\s+/g, ' ')
        .trim() ?? null
  }
}

export function checkCanonicalState({
  canonical,
  matrix,
  current,
  runtimeNextAction,
  certificationPointer,
  pathExists
}) {
  const failures = []
  if (!canonical || canonical.schemaVersion !== 1) {
    failures.push('canonical_state_invalid')
    return { valid: false, failures }
  }
  const requiredSources = [
    'currentIndex',
    'runtimeState',
    'executionLog',
    'backlog',
    'taskMatrix'
  ]
  if (
    canonical.kind !== 'cvg-current-operational-state' ||
    typeof canonical.program !== 'string' ||
    typeof canonical.currentTask !== 'string' ||
    typeof canonical.nextAction !== 'string' ||
    typeof canonical.runtime?.node?.exact !== 'string' ||
    typeof canonical.runtime?.node?.range !== 'string' ||
    !canonical.sources ||
    requiredSources.some(
      (source) => typeof canonical.sources[source] !== 'string'
    ) ||
    !Array.isArray(canonical.certification?.historicalNamespaces) ||
    canonical.certification.historicalNamespaces.length === 0
  ) {
    failures.push('canonical_shape_invalid')
  }
  if (!OFFICIAL_STATES.includes(canonical.currentStatus)) {
    failures.push('current_status_invalid')
  }
  const taskRows = (matrix?.tasks ?? []).filter(
    (entry) => entry.id === canonical.currentTask
  )
  if (matrix?.currentTask !== canonical.currentTask) {
    failures.push('current_task_mismatch')
  }
  if (
    matrix?.currentStatus !== canonical.currentStatus ||
    taskRows.length !== 1 ||
    taskRows[0]?.status !== canonical.currentStatus
  ) {
    failures.push('matrix_pointer_mismatch')
  }
  if (current?.task !== canonical.currentTask) {
    failures.push('current_index_task_mismatch')
  }
  if (current?.status !== canonical.currentStatus) {
    failures.push('current_status_mismatch')
  }
  if (
    normalize(current?.nextAction) !== normalize(canonical.nextAction) ||
    normalize(runtimeNextAction) !== normalize(canonical.nextAction)
  ) {
    failures.push('next_action_mismatch')
  }
  if (
    canonical.releaseBoundary?.staging !== 'NO_GO' ||
    canonical.releaseBoundary?.production !== 'NO_GO'
  ) {
    failures.push('release_boundary_invalid')
  }
  if (
    canonical.certification?.currentNamespace ===
      'certification/findings.json' ||
    canonical.certification?.currentNamespace !== 'certification/phase11'
  ) {
    failures.push('historical_findings_selected_as_current')
  }
  const certificationPointerPath = canonical.certification?.currentPointer
  if (
    typeof certificationPointerPath !== 'string' ||
    !pathExists(certificationPointerPath)
  ) {
    failures.push('certification_pointer_missing')
  }
  if (
    certificationPointer?.schemaVersion !== 1 ||
    certificationPointer?.kind !== 'current-certification-pointer' ||
    certificationPointer?.phase !== '11' ||
    certificationPointer?.authority !==
      canonical.certification?.currentNamespace
  ) {
    failures.push('certification_pointer_mismatch')
  }
  const pointerArtifacts = [
    certificationPointer?.result,
    certificationPointer?.manifest
  ]
  if (
    pointerArtifacts.some(
      (artifact) =>
        typeof artifact !== 'string' ||
        artifact === 'certification/findings.json' ||
        !artifact.startsWith(`${canonical.certification?.currentNamespace}/`) ||
        !pathExists(artifact)
    ) ||
    certificationPointer?.historicalPhase10?.doesNotQualifyCurrent !== true
  ) {
    failures.push('certification_pointer_artifacts_invalid')
  }
  const historical = canonical.certification?.historicalNamespaces ?? []
  if (
    !historical.includes('certification/findings.json') ||
    historical.some(
      (entry) =>
        entry === canonical.certification?.currentNamespace ||
        typeof entry !== 'string' ||
        !pathExists(entry)
    ) ||
    typeof certificationPointer?.historicalPhase10?.package !== 'string' ||
    !historical.includes(certificationPointer.historicalPhase10.package) ||
    !pathExists(certificationPointer.historicalPhase10.package) ||
    typeof certificationPointer?.historicalPhase10?.verifier !== 'string'
  ) {
    failures.push('historical_namespaces_invalid')
  }
  for (const source of Object.values(canonical.sources ?? {})) {
    if (typeof source !== 'string' || !pathExists(source)) {
      failures.push(`canonical_source_missing:${source ?? 'undefined'}`)
    }
  }
  return { valid: failures.length === 0, failures }
}

function rangeAcceptsExact(range, exact) {
  if (typeof range !== 'string' || typeof exact !== 'string') return false
  const major = Number(exact.split('.')[0])
  const match = /^>=(\d+)\s+<(\d+)$/.exec(range)
  return Boolean(match && major >= Number(match[1]) && major < Number(match[2]))
}

export function checkNodePins({
  exact,
  declaredRange,
  packageRange,
  nvmrc,
  nodeVersion,
  workflowVersions,
  setupNodeCount,
  observed
}) {
  const failures = []
  if (!/^\d+\.\d+\.\d+$/.test(exact ?? '')) {
    failures.push('node_exact_invalid')
  }
  if (normalize(nvmrc) !== exact) failures.push('node_pin_mismatch:.nvmrc')
  if (normalize(nodeVersion) !== exact) {
    failures.push('node_pin_mismatch:.node-version')
  }
  if (
    !Array.isArray(workflowVersions) ||
    workflowVersions.length === 0 ||
    workflowVersions.length !== setupNodeCount ||
    workflowVersions.some((version) => normalize(version) !== exact)
  ) {
    failures.push('node_pin_mismatch:workflow')
  }
  if (
    declaredRange !== packageRange ||
    !rangeAcceptsExact(declaredRange, exact) ||
    !rangeAcceptsExact(packageRange, exact)
  ) {
    failures.push('node_range_incompatible')
  }
  if (String(observed ?? '').replace(/^v/, '') !== exact) {
    failures.push('node_runtime_mismatch')
  }
  return { valid: failures.length === 0, failures }
}

function workflowNodeVersions(root) {
  const directory = path.join(root, '.github/workflows')
  return fs
    .readdirSync(directory)
    .filter((file) => /\.ya?ml$/.test(file))
    .map((file) => {
      const content = fs.readFileSync(path.join(directory, file), 'utf8')
      return {
        setupNodeCount: [...content.matchAll(/uses:\s*actions\/setup-node@/g)]
          .length,
        versions: [
          ...content.matchAll(/^\s*node-version:\s*['"]?([^'"\s]+)['"]?/gm)
        ].map((match) => match[1])
      }
    })
}

export function checkRepositoryState(
  root,
  { observedNode = process.version } = {}
) {
  const failures = []
  const readText = (relative) => {
    try {
      return fs.readFileSync(path.join(root, relative), 'utf8')
    } catch {
      failures.push(`required_file_missing:${relative}`)
      return null
    }
  }
  const readJson = (relative) => {
    const content = readText(relative)
    if (content === null) return null
    try {
      return JSON.parse(content)
    } catch {
      failures.push(`required_json_invalid:${relative}`)
      return null
    }
  }
  const canonical = readJson(CURRENT_STATE_PATH)
  const matrix = readJson(
    'docs/03_build/tracking/aud20_v2_findings_matrix.json'
  )
  const current = parseCurrentIndex(readText('docs/CURRENT.md') ?? '')
  const runtime = readText('docs/99_runtime_state.md') ?? ''
  const actions = [...runtime.matchAll(/^- next_action: (.+)$/gm)]
  const packageJson = readJson('package.json')
  const pointer = canonical?.certification?.currentPointer
  const certificationPointer =
    typeof pointer === 'string' && fs.existsSync(path.join(root, pointer))
      ? readJson(pointer)
      : null
  const workflows = fs.existsSync(path.join(root, '.github/workflows'))
    ? workflowNodeVersions(root)
    : []
  const state = checkCanonicalState({
    canonical,
    matrix,
    current,
    runtimeNextAction: actions.at(-1)?.[1] ?? null,
    certificationPointer,
    pathExists: (relative) => fs.existsSync(path.join(root, relative))
  })
  const node = checkNodePins({
    exact: canonical?.runtime?.node?.exact,
    declaredRange: canonical?.runtime?.node?.range,
    packageRange: packageJson?.engines?.node,
    nvmrc: readText('.nvmrc'),
    nodeVersion: readText('.node-version'),
    workflowVersions: workflows.flatMap((workflow) => workflow.versions),
    setupNodeCount: workflows.reduce(
      (count, workflow) => count + workflow.setupNodeCount,
      0
    ),
    observed: observedNode
  })
  return {
    valid: failures.length === 0 && state.valid && node.valid,
    failures: [...failures, ...state.failures, ...node.failures],
    state,
    node,
    observedNode
  }
}
