import { Client } from 'pg'
import { baselineLegacyPostgresMigration } from '@cvg/persistence'

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_MIGRATION_URL
  const actor = process.env.BASELINE_APPROVED_BY
  const reference = process.env.BASELINE_APPROVAL_REF
  if (!connectionString) {
    throw new Error(
      'DATABASE_MIGRATION_URL is required for the explicit legacy baseline'
    )
  }
  if (!actor || !reference) {
    throw new Error(
      'BASELINE_APPROVED_BY and BASELINE_APPROVAL_REF are required'
    )
  }

  const client = new Client({ connectionString })
  await client.connect()
  try {
    await baselineLegacyPostgresMigration(client, {
      ...(process.env.POSTGRES_SCHEMA
        ? { schemaName: process.env.POSTGRES_SCHEMA, createSchema: false }
        : {}),
      approval: { actor, reference }
    })
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Legacy baseline failed'
  )
  process.exitCode = 1
})
