import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  checkCurrentNextAction,
  checkJsonFiles,
  checkMarkdownLinks,
  checkOfficialStates,
  runDocumentationCheck
} from '../scripts/docs-check.mjs'
import {
  checkCanonicalState,
  checkNodePins,
  checkRepositoryState
} from '../scripts/lib/docs-state-check.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('documentation integrity (AUD19-02)', () => {
  it('has zero broken local markdown links under docs/', () => {
    const links = checkMarkdownLinks(root)
    expect(links.checked).toBeGreaterThan(100)
    expect(links.broken).toEqual([])
  })

  it('has zero invalid JSON under docs/ and certification/', () => {
    const json = checkJsonFiles(root)
    expect(json.checked).toBeGreaterThan(100)
    expect(json.invalid).toEqual([])
  })

  it('keeps the current index aligned with the runtime state next action', () => {
    expect(checkCurrentNextAction(root)).toMatchObject({
      valid: true,
      reason: null
    })
  })

  it('uses only official states in the current index', () => {
    expect(checkOfficialStates(root).unexpected).toEqual([])
  })

  it('passes the aggregate documentation checker', () => {
    expect(runDocumentationCheck(root).valid).toBe(true)
  })

  it('rejects semantic drift between canonical state and the task matrix', () => {
    const result = checkCanonicalState({
      canonical: {
        schemaVersion: 1,
        currentTask: 'AUD20-08',
        currentStatus: 'IN_PROGRESS',
        nextAction: 'execute build',
        releaseBoundary: { staging: 'NO_GO', production: 'NO_GO' },
        sources: {},
        certification: {
          currentPointer: 'certification/current.json',
          currentNamespace: 'certification/phase11',
          pointerAuthority: 'certification/phase11'
        }
      },
      matrix: {
        currentTask: 'AUD20-09',
        currentStatus: 'BLOCKED',
        tasks: [{ id: 'AUD20-08', status: 'IN_PROGRESS' }]
      },
      current: {
        task: 'AUD20-08',
        status: 'IN_PROGRESS',
        nextAction: 'execute build'
      },
      runtimeNextAction: 'execute build',
      certificationPointer: {
        schemaVersion: 1,
        kind: 'current-certification-pointer',
        phase: '11',
        authority: 'certification/phase11',
        result: 'certification/phase11/result.json',
        manifest: 'certification/phase11/manifest.json',
        historicalPhase10: {
          package: 'certification/logs/historical/phase10',
          verifier: 'npm run verify:historical',
          doesNotQualifyCurrent: true
        }
      },
      pathExists: () => true
    })
    expect(result.valid).toBe(false)
    expect(result.failures).toEqual(
      expect.arrayContaining([
        'current_task_mismatch',
        'matrix_pointer_mismatch'
      ])
    )
  })

  it('rejects mobile or divergent Node pins', () => {
    expect(
      checkNodePins({
        exact: '22.23.2',
        declaredRange: '>=22 <23',
        packageRange: '>=22 <23',
        nvmrc: '22.23.2',
        nodeVersion: '22.23.1',
        workflowVersions: ['22', '22.23.2'],
        setupNodeCount: 2,
        observed: '24.20.0'
      }).failures
    ).toEqual(
      expect.arrayContaining([
        'node_pin_mismatch:.node-version',
        'node_pin_mismatch:workflow',
        'node_runtime_mismatch'
      ])
    )
  })

  it('rejects historical Phase 10 findings as the current namespace', () => {
    const result = checkCanonicalState({
      canonical: {
        schemaVersion: 1,
        currentTask: 'AUD20-08',
        currentStatus: 'IN_PROGRESS',
        nextAction: 'execute build',
        releaseBoundary: { staging: 'NO_GO', production: 'NO_GO' },
        sources: {},
        certification: {
          currentPointer: 'certification/current.json',
          currentNamespace: 'certification/findings.json',
          pointerAuthority: 'certification/phase11'
        }
      },
      matrix: {
        currentTask: 'AUD20-08',
        currentStatus: 'IN_PROGRESS',
        tasks: [{ id: 'AUD20-08', status: 'IN_PROGRESS' }]
      },
      current: {
        task: 'AUD20-08',
        status: 'IN_PROGRESS',
        nextAction: 'execute build'
      },
      runtimeNextAction: 'execute build',
      certificationPointer: {
        schemaVersion: 1,
        kind: 'current-certification-pointer',
        phase: '11',
        authority: 'certification/phase11',
        result: 'certification/phase11/result.json',
        manifest: 'certification/phase11/manifest.json',
        historicalPhase10: {
          package: 'certification/logs/historical/phase10',
          verifier: 'npm run verify:historical',
          doesNotQualifyCurrent: true
        }
      },
      pathExists: () => true
    })
    expect(result.failures).toContain('historical_findings_selected_as_current')
  })

  it('fails closed for invalid state, duplicate task, next-action drift and certification pointer drift', () => {
    const result = checkCanonicalState({
      canonical: {
        schemaVersion: 1,
        currentTask: 'AUD20-08',
        currentStatus: 'DONE',
        nextAction: 'expected action',
        releaseBoundary: { staging: 'NO_GO', production: 'NO_GO' },
        sources: {},
        certification: {
          currentPointer: 'certification/missing.json',
          currentNamespace: 'certification/phase11',
          pointerAuthority: 'certification/phase10'
        }
      },
      matrix: {
        currentTask: 'AUD20-08',
        currentStatus: 'DONE',
        tasks: [
          { id: 'AUD20-08', status: 'DONE' },
          { id: 'AUD20-08', status: 'DONE' }
        ]
      },
      current: {
        task: 'AUD20-08',
        status: 'DONE',
        nextAction: 'different action'
      },
      runtimeNextAction: 'expected action',
      certificationPointer: {
        schemaVersion: 1,
        kind: 'current-certification-pointer',
        phase: '10',
        authority: 'certification/phase10',
        result: 'certification/findings.json',
        manifest: 'certification/missing.json',
        historicalPhase10: { doesNotQualifyCurrent: false }
      },
      pathExists: () => false
    })
    expect(result.failures).toEqual(
      expect.arrayContaining([
        'current_status_invalid',
        'matrix_pointer_mismatch',
        'next_action_mismatch',
        'certification_pointer_missing',
        'certification_pointer_mismatch',
        'certification_pointer_artifacts_invalid'
      ])
    )
  })

  it('rejects an incomplete canonical schema and a setup-node use without a pin', () => {
    const state = checkCanonicalState({
      canonical: {
        schemaVersion: 1,
        currentTask: 'AUD20-08',
        currentStatus: 'IN_PROGRESS',
        nextAction: 'execute build',
        releaseBoundary: { staging: 'NO_GO', production: 'NO_GO' },
        sources: {},
        certification: {
          currentPointer: 'certification/current.json',
          currentNamespace: 'certification/phase11',
          historicalNamespaces: []
        }
      },
      matrix: {
        currentTask: 'AUD20-08',
        currentStatus: 'IN_PROGRESS',
        tasks: [{ id: 'AUD20-08', status: 'IN_PROGRESS' }]
      },
      current: {
        task: 'AUD20-08',
        status: 'IN_PROGRESS',
        nextAction: 'execute build'
      },
      runtimeNextAction: 'execute build',
      certificationPointer: {},
      pathExists: () => true
    })
    expect(state.failures).toContain('canonical_shape_invalid')

    const node = checkNodePins({
      exact: '22.23.2',
      declaredRange: '>=22 <23',
      packageRange: '>=22 <23',
      nvmrc: '22.23.2',
      nodeVersion: '22.23.2',
      workflowVersions: ['22.23.2'],
      setupNodeCount: 2,
      observed: '22.23.2'
    })
    expect(node.failures).toContain('node_pin_mismatch:workflow')
  })

  it('rejects missing historical namespaces and a reduced Phase 10 pointer', () => {
    const result = checkCanonicalState({
      canonical: {
        schemaVersion: 1,
        kind: 'cvg-current-operational-state',
        program: 'AUD20-REM-v2',
        currentTask: 'AUD20-08',
        currentStatus: 'IN_PROGRESS',
        nextAction: 'execute build',
        releaseBoundary: { staging: 'NO_GO', production: 'NO_GO' },
        runtime: { node: { exact: '22.23.2', range: '>=22 <23' } },
        sources: {
          currentIndex: 'docs/CURRENT.md',
          runtimeState: 'docs/99_runtime_state.md',
          executionLog: 'docs/20_master_execution_log.md',
          backlog: 'docs/30_backlog_master.md',
          taskMatrix: 'docs/matrix.json'
        },
        certification: {
          currentPointer: 'certification/current.json',
          currentNamespace: 'certification/phase11',
          historicalNamespaces: [
            'certification/findings.json',
            'certification/logs/historical/phase10'
          ]
        }
      },
      matrix: {
        currentTask: 'AUD20-08',
        currentStatus: 'IN_PROGRESS',
        tasks: [{ id: 'AUD20-08', status: 'IN_PROGRESS' }]
      },
      current: {
        task: 'AUD20-08',
        status: 'IN_PROGRESS',
        nextAction: 'execute build'
      },
      runtimeNextAction: 'execute build',
      certificationPointer: {
        schemaVersion: 1,
        kind: 'current-certification-pointer',
        phase: '11',
        authority: 'certification/phase11',
        result: 'certification/phase11/result.json',
        manifest: 'certification/phase11/manifest.json',
        historicalPhase10: { doesNotQualifyCurrent: true }
      },
      pathExists: (entry) =>
        !entry.includes('findings.json') && !entry.includes('historical')
    })
    expect(result.failures).toContain('historical_namespaces_invalid')
  })

  it('returns a structured failure when canonical repository state is missing', () => {
    const result = checkRepositoryState(path.join(root, 'does-not-exist'))
    expect(result.valid).toBe(false)
    expect(result.failures).toContain(
      'required_file_missing:docs/03_build/tracking/current_state.json'
    )
  })
})
