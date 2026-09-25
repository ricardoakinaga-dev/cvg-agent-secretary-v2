#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  compareCandidateBinding,
  readJsonStrict,
  SESSION_SPEC_SHA256,
  sha256File,
  validateRegisteredApproval,
  validateSessionApproval,
  validateSessionAuthorization
} from './lib/aud20-19-human-session-binding.mjs'
import {
  inspectNamespaceOutput,
  sanitizeProxyEnvironment
} from './lib/aud20-19-human-session-harness.mjs'
import { buildPhase11Candidate } from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scriptPath = fileURLToPath(import.meta.url)
const mode = process.argv[2]

function blocked(reason, detail = '') {
  process.stderr.write(
    `AUD20-19-FU1 BLOCKED: ${reason}${detail ? ` (${detail})` : ''}\n`
  )
  process.exitCode = 2
}

function exactRuntime() {
  return process.versions.node === '22.23.2'
}

function specIntegrity() {
  const specPath = path.join(
    root,
    'docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md'
  )
  return fs.existsSync(specPath) && sha256File(specPath) === SESSION_SPEC_SHA256
}

function commandOutput(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 10000 })
  if (result.error || result.status !== 0) {
    throw new Error(`${command}_failed`)
  }
  return result.stdout ?? ''
}

function verifyNamespace() {
  commandOutput('ip', ['link', 'set', 'lo', 'up'])
  const interfacesText = commandOutput('ip', ['-brief', 'link', 'show'])
  const routesText = commandOutput('ip', ['route', 'show'])
  const result = inspectNamespaceOutput({ interfacesText, routesText })
  if (!result.allowed) throw new Error('non_loopback_network_detected')
}

function runPlaywright(outputDir) {
  const cli = path.join(root, 'node_modules/@playwright/test/cli.js')
  if (!fs.existsSync(cli)) throw new Error('playwright_cli_missing')
  const env = sanitizeProxyEnvironment(process.env)
  env.AUD20_19_OUTPUT_DIR = outputDir
  env.AUD20_19_MODE = 'verify'
  const result = spawnSync(
    process.execPath,
    [
      cli,
      'test',
      '--config',
      'playwright.aud20-19-human-session.config.ts',
      'tests/e2e/aud20-19-human-session-harness.spec.ts',
      '--project=chromium',
      '--workers=1',
      '--grep-invert',
      '@human-session'
    ],
    { cwd: root, env, stdio: 'inherit' }
  )
  if (result.error) throw result.error
  return result.status ?? 1
}

function runNamespaceChild() {
  try {
    if (!exactRuntime()) throw new Error('node_runtime_mismatch')
    if (!specIntegrity()) throw new Error('spec_hash_mismatch')
    verifyNamespace()
    const outputDir = process.env.AUD20_19_OUTPUT_DIR
    if (!outputDir || !path.isAbsolute(outputDir))
      throw new Error('temporary_output_missing')
    process.exitCode = runPlaywright(outputDir)
    if (process.exitCode === 0)
      process.stdout.write(
        'AUD20-19-FU1 verify: namespace and headless checks PASS\n'
      )
  } catch (error) {
    blocked(
      'namespace_or_verify_preflight_failed',
      error instanceof Error ? error.message : 'unknown'
    )
  }
}

function runVerify() {
  if (!exactRuntime()) return blocked('node_runtime_mismatch')
  if (!specIntegrity()) return blocked('spec_hash_mismatch')
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aud20-19-verify-'))
  fs.chmodSync(outputDir, 0o700)
  const env = sanitizeProxyEnvironment(process.env)
  env.AUD20_19_OUTPUT_DIR = outputDir
  try {
    const result = spawnSync(
      'unshare',
      [
        '--user',
        '--map-root-user',
        '--net',
        process.execPath,
        scriptPath,
        '--namespace-child-verify'
      ],
      { cwd: root, env, stdio: 'inherit', timeout: 180000 }
    )
    if (result.error)
      return blocked('network_namespace_unavailable', result.error.message)
    if (result.status !== 0)
      return blocked(
        'isolated_verify_failed',
        `exit=${result.status ?? 'signal'}`
      )
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true })
  }
}

function parseFlags(args) {
  const result = new Map()
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument.startsWith('--')) continue
    const name = argument.slice(2)
    const value = args[index + 1]
    if (!value || value.startsWith('--')) return null
    result.set(name, value)
    index += 1
  }
  return result
}

function runSession(args) {
  const flags = parseFlags(args)
  const authorizationPath = flags?.get('session-authorization')
  const approvalPath = flags?.get('session-approval')
  if (!authorizationPath || !approvalPath)
    return blocked('separate_session_authorization_required')
  if (!exactRuntime()) return blocked('node_runtime_mismatch')
  if (!specIntegrity()) return blocked('spec_hash_mismatch')
  try {
    const authorizationFile = readJsonStrict(path.resolve(authorizationPath))
    const approvalFile = readJsonStrict(path.resolve(approvalPath))
    const authorization = authorizationFile.value
    const approval = approvalFile.value
    const authorizationFailures = validateSessionAuthorization(authorization)
    const approvalFailures = validateSessionApproval(approval)
    if (authorizationFailures.length || approvalFailures.length) {
      return blocked(
        'session_records_invalid',
        [...authorizationFailures, ...approvalFailures].join(',')
      )
    }
    if (approval.authorizationSha256 !== authorizationFile.sha256) {
      return blocked('authorization_binding_mismatch')
    }
    if (
      approval.candidateId !== authorization.candidateId ||
      approval.candidateTreeHash !== authorization.candidateTreeHash ||
      JSON.stringify(approval.allowedSteps) !==
        JSON.stringify(authorization.allowedSteps) ||
      approval.validFrom !== authorization.validFrom ||
      approval.validUntil !== authorization.validUntil
    ) {
      return blocked('session_scope_mismatch')
    }
    const now = Date.now()
    if (
      now < Date.parse(approval.validFrom) ||
      now > Date.parse(approval.validUntil)
    ) {
      return blocked('session_authorization_expired')
    }
    const docsText = fs.readFileSync(
      path.join(root, 'docs/02_spec/0190_spec_validation.md'),
      'utf8'
    )
    if (!validateRegisteredApproval(approvalFile.sha256, docsText)) {
      return blocked('session_approval_not_registered')
    }
    const candidate = buildPhase11Candidate(root)
    const bindingFailures = compareCandidateBinding(candidate, approval)
    if (bindingFailures.length)
      return blocked('candidate_binding_failed', bindingFailures.join(','))

    // This build admits the harness only. Session launch remains closed until
    // a separate session-specific registration and human gate are present.
    return blocked('session_gate_not_admitted_for_current_task')
  } catch {
    return blocked('session_preflight_failed')
  }
}

if (process.argv[2] === '--namespace-child-verify') {
  runNamespaceChild()
} else if (mode === 'verify') {
  runVerify()
} else if (mode === 'session') {
  runSession(process.argv.slice(3))
} else {
  process.stdout.write(
    'Usage: node scripts/aud20-19-human-session-harness.mjs <verify|session>\n'
  )
  process.exitCode = 2
}
