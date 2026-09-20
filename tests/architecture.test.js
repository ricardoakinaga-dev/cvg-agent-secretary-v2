import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * AUD19-07 — executable architecture gates.
 *
 * Frozen snapshots were measured on 2026-09-20 at commit 99dffff (see
 * docs/04_audit/evidence/AUD19/AUD19-07-baseline.md and ADR 0002). These gates
 * are intentionally static and dependency-free: a violation fails the suite
 * instead of relying on review.
 */

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** `wc -l` at task start; extracted hotspots may shrink but never grow. */
const HOTSPOT_BASELINES = {
  'apps/api/src/server.ts': 6215,
  'packages/persistence/src/postgres.ts': 4221
}

/** Modules extracted by AUD19-07; each must declare a single responsibility. */
const EXTRACTED_MODULES = [
  'apps/api/src/server/tenant-isolation.ts',
  'apps/api/src/server/postgres-role-checks.ts',
  'apps/api/src/server/bootstrap-persistence.ts',
  'packages/persistence/src/postgres/types.ts',
  'packages/persistence/src/postgres/migrations.ts',
  'packages/persistence/src/postgres/outbox-support.ts'
]

/** ADR 0001: LangGraph stays behind the composition boundary. */
const LANGGRAPH_BOUNDARY = 'packages/agent-runtime/src/composition.ts'

/** Public exports frozen before extraction; equality is asserted both ways. */
const EXPECTED_EXPORTS = {
  'apps/api/src/server.ts': [
    'AgentRuntimeOptions',
    'BuildServerFromEnvOptions',
    'BuildServerOptions',
    'InboundRuntimeCompletion',
    'InboundTenantResolver',
    'OperatorIdentityResolver',
    'RuntimeLogEntry',
    'WebhookVerification',
    'WebhookVerifier',
    'assertMigrationRoleIsLeastPrivilege',
    'assertMigrationRoleSecurityBoundary',
    'assertRuntimeRoleIsLeastPrivilege',
    'assertTenantIsolationMigrationState',
    'assertTenantIsolationSchema',
    'assertWebhookReplaySchema',
    'buildServer',
    'buildServerFromEnv'
  ].sort(),
  'packages/persistence/src/postgres.ts': [
    'DurableOutboxEventRecord',
    'DurableOutboxStatus',
    'InboundRuntimeCompletionInput',
    'LegacyMigrationBaselineApproval',
    'OUTBOX_BASE_BACKOFF_MS',
    'OUTBOX_DEFAULT_LEASE_MS',
    'OUTBOX_MAX_ATTEMPTS',
    'OUTBOX_MAX_BACKOFF_MS',
    'PostgresMigrationOptions',
    'PostgresOutboxAckInput',
    'PostgresOutboxEnqueueInput',
    'PostgresOutboxRequeueInput',
    'PostgresQueryable',
    'PostgresRuntimeRepository',
    'PostgresRuntimeRepositoryOptions',
    'PostgresTransactionClient',
    'RuntimeAuditChainVerification',
    'baselineLegacyPostgresMigration',
    'legacyRequiredColumns',
    'legacyRequiredIndexes',
    'readInitialMigrationSql',
    'readPostgresMigrationSql',
    'runInitialPostgresMigration',
    'runPostgresMigrations'
  ].sort()
}

/**
 * Import cycles that existed before AUD19-07 and consist only of `import type`
 * edges (erased at runtime). Justified in ADR 0002; the gate fails if a new
 * cycle appears or if any runtime-value cycle exists.
 */
const TYPE_CYCLE_ALLOWLIST = [
  [
    'packages/persistence/src/audit-evidence-checkpoint.ts',
    'packages/persistence/src/schema.ts'
  ],
  [
    'packages/platform/src/event-bus.ts',
    'packages/platform/src/plugin-gateway.ts'
  ],
  [
    'packages/platform/src/plugin-gateway.ts',
    'packages/platform/src/tool-invocation-boundary.ts'
  ]
].map((cycle) => [...cycle].sort().join(' -> '))

const SPECIFIER_PATTERN =
  /(?:^|\n)[ \t]*import\s+(type\s+)?(?:[\w$]+\s*,\s*)?(?:\{[^}]*\}|\*\s+as\s+[\w$]+|[\w$]+)\s*from\s*['"]([^'"]+)['"]|(?:^|\n)[ \t]*import\s*['"]([^'"]+)['"]|(?:^|\n)[ \t]*import\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:^|\n)[ \t]*export\s+(type\s+)?(?:\{[^}]*\}|\*)\s*from\s*['"]([^'"]+)['"]/g

function listWorkspaces() {
  const workspaces = []
  for (const base of ['apps', 'packages']) {
    for (const name of fs.readdirSync(path.join(rootDir, base))) {
      const pkgDir = path.join(rootDir, base, name)
      const srcDir = path.join(pkgDir, 'src')
      if (!fs.existsSync(srcDir)) continue
      workspaces.push({ pkgDir, srcDir, files: listSourceFiles(srcDir) })
    }
  }
  return workspaces
}

function listSourceFiles(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage'].includes(entry.name)) continue
      files.push(...listSourceFiles(filePath))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(filePath)
    }
  }
  return files
}

function relative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/')
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function readImports(filePath) {
  const source = stripComments(fs.readFileSync(filePath, 'utf8'))
  const imports = []
  for (const match of source.matchAll(SPECIFIER_PATTERN)) {
    const specifier = match[2] ?? match[3] ?? match[4] ?? match[6]
    if (specifier) {
      imports.push({ specifier, typeOnly: Boolean(match[1] ?? match[5]) })
    }
  }
  return imports
}

function isTestFixture(filePath) {
  const normalized = relative(filePath)
  return (
    normalized.includes('/__tests__/') ||
    /\.test\.[tj]sx?$/.test(normalized) ||
    /\.spec\.[tj]sx?$/.test(normalized)
  )
}

function resolveRelativeImport(filePath, specifier) {
  const base = path.resolve(path.dirname(filePath), specifier)
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts')
  ]
  return candidates.find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  )
}

function publicExportsOf(relativePath) {
  const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
  const names = new Set()
  const declaration =
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(interface|type|function|const|class|enum)\s+([A-Za-z0-9_$]+)/gm
  const braces = /^export\s+(?:type\s+)?\{([^}]*)\}/gm
  for (const match of source.matchAll(declaration)) names.add(match[2])
  for (const match of source.matchAll(braces)) {
    for (const entry of match[1].split(',')) {
      const name = entry
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim()
      if (name) names.add(name)
    }
  }
  return [...names].sort()
}

function lineCountOf(relativePath) {
  const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
  return source.split('\n').length - 1
}

function importGraph({ includeTypeOnly }) {
  const workspaces = listWorkspaces()
  const workspaceByFile = new Map()
  for (const workspace of workspaces) {
    for (const file of workspace.files) workspaceByFile.set(file, workspace)
  }
  const graph = new Map()
  for (const [file] of workspaceByFile) {
    const workspace = workspaceByFile.get(file)
    const edges = []
    for (const { specifier, typeOnly } of readImports(file)) {
      if (!specifier.startsWith('.')) continue
      if (typeOnly && !includeTypeOnly) continue
      const target = resolveRelativeImport(file, specifier)
      if (!target) continue
      if (!target.startsWith(`${workspace.pkgDir}${path.sep}`)) continue
      edges.push(target)
    }
    graph.set(file, edges)
  }
  return graph
}

function findCycles(graph) {
  const state = new Map()
  const cycles = new Set()
  const visit = (node, stack) => {
    state.set(node, 1)
    stack.push(node)
    for (const next of graph.get(node) ?? []) {
      const nextState = state.get(next) ?? 0
      if (nextState === 1) {
        const cycle = stack.slice(stack.indexOf(next))
        cycles.add(cycle.map(relative).sort().join(' -> '))
      } else if (nextState === 0) {
        visit(next, stack)
      }
    }
    stack.pop()
    state.set(node, 2)
  }
  for (const node of graph.keys()) {
    if ((state.get(node) ?? 0) === 0) visit(node, [])
  }
  return [...cycles]
}

describe('architecture boundaries (AUD19-07)', () => {
  it('keeps langgraph imports behind the ADR 0001 composition boundary', () => {
    const violations = []
    for (const workspace of listWorkspaces()) {
      for (const file of workspace.files) {
        if (relative(file) === LANGGRAPH_BOUNDARY) continue
        for (const { specifier } of readImports(file)) {
          if (/^langgraph(\/|$)|^@langchain(\/|$)/.test(specifier)) {
            violations.push(`${relative(file)} -> ${specifier}`)
          }
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('rejects deep cross-workspace imports outside justified exceptions', () => {
    const exceptions = []
    const violations = []
    for (const workspace of listWorkspaces()) {
      for (const file of workspace.files) {
        const importer = relative(file)
        for (const { specifier } of readImports(file)) {
          const deepSpecifier =
            /(^|\/)packages\//.test(specifier) ||
            /(^|\/)apps\//.test(specifier) ||
            /^@cvg\/[^/]+\/src(\/|$)/.test(specifier)
          const escapesWorkspace =
            specifier.startsWith('.') &&
            !path
              .resolve(path.dirname(file), specifier)
              .startsWith(`${workspace.pkgDir}${path.sep}`)
          if (!deepSpecifier && !escapesWorkspace) continue
          const target = resolveRelativeImport(file, specifier)
          const targetRelative = target ? relative(target) : specifier
          const justified =
            (isTestFixture(file) && targetRelative.startsWith('apps/')) ||
            (targetRelative.startsWith('scripts/lib/') &&
              (isTestFixture(file) || importer.endsWith('/main.ts')))
          const entry = `${importer} -> ${specifier}`
          if (justified) exceptions.push(entry)
          else violations.push(entry)
        }
      }
    }
    expect(violations).toEqual([])
    // Justified exceptions: test fixtures composing another workspace and
    // process entrypoints/tests sharing `scripts/lib/*` helpers. Production
    // code has none; see ADR 0002.
  })

  it('has no runtime import cycles and only the allowlisted type-only cycles', () => {
    expect(findCycles(importGraph({ includeTypeOnly: false }))).toEqual([])
    const typeCycles = findCycles(importGraph({ includeTypeOnly: true }))
    const unexpected = typeCycles.filter(
      (cycle) => !TYPE_CYCLE_ALLOWLIST.includes(cycle)
    )
    expect(unexpected).toEqual([])
  })

  it('never grows the extracted hotspots and documents each module', () => {
    for (const [file, baseline] of Object.entries(HOTSPOT_BASELINES)) {
      expect(lineCountOf(file), `${file} must not grow`).toBeLessThanOrEqual(
        baseline
      )
    }
    for (const file of EXTRACTED_MODULES) {
      expect(
        fs.existsSync(path.join(rootDir, file)),
        `${file} must exist`
      ).toBe(true)
      const header = fs
        .readFileSync(path.join(rootDir, file), 'utf8')
        .split('\n')
        .slice(0, 25)
        .join('\n')
      expect(header, `${file} must declare its responsibility`).toMatch(
        /^ \* Responsibility:/m
      )
    }
  })

  it('preserves the frozen public export surface of both hotspots', () => {
    for (const [file, expected] of Object.entries(EXPECTED_EXPORTS)) {
      expect(publicExportsOf(file), `${file} exports changed`).toEqual(expected)
    }
  })
})
