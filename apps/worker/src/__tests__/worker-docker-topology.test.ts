import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = process.cwd()
const dockerfile = fs.readFileSync(
  path.join(repositoryRoot, 'Dockerfile'),
  'utf8'
)
const dockerignore = fs.readFileSync(
  path.join(repositoryRoot, '.dockerignore'),
  'utf8'
)

describe('worker container topology contract', () => {
  it('builds the API and worker from the same non-root runtime base', () => {
    expect(dockerfile).toMatch(/FROM node:22-bookworm-slim AS runtime-base/)
    expect(dockerfile).toMatch(/FROM runtime-base AS api/)
    expect(dockerfile).toMatch(/FROM runtime-base AS worker/)
    expect(dockerfile).toMatch(/useradd --system --uid 10001/)
    expect(dockerfile).toMatch(/^USER cvg$/m)
    expect(dockerfile).not.toMatch(/^USER root$/m)
  })

  it('starts the real worker entrypoint with the preflight module present', () => {
    expect(dockerfile).toMatch(
      /CMD \["\.\/node_modules\/\.bin\/tsx", "apps\/worker\/src\/main\.ts"\]/
    )
    expect(dockerfile).toMatch(
      /COPY --chown=cvg:cvg scripts\/lib\/production-preflight-core\.mjs/
    )
    expect(dockerfile).toMatch(/STOPSIGNAL SIGTERM/)
  })

  it('probes worker readiness by file and never publishes a port by default', () => {
    expect(dockerfile).toMatch(
      /CVG_WORKER_READINESS_FILE=\/tmp\/cvg-worker-ready/
    )
    expect(dockerfile).toMatch(
      /HEALTHCHECK[\s\S]*grep -q '"status":"ready"' \/tmp\/cvg-worker-ready/
    )
    const workerStart = dockerfile.indexOf('FROM runtime-base AS worker')
    const nextStage = dockerfile.indexOf('\nFROM ', workerStart + 1)
    const workerStage = dockerfile.slice(
      workerStart,
      nextStage === -1 ? undefined : nextStage
    )
    expect(workerStage).not.toMatch(/^\s*EXPOSE/m)
    expect(workerStage).not.toMatch(/^\s*ENV CVG_WORKER_HEALTH_PORT=/m)
  })

  it('keeps tests, dev scripts and secrets out of the build context', () => {
    expect(dockerignore).toMatch(/^\*\*\/__tests__$/m)
    expect(dockerignore).toMatch(/^tests$/m)
    expect(dockerignore).toMatch(/^\*\.pem$/m)
    expect(dockerignore).toMatch(/^\*\*\/secrets\/\*\*$/m)
    expect(dockerignore).toMatch(/^\.env$/m)
  })
})
