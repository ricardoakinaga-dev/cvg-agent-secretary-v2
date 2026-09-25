import os from 'node:os'

const SHA256 = /^[a-f0-9]{64}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

export function validateQualificationInput(input, manifest) {
  const failures = []
  const profile = manifest?.profiles?.[input?.profile]
  if (!profile) failures.push('profile_unknown')
  if (!SHA256.test(String(input?.candidateId ?? ''))) {
    failures.push('candidate_invalid')
  }
  for (const [key, minimum, maximum] of [
    ['events', manifest?.limits?.minEvents, manifest?.limits?.maxEvents],
    [
      'concurrency',
      manifest?.limits?.minConcurrency,
      manifest?.limits?.maxConcurrency
    ]
  ]) {
    const value = input?.[key]
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      failures.push(`${key}_out_of_bounds`)
    }
  }
  if (
    !Number.isInteger(input?.durationMs) ||
    input.durationMs < 1 ||
    input.durationMs > manifest?.limits?.maxDurationMs
  ) {
    failures.push('duration_out_of_bounds')
  }
  if (profile?.requiresDatabase && !input?.databaseAvailable) {
    failures.push('postgres_required')
  }
  if (profile?.requiresHuman && input?.humanEvidence !== true) {
    failures.push('human_evidence_required')
  }
  return failures
}

export function environmentFingerprint() {
  const cpus = os.cpus()
  return {
    node: process.version,
    platform: process.platform,
    release: os.release(),
    architecture: os.arch(),
    cpuModel: cpus[0]?.model ?? 'unknown',
    logicalCpuCount: cpus.length,
    totalMemoryBytes: os.totalmem()
  }
}

export function validateProfileReport(
  report,
  manifest,
  expectedCandidateId,
  verifyArtifact
) {
  const failures = []
  const profile = manifest?.profiles?.[report?.profile]
  if (!profile) return ['profile_unknown']
  if (!SHA256.test(String(report?.candidateId ?? ''))) {
    failures.push('candidate_invalid')
  }
  if (!expectedCandidateId || report?.candidateId !== expectedCandidateId) {
    failures.push('candidate_mismatch')
  }
  if (report?.claim !== profile.claim) failures.push('claim_profile_mismatch')
  if (report?.releaseEligible !== false) failures.push('release_must_be_false')
  if (!report?.environment?.node || !report?.environment?.cpuModel) {
    failures.push('environment_fingerprint_missing')
  }
  if (report?.environment?.node !== manifest?.runtime?.node) {
    failures.push('runtime_node_mismatch')
  }
  const skipped = report?.skips
  if (
    !skipped ||
    !Number.isInteger(skipped.total) ||
    !Number.isInteger(skipped.required) ||
    !Number.isInteger(skipped.optional) ||
    !Number.isInteger(skipped.unknown) ||
    skipped.total !== skipped.required + skipped.optional + skipped.unknown ||
    skipped.required !== 0 ||
    skipped.unknown !== 0
  ) {
    failures.push('required_or_unknown_skips')
  }
  const commandRecords = Array.isArray(report?.commands) ? report.commands : []
  const commands = new Set(commandRecords.map((entry) => entry.id))
  for (const id of profile.commands) {
    if (!commands.has(id)) failures.push(`command_missing:${id}`)
  }
  if (commandRecords.some((entry) => !profile.commands.includes(entry.id))) {
    failures.push('command_not_allowlisted')
  }
  if (commands.size !== commandRecords.length) {
    failures.push('command_duplicate')
  }
  if (
    commandRecords.some(
      (entry) =>
        entry.status !== 'PASS' ||
        entry.exitCode !== 0 ||
        !SHA256.test(String(entry.stdoutSha256 ?? '')) ||
        !SHA256.test(String(entry.stderrSha256 ?? ''))
    )
  ) {
    failures.push('command_failed')
  }
  if (
    typeof verifyArtifact !== 'function' ||
    commandRecords.some(
      (entry) =>
        verifyArtifact(entry.stdoutArtifact, entry.stdoutSha256) !== true ||
        verifyArtifact(entry.stderrArtifact, entry.stderrSha256) !== true ||
        (entry.testReportArtifact &&
          verifyArtifact(entry.testReportArtifact, entry.testReportSha256) !==
            true)
    )
  ) {
    failures.push('command_artifact_receipt_invalid')
  }
  for (const metric of profile.requiredMetrics) {
    if (report?.metrics?.[metric] === undefined) {
      failures.push(`metric_missing:${metric}`)
    }
  }
  if (report.profile === 'postgres_durable') {
    const metrics = report?.metrics ?? {}
    const latency = metrics.latencyMs ?? {}
    if (
      !Number.isInteger(metrics.processed) ||
      metrics.processed !== report?.configuration?.events ||
      !Number.isFinite(metrics.throughputPerSecond) ||
      metrics.throughputPerSecond <= 0 ||
      ![latency.p50, latency.p95, latency.p99, metrics.recoveryMs].every(
        (value) => Number.isFinite(value) && value >= 0
      ) ||
      latency.p50 > latency.p95 ||
      latency.p95 > latency.p99 ||
      ![metrics.errors, metrics.retries, metrics.backlog].every(
        (value) => Number.isInteger(value) && value >= 0
      ) ||
      metrics.errors !== 0 ||
      metrics.backlog !== 0 ||
      !Number.isInteger(metrics.recoveryTerminationCount) ||
      metrics.recoveryTerminationCount < 1 ||
      !Number.isInteger(metrics.recoveryPoolErrors) ||
      !Number.isInteger(metrics.recoveryQueryFailures) ||
      metrics.recoveryPoolErrors + metrics.recoveryQueryFailures < 1 ||
      metrics.cleanup !== 'PASS'
    ) {
      failures.push('postgres_metrics_invalid')
    }
  }
  if (
    profile.requiredMetrics.length > 0 &&
    (!report?.configuration ||
      !Number.isInteger(report.configuration.events) ||
      report.configuration.events < manifest.limits.minEvents ||
      report.configuration.events > manifest.limits.maxEvents ||
      !Number.isInteger(report.configuration.concurrency) ||
      report.configuration.concurrency < manifest.limits.minConcurrency ||
      report.configuration.concurrency > manifest.limits.maxConcurrency ||
      !Number.isInteger(report.configuration.durationMs) ||
      report.configuration.durationMs < 1 ||
      report.configuration.durationMs > manifest.limits.maxDurationMs)
  ) {
    failures.push('configuration_missing')
  }
  if (
    report.profile === 'memory_smoke' &&
    /POSTGRES|PRODUCTION/.test(String(report.claim))
  ) {
    failures.push('memory_claim_overstated')
  }
  return failures
}

export function validateHumanAccessibilityEvidence(evidence) {
  if (evidence?.status === 'PENDING_HUMAN_SESSION') {
    return { status: 'PENDING', failures: [] }
  }
  const failures = []
  if (evidence?.synthetic !== true) failures.push('synthetic_scope_required')
  if (evidence?.consentConfirmed !== true) failures.push('consent_required')
  if (!String(evidence?.participantRole ?? '').trim()) {
    failures.push('participant_role_required')
  }
  if (!String(evidence?.assistiveTechnology?.name ?? '').trim()) {
    failures.push('assistive_technology_required')
  }
  if (!String(evidence?.assistiveTechnology?.version ?? '').trim()) {
    failures.push('assistive_technology_version_required')
  }
  if (!ISO_DATE.test(String(evidence?.startedAt ?? ''))) {
    failures.push('started_at_invalid')
  }
  if (!ISO_DATE.test(String(evidence?.finishedAt ?? ''))) {
    failures.push('finished_at_invalid')
  }
  if (
    ISO_DATE.test(String(evidence?.startedAt ?? '')) &&
    ISO_DATE.test(String(evidence?.finishedAt ?? '')) &&
    Date.parse(evidence.finishedAt) <= Date.parse(evidence.startedAt)
  ) {
    failures.push('timestamps_out_of_order')
  }
  if (!Array.isArray(evidence?.steps) || evidence.steps.length === 0) {
    failures.push('steps_required')
  } else if (
    evidence.steps.some(
      (step) =>
        !String(step?.id ?? '').trim() ||
        !['PASS', 'FAIL', 'BLOCKED'].includes(step?.status) ||
        !String(step?.observation ?? '').trim()
    )
  ) {
    failures.push('step_invalid')
  }
  if (!Array.isArray(evidence?.issues)) failures.push('issues_required')
  return {
    status: failures.length === 0 ? 'READY_FOR_HUMAN_REVIEW' : 'FAIL',
    failures
  }
}

export function percentile(values, rank) {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(rank * sorted.length) - 1)
  ]
}
