import { z } from 'zod'

export const CapabilitySchema = z.enum([
  'schedule.read',
  'appointment.create',
  'appointment.modify',
  'appointment.cancel',
  'conversation.read',
  'message.draft',
  'message.send',
  'patient.summary.read',
  'patient.record.read',
  'patient.record.write',
  'exam.read',
  'exam.release',
  'finance.read',
  'finance.write',
  'hospitalization.manage',
  'clinical.diagnose',
  'clinical.prescribe',
  'admin.policy.manage',
  'admin.agent.manage'
])

export type Capability = z.infer<typeof CapabilitySchema>

export const ToolRiskLevelSchema = z.enum([
  'READ_ONLY',
  'LOW_RISK_WRITE',
  'MEDIUM_RISK_WRITE',
  'HIGH_RISK_WRITE',
  'ADMIN'
])

export type ToolRiskLevel = z.infer<typeof ToolRiskLevelSchema>

export const CapabilityCategorySchema = z.enum([
  'schedule',
  'conversation',
  'patient',
  'exam',
  'finance',
  'clinical',
  'hospitalization',
  'admin'
])

export type CapabilityCategory = z.infer<typeof CapabilityCategorySchema>

export interface CapabilityDefinition {
  capability: Capability
  category: CapabilityCategory
  risk: ToolRiskLevel
  description: string
}

export const CAPABILITY_CATALOG: Readonly<
  Record<Capability, CapabilityDefinition>
> = Object.freeze({
  'schedule.read': {
    capability: 'schedule.read',
    category: 'schedule',
    risk: 'READ_ONLY',
    description: 'Read the synthetic/approved schedule'
  },
  'appointment.create': {
    capability: 'appointment.create',
    category: 'schedule',
    risk: 'MEDIUM_RISK_WRITE',
    description: 'Create an appointment draft/confirmation'
  },
  'appointment.modify': {
    capability: 'appointment.modify',
    category: 'schedule',
    risk: 'MEDIUM_RISK_WRITE',
    description: 'Modify an existing appointment'
  },
  'appointment.cancel': {
    capability: 'appointment.cancel',
    category: 'schedule',
    risk: 'HIGH_RISK_WRITE',
    description: 'Cancel an appointment'
  },
  'conversation.read': {
    capability: 'conversation.read',
    category: 'conversation',
    risk: 'READ_ONLY',
    description: 'Read tenant-scoped conversations'
  },
  'message.draft': {
    capability: 'message.draft',
    category: 'conversation',
    risk: 'LOW_RISK_WRITE',
    description: 'Draft an outbound message without sending'
  },
  'message.send': {
    capability: 'message.send',
    category: 'conversation',
    risk: 'MEDIUM_RISK_WRITE',
    description: 'Send an outbound message through the channel gateway'
  },
  'patient.summary.read': {
    capability: 'patient.summary.read',
    category: 'patient',
    risk: 'READ_ONLY',
    description: 'Read a minimized patient summary'
  },
  'patient.record.read': {
    capability: 'patient.record.read',
    category: 'patient',
    risk: 'READ_ONLY',
    description: 'Read the patient record'
  },
  'patient.record.write': {
    capability: 'patient.record.write',
    category: 'patient',
    risk: 'HIGH_RISK_WRITE',
    description: 'Write to the patient record'
  },
  'exam.read': {
    capability: 'exam.read',
    category: 'exam',
    risk: 'READ_ONLY',
    description: 'Read exam metadata'
  },
  'exam.release': {
    capability: 'exam.release',
    category: 'exam',
    risk: 'HIGH_RISK_WRITE',
    description: 'Release an exam result'
  },
  'finance.read': {
    capability: 'finance.read',
    category: 'finance',
    risk: 'READ_ONLY',
    description: 'Read financial data'
  },
  'finance.write': {
    capability: 'finance.write',
    category: 'finance',
    risk: 'HIGH_RISK_WRITE',
    description: 'Perform a financial operation'
  },
  'hospitalization.manage': {
    capability: 'hospitalization.manage',
    category: 'hospitalization',
    risk: 'HIGH_RISK_WRITE',
    description: 'Manage hospitalization workflows'
  },
  'clinical.diagnose': {
    capability: 'clinical.diagnose',
    category: 'clinical',
    risk: 'HIGH_RISK_WRITE',
    description: 'Produce or alter a clinical diagnosis'
  },
  'clinical.prescribe': {
    capability: 'clinical.prescribe',
    category: 'clinical',
    risk: 'HIGH_RISK_WRITE',
    description: 'Prescribe or alter medication'
  },
  'admin.policy.manage': {
    capability: 'admin.policy.manage',
    category: 'admin',
    risk: 'ADMIN',
    description: 'Manage policies and approvals configuration'
  },
  'admin.agent.manage': {
    capability: 'admin.agent.manage',
    category: 'admin',
    risk: 'ADMIN',
    description: 'Deploy or promote agent versions'
  }
})

export function capabilityRisk(capability: Capability): ToolRiskLevel {
  return CAPABILITY_CATALOG[capability].risk
}

export function isHighRiskCapability(capability: Capability): boolean {
  const risk = capabilityRisk(capability)
  return risk === 'HIGH_RISK_WRITE' || risk === 'ADMIN'
}
