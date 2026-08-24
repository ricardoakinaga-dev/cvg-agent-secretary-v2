import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'))
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath))
}

describe('repository target structure', () => {
  it('materializes every file required by the target repository contract', () => {
    const target = readJson(
      'docs/03_build/0305_repository_target_structure.json'
    )
    const requiredFiles = [
      ...target.root_files,
      ...Object.values(target.apps).flatMap((app) =>
        app.required_files.map(
          (file) =>
            `${Object.keys(target.apps).find((key) => target.apps[key] === app)}/${file}`
        )
      ),
      ...Object.values(target.packages).flatMap((pkg) =>
        pkg.required_files.map(
          (file) =>
            `${Object.keys(target.packages).find((key) => target.packages[key] === pkg)}/${file}`
        )
      )
    ]

    for (const relativePath of requiredFiles) {
      expect(exists(relativePath), `${relativePath} must exist`).toBe(true)
    }
  })

  it('keeps workspace package dependencies inside allowed boundaries', () => {
    const target = readJson(
      'docs/03_build/0305_repository_target_structure.json'
    )
    const workspaceTargets = { ...target.apps, ...target.packages }

    for (const [workspacePath, contract] of Object.entries(workspaceTargets)) {
      const packageJson = readJson(`${workspacePath}/package.json`)
      const deps = Object.keys(packageJson.dependencies ?? {})
      for (const dep of deps) {
        expect(
          contract.allowed_dependencies ?? deps,
          `${workspacePath} dependency ${dep} must be allowed`
        ).toContain(dep)
      }
    }
  })
})
