import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  checkCurrentNextAction,
  checkJsonFiles,
  checkMarkdownLinks,
  checkOfficialStates,
  runDocumentationCheck
} from '../scripts/docs-check.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('documentation integrity (AUD19-02)', () => {
  it('has zero broken local markdown links under docs/', () => {
    const links = checkMarkdownLinks(root)
    expect(links.checked).toBeGreaterThan(100)
    expect(links.broken).toEqual([])
  })

  it('has zero invalid JSON under docs/ and certification/', () => {
    const json = checkJsonFiles(root)
    expect(json.checked).toBeGreaterThan(100)
    expect(json.invalid).toEqual([])
  })

  it('keeps the current index aligned with the runtime state next action', () => {
    expect(checkCurrentNextAction(root)).toMatchObject({
      valid: true,
      reason: null
    })
  })

  it('uses only official states in the current index', () => {
    expect(checkOfficialStates(root).unexpected).toEqual([])
  })

  it('passes the aggregate documentation checker', () => {
    expect(runDocumentationCheck(root).valid).toBe(true)
  })
})
