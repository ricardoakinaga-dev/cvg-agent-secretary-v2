import { z } from 'zod'

const EnvBooleanSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .default(false)
  .transform((value) => value === true || value === 'true')

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_PERSISTENCE_MODE: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_MIGRATION_URL: z.string().url().optional(),
  INBOUND_TENANT_ID: z.string().optional(),
  INBOUND_AGENT_ID: z.string().optional(),
  WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
  POSTGRES_AUTO_MIGRATE: EnvBooleanSchema,
  POSTGRES_RLS_ENFORCEMENT: EnvBooleanSchema,
  POSTGRES_SCHEMA: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,62}$/)
    .optional(),
  OPENAI_API_KEY: z.string().min(1).default('replace_me'),
  ENABLE_REAL_CHANNELS: EnvBooleanSchema,
  ENABLE_REAL_RAG: EnvBooleanSchema,
  ENABLE_REAL_PAYMENTS: EnvBooleanSchema,
  ENABLE_REAL_MEDICAL_RECORDS: EnvBooleanSchema
})

export type AppEnv = z.infer<typeof EnvSchema>

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  const env = EnvSchema.parse(input)
  if (
    env.NODE_ENV === 'production' &&
    (env.OPENAI_API_KEY === 'replace_me' || env.OPENAI_API_KEY.trim() === '')
  ) {
    throw new Error('A production provider secret must be configured')
  }
  if (env.NODE_ENV === 'production') {
    const webhookSecret = env.WEBHOOK_SIGNING_SECRET?.trim() ?? ''
    if (
      webhookSecret.length < 32 ||
      /replace[_-]?me|change[_-]?me|example/i.test(webhookSecret)
    ) {
      throw new Error(
        'A production webhook signing secret of at least 32 characters must be configured'
      )
    }
  }
  if (env.NODE_ENV === 'production' && !env.POSTGRES_RLS_ENFORCEMENT) {
    throw new Error(
      'Production requires tenant-scoped PostgreSQL RLS enforcement'
    )
  }
  if (
    env.NODE_ENV === 'production' &&
    !/^tenant_[0-9a-f-]{36}$/.test(env.INBOUND_TENANT_ID?.trim() ?? '')
  ) {
    throw new Error(
      'A trusted INBOUND_TENANT_ID is required by the production bootstrap'
    )
  }
  if (
    env.NODE_ENV === 'production' &&
    !/^agent_[0-9a-f-]{36}$/.test(env.INBOUND_AGENT_ID?.trim() ?? '')
  ) {
    throw new Error(
      'A trusted INBOUND_AGENT_ID is required by the production bootstrap'
    )
  }
  return env
}

export function realWorldActionsDisabled(env: AppEnv): boolean {
  return (
    !env.ENABLE_REAL_CHANNELS &&
    !env.ENABLE_REAL_RAG &&
    !env.ENABLE_REAL_PAYMENTS &&
    !env.ENABLE_REAL_MEDICAL_RECORDS
  )
}
