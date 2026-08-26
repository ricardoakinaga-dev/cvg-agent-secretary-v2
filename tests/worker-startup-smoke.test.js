import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function runSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(rootDir, 'scripts/worker-startup-smoke.mjs')],
      {
        cwd: rootDir,
        env: { ...process.env, CVG_WORKER_QUEUE_ADAPTER: '' }
      }
    )
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      output += String(chunk)
    })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code, output }))
  })
}

describe('worker startup smoke', () => {
  it('proves the real entrypoint fails closed without a queue adapter', async () => {
    const result = await runSmoke()

    expect(result.code).toBe(0)
    expect(result.output).toContain('worker.startup_smoke_passed')
    expect(result.output).not.toContain('sess_bootstrap')
    expect(result.output).not.toContain('msg_bootstrap')
    expect(result.output).not.toContain('stack')
    expect(result.output).not.toContain('cause')
  })
})
