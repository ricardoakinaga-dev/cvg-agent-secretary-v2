import { TenantIdSchema } from '@cvg/platform'
import { CONTINUOUS_WORKER_RUN_MODE } from './continuous-worker.ts'
import {
  DURABLE_KERNEL_ORCHESTRATOR_ENV,
  KERNEL_WORKER_RUNTIME,
  WORKER_RUNTIME_ENV
} from './kernel-composition.ts'

/**
 * Explicit, testable production guard for the supervised worker.
 *
 * The previous contract refused `NODE_ENV=production` unconditionally, which
 * made a productive vertical impossible even after the external gates. The
 * guard replaces that impossibility with the configuration the production
 * bootstrap preflight already requires (durable kernel, PostgreSQL runtime and
 * a distinct migration role, RLS, no auto-migrate, real effects disabled and a
 * supervised continuous run mode) plus the worker-specific fail-closed checks.
 *
 * The guard is defense in depth: `assertProductionBootstrap` in the worker
 * entrypoint still runs the signed/versioned production preflight, so a
 * production worker only starts when BOTH the static guard and the external
 * attestation preflight pass. Incomplete configuration is refused by code.
 */
export type ProductionWorkerGuardCode =
  | 'production_postgres_adapter_required'
  | 'production_durable_kernel_required'
  | 'production_continuous_run_mode_required'
  | 'production_database_url_required'
  | 'production_migration_role_required'
  | 'production_rls_required'
  | 'production_auto_migrate_forbidden'
  | 'production_controlled_mode_required'
  | 'production_tenant_required'
  | 'production_real_effects_forbidden'

export interface ProductionWorkerGuardFailure {
  code: ProductionWorkerGuardCode
  message: string
}

export class ProductionWorkerConfigurationError extends Error {
  readonly code: ProductionWorkerGuardCode

  constructor(code: ProductionWorkerGuardCode, message: string) {
    super(message)
    this.name = 'ProductionWorkerConfigurationError'
    this.code = code
  }
}

const PRODUCTION_POSTGRES_ADAPTERS = ['postgres', 'postgres-controlled']

function value(env: NodeJS.ProcessEnv, key: string): string {
  return env[key]?.trim() ?? ''
}

function isTrue(env: NodeJS.ProcessEnv, key: string): boolean {
  return value(env, key).toLowerCase() === 'true'
}

function isPostgresUrl(env: NodeJS.ProcessEnv, key: string): boolean {
  const raw = value(env, key)
  if (!raw) return false
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:'
  } catch {
    return false
  }
}

/**
 * Returns the first production configuration failure, or `null` when the
 * environment is not production or the full durable-worker profile is present.
 * The order is deterministic so startup logs and negative tests are stable.
 */
export function getProductionWorkerConfigurationFailure(
  env: NodeJS.ProcessEnv = process.env
): ProductionWorkerGuardFailure | null {
  if (value(env, 'NODE_ENV') !== 'production') return null

  if (
    !PRODUCTION_POSTGRES_ADAPTERS.includes(
      value(env, 'CVG_WORKER_QUEUE_ADAPTER')
    )
  ) {
    return {
      code: 'production_postgres_adapter_required',
      message:
        'Production worker requires the PostgreSQL durable outbox adapter'
    }
  }

  const runtime = value(env, WORKER_RUNTIME_ENV)
  if (
    runtime !== KERNEL_WORKER_RUNTIME ||
    !isTrue(env, DURABLE_KERNEL_ORCHESTRATOR_ENV)
  ) {
    return {
      code: 'production_durable_kernel_required',
      message: `Production worker requires ${WORKER_RUNTIME_ENV}=${KERNEL_WORKER_RUNTIME} and ${DURABLE_KERNEL_ORCHESTRATOR_ENV}=true; inline/published-agent execution is forbidden`
    }
  }

  if (value(env, 'CVG_WORKER_RUN_MODE') !== CONTINUOUS_WORKER_RUN_MODE) {
    return {
      code: 'production_continuous_run_mode_required',
      message:
        'Production worker requires CVG_WORKER_RUN_MODE=continuous (supervised consume with graceful drain)'
    }
  }

  const databaseUrl = value(env, 'DATABASE_URL')
  if (!isPostgresUrl(env, 'DATABASE_URL')) {
    return {
      code: 'production_database_url_required',
      message: 'Production worker requires a PostgreSQL DATABASE_URL'
    }
  }

  const migrationUrl = value(env, 'DATABASE_MIGRATION_URL')
  if (
    !isPostgresUrl(env, 'DATABASE_MIGRATION_URL') ||
    migrationUrl === databaseUrl
  ) {
    return {
      code: 'production_migration_role_required',
      message:
        'Production worker requires a distinct DATABASE_MIGRATION_URL for the migration role'
    }
  }

  if (!isTrue(env, 'POSTGRES_RLS_ENFORCEMENT')) {
    return {
      code: 'production_rls_required',
      message: 'Production worker requires POSTGRES_RLS_ENFORCEMENT=true'
    }
  }

  if (value(env, 'POSTGRES_AUTO_MIGRATE') !== 'false') {
    return {
      code: 'production_auto_migrate_forbidden',
      message: 'Production worker requires POSTGRES_AUTO_MIGRATE=false'
    }
  }

  if (!isTrue(env, 'CVG_WORKER_CONTROLLED_MODE')) {
    return {
      code: 'production_controlled_mode_required',
      message:
        'Production worker requires explicit CVG_WORKER_CONTROLLED_MODE=true'
    }
  }

  if (!TenantIdSchema.safeParse(env.CVG_WORKER_TENANT_ID).success) {
    return {
      code: 'production_tenant_required',
      message: 'Production worker requires a valid CVG_WORKER_TENANT_ID'
    }
  }

  if (
    isTrue(env, 'CVG_REAL_EFFECTS') ||
    isTrue(env, 'CVG_ALLOW_REAL_EFFECTS')
  ) {
    return {
      code: 'production_real_effects_forbidden',
      message:
        'Production worker refuses unrestricted real effects (CVG_REAL_EFFECTS/CVG_ALLOW_REAL_EFFECTS)'
    }
  }

  return null
}

export function assertProductionWorkerConfiguration(
  env: NodeJS.ProcessEnv = process.env
): void {
  const failure = getProductionWorkerConfigurationFailure(env)
  if (failure) {
    throw new ProductionWorkerConfigurationError(failure.code, failure.message)
  }
}
