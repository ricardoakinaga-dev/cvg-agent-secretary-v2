#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const MODEL_SCHEMA_VERSION = 1
const SYNTHETIC_DATA_ORIGIN = 'synthetic'
const { Client } = pg

function fail(field, message) {
  throw new TypeError(`${field}: ${message}`)
}

function finiteNumber(value, field, { min = -Infinity, max = Infinity } = {}) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    fail(field, `must be a finite number between ${min} and ${max}`)
  }
  return value
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(field, 'must be a positive safe integer')
  }
  return value
}

function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(field, 'must be a non-negative safe integer')
  }
  return value
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000
}

function validateVolume(volume, index) {
  if (volume === null || typeof volume !== 'object') {
    fail(`volumes[${index}]`, 'must be an object')
  }
  if (typeof volume.id !== 'string' || volume.id.trim() === '') {
    fail(`volumes[${index}].id`, 'must be a non-empty string')
  }

  const inboundRowsPerDay = finiteNumber(
    volume.inboundRowsPerDay,
    `volumes[${index}].inboundRowsPerDay`,
    { min: 0 }
  )
  const eligibleRate = finiteNumber(
    volume.eligibleRate,
    `volumes[${index}].eligibleRate`,
    { min: 0, max: 1 }
  )
  const measuredTombstoneRows = positiveInteger(
    volume.measuredTombstoneRows,
    `volumes[${index}].measuredTombstoneRows`
  )
  const p50RowBytes = nonNegativeInteger(
    volume.p50RowBytes,
    `volumes[${index}].p50RowBytes`
  )
  const p95RowBytes = nonNegativeInteger(
    volume.p95RowBytes,
    `volumes[${index}].p95RowBytes`
  )
  if (p95RowBytes < p50RowBytes) {
    fail(
      `volumes[${index}].p95RowBytes`,
      'must be greater than or equal to p50RowBytes'
    )
  }
  const measuredIndexBytes = nonNegativeInteger(
    volume.measuredIndexBytes,
    `volumes[${index}].measuredIndexBytes`
  )

  const rowsTombstonedPerDay = round(inboundRowsPerDay * eligibleRate)
  const bytesIndexPerRow = round(measuredIndexBytes / measuredTombstoneRows)
  const dailyGrowthBytesP50 = round(
    rowsTombstonedPerDay * (p50RowBytes + bytesIndexPerRow)
  )
  const dailyGrowthBytesP95 = round(
    rowsTombstonedPerDay * (p95RowBytes + bytesIndexPerRow)
  )

  return {
    id: volume.id,
    inboundRowsPerDay,
    eligibleRate,
    measuredTombstoneRows,
    p50RowBytes,
    p95RowBytes,
    measuredIndexBytes,
    rowsTombstonedPerDay,
    bytesIndexPerRow,
    dailyGrowthBytesP50,
    dailyGrowthBytesP95,
    projectedBytesP50: round(
      dailyGrowthBytesP50 * volume.__horizonDays * volume.__safetyFactor
    ),
    projectedBytesP95: round(
      dailyGrowthBytesP95 * volume.__horizonDays * volume.__safetyFactor
    )
  }
}

export function buildCapacityModel(input) {
  if (input === null || typeof input !== 'object') {
    fail('input', 'must be an object')
  }
  if (input.schemaVersion !== MODEL_SCHEMA_VERSION) {
    fail('schemaVersion', `must be ${MODEL_SCHEMA_VERSION}`)
  }
  if (input.dataOrigin !== SYNTHETIC_DATA_ORIGIN) {
    fail('dataOrigin', `must be ${SYNTHETIC_DATA_ORIGIN}`)
  }
  if (typeof input.policyVersion !== 'string' || input.policyVersion === '') {
    fail('policyVersion', 'must be an explicit non-empty string')
  }
  const horizonDays = positiveInteger(input.horizonDays, 'horizonDays')
  const safetyFactor = finiteNumber(input.safetyFactor, 'safetyFactor', {
    min: 1
  })
  if (!Array.isArray(input.volumes) || input.volumes.length === 0) {
    fail('volumes', 'must be a non-empty array')
  }

  const volumes = input.volumes.map((volume, index) =>
    validateVolume(
      { ...volume, __horizonDays: horizonDays, __safetyFactor: safetyFactor },
      index
    )
  )

  return {
    schemaVersion: MODEL_SCHEMA_VERSION,
    kind: 'aud20-16-capacity-model',
    dataOrigin: input.dataOrigin,
    policyVersion: input.policyVersion,
    horizonDays,
    safetyFactor,
    volumes
  }
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`
}

function localDisposablePostgresUrl(connectionString) {
  if (typeof connectionString !== 'string' || connectionString.trim() === '') {
    fail(
      'postgresUrl',
      'must be a non-empty local disposable connection string'
    )
  }

  let parsed
  try {
    parsed = new URL(connectionString)
  } catch {
    fail('postgresUrl', 'must be a valid local disposable connection string')
  }

  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    fail('postgresUrl', 'must target a local disposable PostgreSQL host')
  }

  return parsed.toString()
}

function syntheticPayloadBytes(value, field) {
  return positiveInteger(value, field)
}

export async function measurePostgresCapacity(input, connectionString) {
  buildCapacityModel(input)
  const postgresUrl = localDisposablePostgresUrl(connectionString)
  const schemaName = `aud20_16_capacity_${process.pid}`
  const client = new Client({ connectionString: postgresUrl })
  const measurements = []

  try {
    await client.connect()
    const server = await client.query(
      "SELECT current_setting('server_version') AS server_version, current_setting('server_version_num') AS server_version_num"
    )
    await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`)

    for (const volume of input.volumes) {
      const tableName = `tombstones_${volume.id.replace(/[^a-zA-Z0-9_]/g, '_')}`
      const qualifiedTable = `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`
      const p50PayloadBytes = syntheticPayloadBytes(
        volume.syntheticPayloadP50Bytes,
        `volumes.${volume.id}.syntheticPayloadP50Bytes`
      )
      const p95PayloadBytes = syntheticPayloadBytes(
        volume.syntheticPayloadP95Bytes,
        `volumes.${volume.id}.syntheticPayloadP95Bytes`
      )
      if (p95PayloadBytes < p50PayloadBytes) {
        fail(
          `volumes.${volume.id}.syntheticPayloadP95Bytes`,
          'must be greater than or equal to syntheticPayloadP50Bytes'
        )
      }

      await client.query(`
        CREATE TABLE ${qualifiedTable} (
          tenant_id text NOT NULL,
          key text NOT NULL,
          tombstone_digest bytea NOT NULL,
          tombstoned_at timestamptz NOT NULL,
          resource_id text,
          created_at timestamptz NOT NULL,
          payload text NOT NULL
        )
      `)
      await client.query(
        `CREATE UNIQUE INDEX ${quoteIdentifier(`${tableName}_identity_idx`)} ON ${qualifiedTable} (tenant_id, key)`
      )
      await client.query(
        `CREATE INDEX ${quoteIdentifier(`${tableName}_tombstoned_at_idx`)} ON ${qualifiedTable} (tombstoned_at)`
      )
      await client.query(
        `
          INSERT INTO ${qualifiedTable}
            (tenant_id, key, tombstone_digest, tombstoned_at, resource_id, created_at, payload)
          SELECT
            $1,
            'synthetic-key-' || g,
            decode(md5(g::text), 'hex'),
            now() - interval '60 days' - (g * interval '1 minute'),
            'synthetic-resource-' || g,
            now() - interval '90 days' - (g * interval '1 minute'),
            repeat('x', CASE WHEN g % 10 = 0 THEN $3::int ELSE $2::int END)
          FROM generate_series(1, $4::int) AS g
        `,
        [
          `synthetic-tenant-${volume.id}`,
          p50PayloadBytes,
          p95PayloadBytes,
          volume.measuredTombstoneRows
        ]
      )

      const rowMetrics = await client.query(
        `
          SELECT
            count(*)::int AS measured_tombstone_rows,
            percentile_disc(0.5) WITHIN GROUP (ORDER BY pg_column_size(t))::int AS p50_row_bytes,
            percentile_disc(0.95) WITHIN GROUP (ORDER BY pg_column_size(t))::int AS p95_row_bytes
          FROM ${qualifiedTable} AS t
        `
      )
      const relationMetrics = await client.query(
        `
          SELECT
            pg_relation_size($1::regclass)::bigint AS relation_bytes,
            pg_indexes_size($1::regclass)::bigint AS index_bytes,
            pg_total_relation_size($1::regclass)::bigint AS total_bytes
        `,
        [`${schemaName}.${tableName}`]
      )
      const sweepStarted = process.hrtime.bigint()
      const sweep = await client.query(
        `SELECT count(*)::int AS swept_rows FROM ${qualifiedTable} WHERE tombstoned_at <= now()`
      )
      const sweepDurationMs =
        Number(process.hrtime.bigint() - sweepStarted) / 1_000_000
      const rows = rowMetrics.rows[0]
      const sizes = relationMetrics.rows[0]

      measurements.push({
        id: volume.id,
        inboundRowsPerDay: volume.inboundRowsPerDay,
        eligibleRate: volume.eligibleRate,
        measuredTombstoneRows: Number(rows.measured_tombstone_rows),
        p50RowBytes: Number(rows.p50_row_bytes),
        p95RowBytes: Number(rows.p95_row_bytes),
        measuredIndexBytes: Number(sizes.index_bytes),
        relationBytes: Number(sizes.relation_bytes),
        indexBytes: Number(sizes.index_bytes),
        totalBytes: Number(sizes.total_bytes),
        sweptRows: Number(sweep.rows[0].swept_rows),
        sweepDurationMs: Math.round(sweepDurationMs * 1_000) / 1_000
      })
    }

    const model = buildCapacityModel({
      ...input,
      volumes: measurements
    })
    return {
      schemaVersion: MODEL_SCHEMA_VERSION,
      kind: 'aud20-16-postgres-capacity-measurement',
      dataOrigin: SYNTHETIC_DATA_ORIGIN,
      policyVersion: input.policyVersion,
      horizonDays: input.horizonDays,
      safetyFactor: input.safetyFactor,
      postgres: {
        serverVersion: server.rows[0].server_version,
        serverVersionNum: server.rows[0].server_version_num,
        disposableHostOnly: true,
        schemaName
      },
      volumes: measurements,
      model
    }
  } finally {
    try {
      if (client._connected) {
        await client.query(
          `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`
        )
      }
    } finally {
      await client.end().catch(() => {})
    }
  }
}

function usage() {
  return [
    'Usage: node scripts/aud20-16-capacity-model.mjs --input <synthetic-json> [--postgres-url <local-disposable-url>]',
    '',
    'The input must explicitly contain schemaVersion, policyVersion,',
    'dataOrigin=synthetic, horizonDays, safetyFactor and a non-empty volumes array.',
    'The PostgreSQL mode only accepts localhost/127.0.0.1/[::1] targets.'
  ].join('\n')
}

function readInput(argv) {
  const inputIndex = argv.indexOf('--input')
  if (argv.includes('--help')) {
    process.stdout.write(`${usage()}\n`)
    return null
  }
  if (inputIndex < 0 || argv[inputIndex + 1] === undefined) {
    throw new Error(usage())
  }
  const inputPath = path.resolve(argv[inputIndex + 1])
  return JSON.parse(fs.readFileSync(inputPath, 'utf8'))
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)

if (isMain) {
  try {
    const argv = process.argv.slice(2)
    const input = readInput(argv)
    if (input !== null) {
      const postgresIndex = argv.indexOf('--postgres-url')
      const report =
        postgresIndex >= 0
          ? await measurePostgresCapacity(input, argv[postgresIndex + 1])
          : buildCapacityModel(input)
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  }
}
