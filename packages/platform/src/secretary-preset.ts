import type { ControlPlaneStore } from './control-plane-store.ts'
import {
  AgentConfigSchema,
  type AgentConfig,
  type AgentRecord
} from './contracts.ts'
import { TenantIdSchema, type TenantId } from './ids.ts'

export const CONTROLLED_SECRETARY_TENANT_ID = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-000000000001'
)

export const CONTROLLED_SECRETARY_SLUG = 'cvg-secretary'

export async function ensureControlledSecretaryPreset(
  store: ControlPlaneStore,
  tenantId: TenantId = CONTROLLED_SECRETARY_TENANT_ID,
  createdBy = 'bootstrap.controlled'
): Promise<AgentRecord> {
  const scope = { tenantId }
  const existing = (await store.listAgents(scope)).find(
    (agent) => agent.slug === CONTROLLED_SECRETARY_SLUG
  )
  if (existing) return existing

  const agent = await store.createAgent(scope, {
    slug: CONTROLLED_SECRETARY_SLUG,
    name: 'CVG Secretary',
    description: 'Preset controlado da secretaria virtual da CVG.'
  })
  const draft = await store.createVersion(
    scope,
    agent.id,
    createControlledSecretaryConfig(),
    createdBy
  )
  const testing = await store.transitionVersion(scope, draft.id, 'TESTING')
  const approved = await store.transitionVersion(scope, testing.id, 'APPROVED')
  await store.publishVersion(scope, approved.id)
  return (await store.getAgent(scope, agent.id)) ?? agent
}

export function createControlledSecretaryConfig(): AgentConfig {
  return AgentConfigSchema.parse({
    persona: {
      name: 'Luna',
      role: 'secretary',
      tone: 'acolhedor e objetivo'
    },
    greeting: 'Olá! Sou a assistente virtual da CVG. Como posso ajudar?',
    promptBlocks: [
      {
        id: 'controlled-secretary-safety',
        kind: 'safety',
        content:
          'Não prescreva, diagnostique, confirme consultas reais ou exponha dados confidenciais.',
        priority: 0,
        enabled: true
      },
      {
        id: 'controlled-secretary-persona',
        kind: 'persona',
        content: 'Atenda com clareza, acolhimento e linguagem simples.',
        priority: 10,
        enabled: true
      }
    ],
    responseTemplates: {
      unknown: 'Pode esclarecer um pouco mais sua solicitação?',
      institutional_question:
        'Não encontrei uma fonte institucional aprovada para responder agora.',
      scheduling: 'Posso consultar horários fictícios no ambiente controlado.'
    },
    model: {
      provider: 'fake',
      model: 'deterministic-v1',
      temperature: 0,
      maxTokens: 512,
      timeoutMs: 3000,
      retries: 0,
      secretRef: 'secret://controlled/fake'
    },
    featureFlags: {
      testLab: true,
      realChannels: false,
      realRag: false,
      realPayments: false,
      realMedicalRecords: false
    },
    policies: {
      version: 'controlled-secretary-v1',
      minConfidence: 0.65,
      lowConfidence: 'clarify',
      maxClarifications: 2,
      enabledActions: ['respond', 'institutional_question', 'scheduling'],
      approvalActions: [],
      blockedActions: [
        'confirm_appointment',
        'cancel_appointment',
        'reschedule_appointment'
      ]
    },
    plugins: [
      {
        plugin: 'scheduling.controlled',
        enabled: true,
        allowedTools: ['find_available_slots'],
        config: {}
      }
    ],
    knowledge: [],
    handoff: {
      lowConfidenceDestination: 'controlled-reception',
      destinations: ['controlled-reception'],
      maxClarifications: 2
    }
  })
}
