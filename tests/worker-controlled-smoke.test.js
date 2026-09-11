import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function runSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(rootDir, 'scripts/worker-controlled-smoke.mjs')],
      { cwd: rootDir, env: { ...process.env } }
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

describe('controlled worker smoke', () => {
  it('proves the configured local composition claims and acknowledges one event', async () => {
    const result = await runSmoke()

    expect(result.code).toBe(0)
    expect(result.output).toContain('worker.controlled_smoke_verified')
    expect(result.output).toContain('"processed":1')
    expect(result.output).not.toContain('stack')
    expect(result.output).not.toContain('cause')
  })
})
