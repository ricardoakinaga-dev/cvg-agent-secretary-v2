import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  probePostgresReplayGrants,
  validateLocalPostgresUrl
} from '../scripts/aud20-05-replay-grants-probe.mjs'

const root = path.resolve(import.meta.dirname, '..')
const script = path.join(root, 'scripts/aud20-05-replay-grants-probe.mjs')

function runCli(args, env = {}) {
  const childEnv = { ...process.env, ...env }
  if (env.AUD20_05_LOCAL_POSTGRES_URL === undefined) {
    delete childEnv.AUD20_05_LOCAL_POSTGRES_URL
  }
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: childEnv
    })
    return { exitCode: 0, output: JSON.parse(stdout) }
  } catch (error) {
    return {
      exitCode: typeof error.status === 'number' ? error.status : 1,
      output: JSON.parse(error.stdout?.toString('utf8') ?? '{}')
    }
  }
}

describe('AUD20-05 disposable PostgreSQL grants probe', () => {
  it('accepts loopback PostgreSQL URLs and exposes no raw connection secret', () => {
    const parsed = validateLocalPostgresUrl(
      'postgresql://synthetic:synthetic-password@127.0.0.1:55434/cvg_test'
    )

    expect(parsed.hostname).toBe('127.0.0.1')
    expect(parsed.pathname).toBe('/cvg_test')
  })

  it('rejects remote or indirect-host connection targets before connecting', () => {
    expect(() =>
      validateLocalPostgresUrl(
        'postgresql://synthetic:synthetic-password@database.example/cvg_test'
      )
    ).toThrow('connection.local_only_required')

    expect(() =>
      validateLocalPostgresUrl(
        'postgresql://synthetic:synthetic-password@127.0.0.1/cvg_test?host=database.example'
      )
    ).toThrow('connection.indirect_host_forbidden')
  })

  it('returns a redacted rejection when no local connection is supplied', async () => {
    const result = await probePostgresReplayGrants(undefined)

    expect(result).toMatchObject({
      status: 'REJECTED',
      reason: 'connection.url_required',
      productSchemaTouched: false,
      notRuntimeProof: true,
      releaseEligible: false
    })
  })

  it('allows only the controlled negative-scenario inventory', async () => {
    for (const scenario of [
      'valid',
      'missing_delete',
      'schema_create_granted',
      'table_truncate_granted',
      'runtime_owns_table',
      'bypass_rls',
      'role_membership'
    ]) {
      await expect(
        probePostgresReplayGrants(undefined, { scenario })
      ).resolves.toMatchObject({
        status: 'REJECTED',
        scenario,
        reason: 'connection.url_required'
      })
    }

    await expect(
      probePostgresReplayGrants(undefined, { scenario: 'uncontrolled' })
    ).resolves.toMatchObject({
      status: 'REJECTED',
      scenario: null,
      reason: 'probe.scenario_invalid'
    })
  })

  it('runs the CLI in explicit reject mode without attempting a remote target', () => {
    const result = runCli([
      '--postgres-url=postgresql://synthetic:synthetic-password@database.example/cvg_test',
      '--expect=REJECT'
    ])

    expect(result.exitCode).toBe(0)
    expect(result.output).toMatchObject({
      status: 'REJECTED',
      reason: 'connection.local_only_required',
      externalEffects: false,
      productSchemaTouched: false,
      releaseEligible: false
    })
    expect(JSON.stringify(result.output)).not.toContain('synthetic-password')
  })

  it('rejects an unknown CLI scenario before opening a connection', () => {
    const result = runCli([
      '--postgres-url=postgresql://synthetic:synthetic-password@127.0.0.1:1/cvg_test',
      '--scenario=uncontrolled',
      '--expect=REJECT'
    ])

    expect(result.exitCode).toBe(0)
    expect(result.output).toMatchObject({
      status: 'REJECTED',
      reason: 'probe.scenario_invalid',
      connection: null
    })
  })
})
