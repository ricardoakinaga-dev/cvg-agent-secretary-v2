import { describe, expect, it } from 'vitest'
import {
  buildCapacityModel,
  measurePostgresCapacity
} from '../scripts/aud20-16-capacity-model.mjs'

const syntheticInput = {
  schemaVersion: 1,
  dataOrigin: 'synthetic',
  policyVersion: 'AUD20-16-LIFECYCLE-v1',
  horizonDays: 30,
  safetyFactor: 1.25,
  volumes: [
    {
      id: 'small',
      inboundRowsPerDay: 1000,
      eligibleRate: 0.02,
      measuredTombstoneRows: 100,
      p50RowBytes: 256,
      p95RowBytes: 384,
      measuredIndexBytes: 4096
    },
    {
      id: 'medium',
      inboundRowsPerDay: 10000,
      eligibleRate: 0.05,
      measuredTombstoneRows: 500,
      p50RowBytes: 384,
      p95RowBytes: 512,
      measuredIndexBytes: 32768
    }
  ]
}

describe('AUD20-16 offline capacity model', () => {
  it('projects measured row and index growth for the approved policy horizon', () => {
    const report = buildCapacityModel(syntheticInput)

    expect(report.schemaVersion).toBe(1)
    expect(report.policyVersion).toBe('AUD20-16-LIFECYCLE-v1')
    expect(report.horizonDays).toBe(30)
    expect(report.safetyFactor).toBe(1.25)
    expect(report.volumes).toHaveLength(2)
    expect(report.volumes[0]).toMatchObject({
      id: 'small',
      rowsTombstonedPerDay: 20,
      bytesIndexPerRow: 40.96,
      dailyGrowthBytesP50: 5939.2,
      dailyGrowthBytesP95: 8499.2,
      projectedBytesP50: 222720,
      projectedBytesP95: 318720
    })
  })

  it('requires an explicit horizon and safety factor', () => {
    expect(() =>
      buildCapacityModel({ ...syntheticInput, horizonDays: undefined })
    ).toThrow('horizonDays')
    expect(() =>
      buildCapacityModel({ ...syntheticInput, safetyFactor: undefined })
    ).toThrow('safetyFactor')
  })

  it('requires an explicit synthetic data origin', () => {
    const withoutDataOrigin = { ...syntheticInput }
    delete withoutDataOrigin.dataOrigin

    expect(() => buildCapacityModel(withoutDataOrigin)).toThrow('dataOrigin')
    expect(() =>
      buildCapacityModel({ ...syntheticInput, dataOrigin: 'real' })
    ).toThrow('dataOrigin')
  })

  it('rejects unsafe measurements instead of coercing them', () => {
    expect(() =>
      buildCapacityModel({
        ...syntheticInput,
        volumes: [{ ...syntheticInput.volumes[0], eligibleRate: 1.1 }]
      })
    ).toThrow('eligibleRate')

    expect(() =>
      buildCapacityModel({
        ...syntheticInput,
        volumes: [{ ...syntheticInput.volumes[0], p95RowBytes: 128 }]
      })
    ).toThrow('p95RowBytes')
  })

  it('rejects non-local PostgreSQL targets before any connection', async () => {
    await expect(
      measurePostgresCapacity(
        syntheticInput,
        'postgres://user:pass@db.example/test'
      )
    ).rejects.toThrow('local disposable')
  })
})
