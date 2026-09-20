import fs from 'node:fs'
import path from 'node:path'

const rawDir = 'docs/04_audit/evidence/AUD19/raw'
const files = fs
  .readdirSync(rawDir)
  .filter((f) => f.endsWith('.json'))
  .sort()

const records = files.map((file) =>
  JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf8'))
)

const projects = ['chromium', 'firefox', 'webkit']
const summary = {
  synthetic: true,
  task: 'AUD19-10',
  generatedAt: new Date().toISOString(),
  note: 'Synthetic accessibility evidence; fixtures are labeled synthetic and no real backend or data is used.',
  source: 'npx playwright test --project=<browser> --workers=1 (AUD19_A11Y_EVIDENCE=1)',
  environment: {
    node: process.version,
    playwright: '1.59.1',
    os: 'Linux Mint 22.3 (Ubuntu noble base)',
    browsers: {
      chromium: 'chromium-1217 (Playwright 1.59.1)',
      firefox: 'firefox-1511 / Firefox 148.0.2',
      webkit: 'webkit-2272'
    },
    webkitHostDependencies:
      'libavif16, libgstreamer-plugins-bad1.0-0, libgav1-1, libyuv0 were not installable via sudo; libraries were extracted locally from Ubuntu noble .debs and copied into the Playwright webkit bundle lib directory. Canonical fix remains `npx playwright install-deps` with sudo.'
  },
  exceptions: {
    axeFrozenExceptions: [],
    note: 'No critical/serious axe exceptions were required; the frozen exception list is empty.'
  },
  limitations: [
    'Screen-reader coverage: NOT_RUN as a full test. No Orca/NVDA/VoiceOver runtime was available; coverage is limited to sampled accessible-name/role validation via axe (0 violations) plus complete keyboard traversal. Do not read this as a complete screen-reader certification.',
    'Zoom/reflow is emulated by viewport equivalence (320 CSS px = 1280 px at 400%; 640 CSS px = 1280 px at 200%); Playwright has no cross-engine native browser-zoom API. CSS px text does not respond to a 200% text-only font-size preference; page zoom equivalence is what was measured.',
    'axe scans run with prefers-reduced-motion: reduce so no contrast sample lands mid-transition.',
    'Automatic axe (axe-core 4.13.0) and scripted focus measurements only; no independent human WCAG audit was performed.',
    'Single machine, single OS: results are linux-only and were not re-run on Windows/macOS rendering stacks.'
  ],
  perBrowser: {}
}

const browserVersions = {
  chromium: 'Chromium (Playwright 1.59.1, chromium-1217)',
  firefox: 'Firefox 148.0.2 (Playwright 1.59.1, firefox-1511)',
  webkit: 'WebKit (Playwright 1.59.1, webkit-2272)'
}

for (const project of projects) {
  const own = records.filter((r) => r.project === project)
  const byKind = (kind) => own.filter((r) => r.kind === kind)
  const axeGates = byKind('axe-gate')
  const axeScans = byKind('axe')
  const contrast = byKind('contrast')
  const keyboard = byKind('keyboard-order')
  const reflow = byKind('zoom-reflow')
  const forced = byKind('forced-colors')
  const targets = byKind('touch-targets')
  const typography = byKind('typography')
  const entry = {
    browser: browserVersions[project],
    axe: {
      scans: axeScans.map((r) => ({
        label: r.label,
        violationCount: r.data.violations.length,
        violations: r.data.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target.join(' '))
        })),
        incompleteCount: r.data.incompleteCount
      })),
      gates: axeGates.map((r) => ({
        label: r.label,
        blockingCriticalOrSerious: r.data.blocking,
        exemptedByFrozenList: r.data.exemptedByFrozenList,
        frozenExceptions: r.data.frozenExceptions
      })),
      blockingTotal: axeGates.reduce(
        (total, r) => total + r.data.blocking.length,
        0
      )
    },
    contrast: contrast.map((r) => ({
      label: r.label,
      violations: r.data.violations.length,
      incomplete: r.data.incomplete ?? r.data.incompleteCount ?? 0
    })),
    keyboard: keyboard.map((r) => ({
      label: r.label,
      probeCount: r.data.probeCount,
      visitedCount: r.data.visited.length,
      unreached: r.data.unreached,
      missingFocusIndicator: r.data.missingFocusIndicator,
      strictlyDomOrdered: r.data.strictlyDomOrdered
    })),
    reflow: reflow.map((r) => ({
      label: r.label,
      emulation: r.data.emulation,
      viewport: r.data.metrics.viewport,
      documentScrollWidth: r.data.metrics.documentScrollWidth,
      bodyScrollWidth: r.data.metrics.bodyScrollWidth,
      panelOverflow: r.data.metrics.panels.filter(
        (p) => p.scrollWidth > p.clientWidth + 1
      )
    })),
    forcedColors: forced.map((r) => ({ label: r.label, data: r.data })),
    touchTargets: targets.map((r) => ({
      label: r.label,
      total: r.data.total,
      tooSmall: r.data.tooSmall,
      inlineExceptions: r.data.inlineExceptions.length
    })),
    typography: typography.map((r) => ({
      label: r.label,
      samples: r.data.samples.length,
      failures: r.data.failures
    })),
    states: own
      .filter((r) => r.kind.startsWith('state-') || r.kind === 'uncertain-readonly')
      .map((r) => ({ kind: r.kind, label: r.label, data: r.data }))
  }
  summary.perBrowser[project] = entry
}

const outputPath = 'docs/04_audit/evidence/AUD19/AUD19-10-a11y-results.json'
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2))
console.log(`Wrote ${outputPath}`)

for (const project of projects) {
  const e = summary.perBrowser[project]
  console.log(`\n=== ${project} ===`)
  console.log('axe scans:', e.axe.scans.map((s) => `${s.label}=${s.violationCount}`).join(', '))
  console.log('axe blocking critical/serious:', e.axe.blockingTotal)
  console.log('contrast violations:', e.contrast.map((c) => `${c.label}=${c.violations}`).join(', '))
  console.log('keyboard:', JSON.stringify(e.keyboard))
  console.log('reflow overflow panels:', e.reflow.reduce((t, r) => t + r.panelOverflow.length, 0))
  console.log('forcedColors support:', JSON.stringify(e.forcedColors.find((f) => f.label === 'emulation-support')?.data))
  console.log('touch targets tooSmall:', e.touchTargets.map((t) => `${t.label}=${t.tooSmall.length}/${t.total}`).join(', '))
  console.log('typography failures:', e.typography.map((t) => `${t.label}=${t.failures.length}/${t.samples}`).join(', '))
}
