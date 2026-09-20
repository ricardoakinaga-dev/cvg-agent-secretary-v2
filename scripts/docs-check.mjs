#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const OFFICIAL_STATES = Object.freeze([
  'IN_PROGRESS',
  'READY_FOR_NEXT_STEP',
  'BLOCKED',
  'WAITING_HUMAN_APPROVAL',
  'COMPLETED'
])

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'coverage',
  'test-results',
  'playwright-report',
  'blob-report',
  'dist'
])

const LINK_PATTERN = /!?\[[^\]]*\]\(([^()\s]*(?:\([^()]*\))?[^()\s]*)\)/g

function walk(root, predicate, collected = []) {
  let entries
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return collected
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue
      walk(path.join(root, entry.name), predicate, collected)
      continue
    }
    if (!entry.isFile()) continue
    if (predicate(entry.name)) collected.push(path.join(root, entry.name))
  }
  return collected
}

function stripCodeFences(content) {
  const lines = content.split('\n')
  const kept = []
  let fence = null
  for (const line of lines) {
    const match = /^\s*(```|~~~)/.exec(line)
    if (match) {
      fence = fence === null ? match[1] : null
      continue
    }
    if (fence === null) kept.push(line)
  }
  return kept.join('\n')
}

function normalizeTarget(raw) {
  let target = raw.trim()
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1)
  }
  const hashIndex = target.indexOf('#')
  if (hashIndex >= 0) target = target.slice(0, hashIndex)
  if (!target) return null
  if (/^(https?:|mailto:|tel:|data:|ftp:)/i.test(target)) return null
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

export function checkMarkdownLinks(root, { scope = 'docs' } = {}) {
  const base = path.join(root, scope)
  const files = walk(base, (name) => name.endsWith('.md'))
  const broken = []
  let checked = 0
  for (const file of files) {
    const content = stripCodeFences(fs.readFileSync(file, 'utf8'))
    for (const match of content.matchAll(LINK_PATTERN)) {
      const target = normalizeTarget(match[1])
      if (target === null) continue
      if (target.startsWith('/')) continue
      checked += 1
      const candidates = [target]
      const lineSuffix = /^(.*):\d+(?::\d+)?$/.exec(target)
      if (lineSuffix) candidates.push(lineSuffix[1])
      const exists = candidates.some((candidate) =>
        fs.existsSync(path.resolve(path.dirname(file), candidate))
      )
      if (!exists) {
        broken.push({
          file: path.relative(root, file),
          target: match[1],
          resolved: path.relative(
            root,
            path.resolve(path.dirname(file), target)
          )
        })
      }
    }
  }
  return { checked, broken }
}

export function checkJsonFiles(
  root,
  { scopes = ['docs', 'certification'] } = {}
) {
  const files = scopes.flatMap((scope) =>
    walk(path.join(root, scope), (name) => name.endsWith('.json'))
  )
  const invalid = []
  for (const file of files) {
    const relative = path.relative(root, file)
    const content = fs.readFileSync(file, 'utf8')
    if (content.trim().length === 0) {
      invalid.push({ file: relative, reason: 'empty' })
      continue
    }
    try {
      JSON.parse(content)
    } catch (error) {
      invalid.push({
        file: relative,
        reason: error instanceof Error ? error.message : 'invalid'
      })
    }
  }
  return { checked: files.length, invalid }
}

export function lastRecordedNextAction(root) {
  const runtimeState = fs.readFileSync(
    path.join(root, 'docs/99_runtime_state.md'),
    'utf8'
  )
  const matches = [...runtimeState.matchAll(/^- next_action: (.+)$/gm)]
  return matches.length === 0 ? null : matches[matches.length - 1][1].trim()
}

export function currentIndexNextAction(root) {
  const currentIndex = fs.readFileSync(
    path.join(root, 'docs/CURRENT.md'),
    'utf8'
  )
  const match = /^- Próxima ação: (.+)$/m.exec(currentIndex)
  return match === null ? null : match[1].trim()
}

export function checkCurrentNextAction(root) {
  const runtimeStateAction = lastRecordedNextAction(root)
  const currentIndexAction = currentIndexNextAction(root)
  if (runtimeStateAction === null || currentIndexAction === null) {
    return {
      valid: false,
      reason: 'missing_next_action',
      runtimeStateAction,
      currentIndexAction
    }
  }
  const normalize = (value) => value.replace(/\s+/g, ' ').trim()
  return {
    valid: normalize(runtimeStateAction) === normalize(currentIndexAction),
    reason:
      normalize(runtimeStateAction) === normalize(currentIndexAction)
        ? null
        : 'next_action_mismatch',
    runtimeStateAction,
    currentIndexAction
  }
}

export function checkOfficialStates(root) {
  const currentIndex = fs.readFileSync(
    path.join(root, 'docs/CURRENT.md'),
    'utf8'
  )
  const declared = [
    ...currentIndex.matchAll(/\bstatus:\s*`?([A-Z_]+)`?/gi)
  ].map((match) => match[1])
  const unexpected = [...new Set(declared)].filter(
    (state) => !OFFICIAL_STATES.includes(state)
  )
  return { declared: [...new Set(declared)], unexpected }
}

export function runDocumentationCheck(root) {
  const links = checkMarkdownLinks(root)
  const json = checkJsonFiles(root)
  const states = checkOfficialStates(root)
  const nextAction = checkCurrentNextAction(root)
  const valid =
    links.broken.length === 0 &&
    json.invalid.length === 0 &&
    states.unexpected.length === 0 &&
    nextAction.valid
  return {
    schemaVersion: 1,
    kind: 'aud19-documentation-check',
    valid,
    links,
    json,
    states,
    nextAction
  }
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const report = runDocumentationCheck(root)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exitCode = report.valid ? 0 : 1
}
