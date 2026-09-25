import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs'
import path from 'node:path'

export const SESSION_ORIGIN = 'http://127.0.0.1:4174'
export const SANDBOX_NOTICE =
  'Sandbox sintético: nenhum sistema real será alterado'

const ALLOWED_QUERY_KEYS = new Set(['import', 'direct', 'v'])
const ALLOWED_GOAL_IDS = new Set([
  'synthetic_goal_executing',
  'synthetic_goal_approval',
  'synthetic_goal_handoff',
  'synthetic_goal_uncertain',
  'synthetic_goal_failed'
])
const ALLOWED_API_GETS = new Map([
  ['/health', 'health'],
  ['/v1/conversations?limit=25&offset=0', 'conversations'],
  ['/v1/conversations/synthetic_conversation_1/timeline', 'timeline'],
  ['/v1/approvals', 'approvals'],
  ['/v1/tasks', 'tasks'],
  ['/v1/outbox/dead-letters', 'dead_letters'],
  ['/v1/orchestration/goals?limit=25', 'goals'],
  ['/v1/audit/sessions/synthetic_session_1', 'audit_session'],
  [
    '/v1/observability/audit-evidence?sessionId=synthetic_session_1&limit=10&offset=0',
    'audit_evidence'
  ],
  ['/v1/observability/audit-evidence/checkpoints', 'audit_checkpoints'],
  ['/v1/admin/agents', 'admin_agents'],
  ['/v1/admin/agents/synthetic_agent_1/versions', 'admin_versions'],
  ['/v1/admin/test-lab/runs?limit=10', 'admin_test_runs'],
  ['/v1/admin/execution-traces?limit=10', 'admin_execution_traces'],
  ['/v1/journeys/owner-drafts', 'owner_drafts'],
  ['/v1/journeys/patient-drafts', 'patient_drafts'],
  ['/v1/journeys/slots', 'journey_slots'],
  ['/v1/journeys/appointment-drafts', 'appointment_drafts']
])
const APPROVAL_DECISION = '/v1/approvals/synthetic_approval_1/decision'
const APPROVAL_BODIES = new Set([
  '{"decision":"approved","note":"controlled_console_action"}',
  '{"decision":"assumed","note":"controlled_handoff_only"}'
])

export function parseRawQuery(search) {
  const supplied = String(search ?? '')
  if (supplied === '?')
    return { valid: false, reason: 'empty_query_pair_denied', entries: [] }
  const raw = supplied.replace(/^\?/, '')
  if (raw === '') return { valid: true, entries: [] }
  if (raw.includes('+') || raw.includes('%')) {
    return { valid: false, reason: 'encoded_or_plus_query_denied', entries: [] }
  }
  const entries = []
  const seen = new Set()
  for (const token of raw.split('&')) {
    if (!token)
      return { valid: false, reason: 'empty_query_pair_denied', entries: [] }
    const equal = token.indexOf('=')
    const key = equal < 0 ? token : token.slice(0, equal)
    const value = equal < 0 ? null : token.slice(equal + 1)
    if (!key || !ALLOWED_QUERY_KEYS.has(key)) {
      return { valid: false, reason: 'unknown_query_key_denied', entries: [] }
    }
    if (seen.has(key))
      return { valid: false, reason: 'duplicate_query_key_denied', entries: [] }
    seen.add(key)
    if (key === 'v') {
      if (value === null || !/^[a-f0-9]{8}$/.test(value)) {
        return { valid: false, reason: 'invalid_vite_hash_denied', entries: [] }
      }
    } else if (value !== null) {
      return { valid: false, reason: 'flag_value_denied', entries: [] }
    }
    entries.push([key, value])
  }
  return { valid: true, entries }
}

function exactSearch(rawUrl, parsed) {
  const beforeHash = String(rawUrl).split('#', 1)[0] ?? ''
  const question = beforeHash.indexOf('?')
  return question < 0 ? parsed.search : beforeHash.slice(question)
}

function pathIsAllowedViteAsset(pathname) {
  return (
    pathname === '/' ||
    pathname === '/@vite/client' ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/.vite/deps/') ||
    pathname.startsWith('/assets/')
  )
}

export function authorizeViteRequest({
  method,
  url,
  browserHash = null,
  observedUrls = []
}) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { allowed: false, ruleId: 'invalid_url' }
  }
  if (parsed.origin !== SESSION_ORIGIN)
    return { allowed: false, ruleId: 'origin_denied' }
  if (!['GET', 'HEAD'].includes(String(method).toUpperCase())) {
    return { allowed: false, ruleId: 'method_denied' }
  }
  if (!pathIsAllowedViteAsset(parsed.pathname))
    return { allowed: false, ruleId: 'asset_path_denied' }
  const search = exactSearch(url, parsed)
  const parsedQuery = parseRawQuery(search)
  if (!parsedQuery.valid) return { allowed: false, ruleId: parsedQuery.reason }
  if (parsedQuery.entries.length === 0)
    return { allowed: true, ruleId: 'asset_no_query' }

  const literal = `${parsed.pathname}${search}`
  if (observedUrls.includes(literal))
    return { allowed: true, ruleId: 'observed_asset_query' }

  const keys = parsedQuery.entries.map(([key]) => key).sort()
  const hasImport = keys.includes('import')
  const hasDirect = keys.includes('direct')
  const hasVersion = keys.includes('v')
  const isSource = parsed.pathname.startsWith('/src/')
  const isOptimized = parsed.pathname.startsWith('/node_modules/.vite/deps/')
  const isCss = parsed.pathname.endsWith('.css')

  if (hasDirect) {
    if (keys.length === 1 && isCss && (isSource || isOptimized))
      return { allowed: true, ruleId: 'css_direct' }
    return { allowed: false, ruleId: 'direct_path_or_combination_denied' }
  }
  if (hasVersion) {
    const value = parsedQuery.entries.find(([key]) => key === 'v')?.[1]
    if (!isOptimized || browserHash === null || value !== browserHash) {
      return { allowed: false, ruleId: 'vite_hash_mismatch' }
    }
    if (keys.length === 1 || (keys.length === 2 && hasImport)) {
      return {
        allowed: true,
        ruleId: hasImport ? 'optimized_import_hash' : 'optimized_hash'
      }
    }
    return { allowed: false, ruleId: 'vite_query_combination_denied' }
  }
  if (hasImport && keys.length === 1 && (isSource || isOptimized)) {
    return { allowed: true, ruleId: 'module_import' }
  }
  return { allowed: false, ruleId: 'vite_query_combination_denied' }
}

export function matchApiFixture({ method, url, rawBody = '' }) {
  let parsed
  try {
    parsed = new URL(url, SESSION_ORIGIN)
  } catch {
    return { allowed: false, ruleId: 'invalid_url' }
  }
  if (parsed.origin !== SESSION_ORIGIN)
    return { allowed: false, ruleId: 'api_origin_denied' }
  const verb = String(method).toUpperCase()
  const search = exactSearch(url, parsed)
  if (search === '?') {
    return { allowed: false, ruleId: 'api_query_denied', status: 403 }
  }
  const literal = `${parsed.pathname}${search}`
  if (verb === 'GET' && ALLOWED_API_GETS.has(literal)) {
    return { allowed: true, ruleId: ALLOWED_API_GETS.get(literal), status: 200 }
  }
  if (
    verb === 'GET' &&
    search === '' &&
    ALLOWED_GOAL_IDS.has(parsed.pathname.split('/').at(-1) ?? '') &&
    /^\/v1\/orchestration\/goals\//.test(parsed.pathname)
  ) {
    return { allowed: true, ruleId: 'synthetic_goal_detail', status: 200 }
  }
  if (
    verb === 'POST' &&
    literal === APPROVAL_DECISION &&
    APPROVAL_BODIES.has(String(rawBody))
  ) {
    return { allowed: true, ruleId: 'approval_decision_fixture', status: 200 }
  }
  return { allowed: false, ruleId: 'api_request_denied', status: 403 }
}

export function inspectNamespaceOutput({ interfacesText, routesText }) {
  const interfaces = String(interfacesText)
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
  const unexpectedInterfaces = interfaces.filter((line) => {
    const name = line.trim().split(/\s+/)[0]?.replace(/@.*$/, '')
    return name !== 'lo'
  })
  const routes = String(routesText).trim().split(/\r?\n/).filter(Boolean)
  const unexpectedRoutes = routes.filter(
    (line) => !/^127\.0\.0\.0\/8\s+dev\s+lo(?:\s|$)/.test(line.trim())
  )
  return {
    allowed: unexpectedInterfaces.length === 0 && unexpectedRoutes.length === 0,
    unexpectedInterfaces,
    unexpectedRoutes
  }
}

export function sanitizeProxyEnvironment(environment) {
  const next = { ...environment }
  for (const key of Object.keys(next)) {
    if (/(?:^|_)https?_proxy$/i.test(key) || key.toLowerCase() === 'all_proxy')
      delete next[key]
  }
  next.NO_PROXY = '127.0.0.1,localhost'
  next.no_proxy = '127.0.0.1,localhost'
  return next
}

export function createPauseReleaseGate() {
  let state = 'WAITING'
  let releasePromise
  let resolveRelease
  let rejectRelease
  releasePromise = new Promise((resolve, reject) => {
    resolveRelease = resolve
    rejectRelease = reject
  })
  return {
    get state() {
      return state
    },
    release() {
      if (state !== 'WAITING') return false
      state = 'RELEASED'
      resolveRelease(state)
      return true
    },
    stop() {
      if (state !== 'WAITING') return false
      state = 'STOPPED'
      rejectRelease(new Error('session_stopped'))
      return true
    },
    wait() {
      return releasePromise
    }
  }
}

export function createRedactedRecorder() {
  const allowedClasses = new Set([
    'asset',
    'api_fixture',
    'health_fixture',
    'deny',
    'redirect',
    'download',
    'websocket'
  ])
  const events = []
  return {
    record({
      eventClass,
      ruleId,
      decision,
      timestamp = new Date().toISOString()
    }) {
      if (!allowedClasses.has(eventClass)) throw new Error('event_class_denied')
      if (!/^[a-z0-9_]{1,64}$/.test(String(ruleId)))
        throw new Error('rule_id_invalid')
      if (!['allow', 'deny', 'blocked'].includes(decision))
        throw new Error('decision_invalid')
      events.push({ eventClass, ruleId, decision, timestamp })
    },
    snapshot() {
      return events.map((event) => ({ ...event }))
    }
  }
}

export function ensureSessionOutputDirectory(root, sessionId) {
  if (!/^[a-f0-9]{32}$/.test(String(sessionId)))
    throw new Error('session_id_invalid')
  const base = path.resolve(root, 'docs/04_audit/evidence/AUD20/human-sessions')
  const destination = path.join(base, sessionId)
  fs.mkdirSync(base, { recursive: true, mode: 0o700 })
  fs.chmodSync(base, 0o700)
  if (fs.existsSync(destination)) throw new Error('session_destination_exists')
  fs.mkdirSync(destination, { mode: 0o700 })
  const stat = fs.lstatSync(destination)
  if (stat.isSymbolicLink() || !stat.isDirectory())
    throw new Error('session_destination_invalid')
  fs.chmodSync(destination, 0o700)
  return destination
}

export function writeJsonExclusive(directory, name, value) {
  if (
    !/^(?:human-report|session-supplement|network-receipt|manifest|blocked-receipt)\.json$/.test(
      name
    )
  ) {
    throw new Error('session_output_name_denied')
  }
  const target = path.join(directory, name)
  const handle = fs.openSync(
    target,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    0o600
  )
  try {
    fs.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    fs.fchmodSync(handle, 0o600)
  } finally {
    fs.closeSync(handle)
  }
  return target
}

export function makePageInterlockScript() {
  return `(() => {
    Object.defineProperty(window, '__CVG_HARNESS_IDENTITY__', {
      value: Object.freeze({ actor: 'SYNTHETIC_SUPERVISOR', tenant: 'SYNTHETIC_TENANT', role: 'SYNTHETIC_SUPERVISOR' }),
      configurable: false,
      writable: false
    });
    const ensureNotice = () => {
      if (!document.documentElement || document.getElementById('cvg-synthetic-sandbox-notice')) return;
      const notice = document.createElement('div');
      notice.id = 'cvg-synthetic-sandbox-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      notice.textContent = ${JSON.stringify(SANDBOX_NOTICE)};
      notice.style.cssText = 'display:block;position:relative;width:100%;box-sizing:border-box;padding:8px 12px;background:#fff4cc;color:#1f2937;border-bottom:1px solid #d1a100;font:600 14px/1.4 sans-serif;z-index:2147483000';
      (document.body || document.documentElement).prepend(notice);
    };
    ensureNotice();
    new MutationObserver(ensureNotice).observe(document, { childList: true, subtree: true });
  })();`
}

export function validateNoSensitiveEventValues(events) {
  const serialized = JSON.stringify(events)
  return !/(?:https?:\/\/|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|cookie|bearer\s|authorization|query=|payload=)/i.test(
    serialized
  )
}

export function expectedEmptyApiPayload(ruleId) {
  if (ruleId === 'health') return { status: 'ok', synthetic: true }
  if (ruleId === 'goals')
    return { items: [], pageInfo: { limit: 25, total: 0, hasNextPage: false } }
  if (ruleId === 'audit_evidence')
    return {
      items: [],
      pageInfo: { limit: 10, offset: 0, total: 0, hasNextPage: false }
    }
  if (ruleId === 'audit_checkpoints') return { checkpoints: [] }
  if (ruleId === 'timeline') return { messages: [] }
  if (ruleId === 'audit_session') return { events: [] }
  if (
    ruleId === 'owner_drafts' ||
    ruleId === 'approvals' ||
    ruleId === 'tasks' ||
    ruleId === 'dead_letters' ||
    ruleId === 'admin_agents' ||
    ruleId === 'admin_versions'
  )
    return []
  if (ruleId === 'admin_test_runs' || ruleId === 'admin_execution_traces')
    return {
      items: [],
      pageInfo: { limit: 10, offset: 0, total: 0, hasNextPage: false }
    }
  if (ruleId === 'patient_drafts' || ruleId === 'appointment_drafts')
    return { drafts: [] }
  if (ruleId === 'journey_slots') return { slots: [] }
  if (ruleId === 'conversations')
    return {
      items: [],
      pageInfo: { limit: 25, offset: 0, total: 0, hasNextPage: false }
    }
  if (ruleId === 'synthetic_goal_detail')
    return { id: 'synthetic_goal_executing', status: 'EXECUTING' }
  return null
}
