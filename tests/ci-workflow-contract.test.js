import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workflow = fs.readFileSync(
  path.join(rootDir, '.github/workflows/verify.yml'),
  'utf8'
)

describe('controlled CI workflow contract', () => {
  it('declares least-privilege and stale-run protection', () => {
    expect(workflow).toContain('permissions:')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('concurrency:')
    expect(workflow).toContain('cancel-in-progress: true')
    expect(workflow).toContain('persist-credentials: false')
  })

  it('calls every available construction gate explicitly', () => {
    expect(workflow).toContain('npm ci --ignore-scripts')
    expect(workflow).toContain('npm run readiness')
    expect(workflow).toContain('npm run verify')
    expect(workflow).toContain('npm run test:postgres')
    expect(workflow).toContain('npm run test:e2e')
    expect(workflow).toContain('npm run test:worker:startup')
    expect(workflow).toContain('git diff --check')
  })
})
