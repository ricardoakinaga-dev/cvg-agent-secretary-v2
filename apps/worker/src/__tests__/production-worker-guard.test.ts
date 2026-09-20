import { describe, expect, it } from 'vitest'
import {
  assertProductionWorkerConfiguration,
  getProductionWorkerConfigurationFailure
} from '../production-worker-guard.ts'
import { getWorkerStartupFailure } from '../worker.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000172'
const runtimeUrl = 'postgres://runtime:synthetic@127.0.0.1:5434/cvg_test'
const migrationUrl = 'postgres://migration:synthetic@127.0.0.1:5434/cvg_test'

function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    CVG_WORKER_QUEUE_ADAPTER: 'postgres',
    CVG_WORKER_RUN_MODE: 'continuous',
    CVG_WORKER_RUNTIME: 'kernel',
    CVG_DURABLE_KERNEL_ORCHESTRATOR: 'true',
    DATABASE_URL: runtimeUrl,
    DATABASE_MIGRATION_URL: migrationUrl,
    POSTGRES_RLS_ENFORCEMENT: 'true',
    POSTGRES_AUTO_MIGRATE: 'false',
    CVG_WORKER_CONTROLLED_MODE: 'true',
    CVG_WORKER_TENANT_ID: tenantId,
    ...overrides
  }
}

describe('production worker guard', () => {
  it('ignores non-production environments', () => {
    expect(
      getProductionWorkerConfigurationFailure({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://fixture.invalid/cvg'
      })
    ).toBeNull()
    expect(getProductionWorkerConfigurationFailure({})).toBeNull()
  })

  it('accepts the complete durable-kernel production profile', () => {
    expect(getProductionWorkerConfigurationFailure(productionEnv())).toBeNull()
    expect(() =>
      assertProductionWorkerConfiguration(productionEnv())
    ).not.toThrow()
  })

  it('refuses a non-PostgreSQL adapter in production', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_WORKER_QUEUE_ADAPTER: 'controlled-memory' })
      )
    ).toMatchObject({ code: 'production_postgres_adapter_required' })
  })

  it('requires the durable governed kernel', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_WORKER_RUNTIME: 'published-agent' })
      )
    ).toMatchObject({ code: 'production_durable_kernel_required' })
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_DURABLE_KERNEL_ORCHESTRATOR: 'false' })
      )
    ).toMatchObject({ code: 'production_durable_kernel_required' })
  })

  it('requires the supervised continuous run mode', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_WORKER_RUN_MODE: undefined })
      )
    ).toMatchObject({ code: 'production_continuous_run_mode_required' })
  })

  it('requires a PostgreSQL runtime URL', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ DATABASE_URL: 'mysql://fixture.invalid/cvg' })
      )
    ).toMatchObject({ code: 'production_database_url_required' })
  })

  it('requires a distinct migration role endpoint', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ DATABASE_MIGRATION_URL: runtimeUrl })
      )
    ).toMatchObject({ code: 'production_migration_role_required' })
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ DATABASE_MIGRATION_URL: undefined })
      )
    ).toMatchObject({ code: 'production_migration_role_required' })
  })

  it('requires RLS, no auto-migrate and explicit controlled mode', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ POSTGRES_RLS_ENFORCEMENT: 'false' })
      )
    ).toMatchObject({ code: 'production_rls_required' })
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ POSTGRES_AUTO_MIGRATE: 'true' })
      )
    ).toMatchObject({ code: 'production_auto_migrate_forbidden' })
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_WORKER_CONTROLLED_MODE: 'false' })
      )
    ).toMatchObject({ code: 'production_controlled_mode_required' })
  })

  it('requires a valid worker tenant', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_WORKER_TENANT_ID: 'tenant_not-a-uuid' })
      )
    ).toMatchObject({ code: 'production_tenant_required' })
  })

  it('refuses unrestricted real effects', () => {
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_REAL_EFFECTS: 'true' })
      )
    ).toMatchObject({ code: 'production_real_effects_forbidden' })
    expect(
      getProductionWorkerConfigurationFailure(
        productionEnv({ CVG_ALLOW_REAL_EFFECTS: 'true' })
      )
    ).toMatchObject({ code: 'production_real_effects_forbidden' })
  })

  it('surfaces the guard through the worker startup check', () => {
    expect(getWorkerStartupFailure(productionEnv())).toBeNull()
    expect(
      getWorkerStartupFailure(
        productionEnv({ CVG_DURABLE_KERNEL_ORCHESTRATOR: undefined })
      )
    ).toMatchObject({ code: 'production_durable_kernel_required' })
  })
})
