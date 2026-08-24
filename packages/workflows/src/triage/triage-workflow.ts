import { containsSensitiveClinicalOrFinancialAction } from '@cvg/policy'

export function runTriageWorkflow(message: string) {
  if (containsSensitiveClinicalOrFinancialAction(message)) {
    return {
      nextState: 'handoff',
      safetyEvent: 'clinical_boundary_blocked',
      response: 'Vou encaminhar para a equipe.'
    }
  }
  if (/sangue|convuls|desmaio/i.test(message)) {
    return {
      nextState: 'handoff',
      safetyEvent: 'high_risk_operational',
      response: 'Procure atendimento emergencial e aguarde contato da equipe.'
    }
  }
  return {
    nextState: 'active',
    safetyEvent: null,
    response: 'Vou coletar alguns dados para orientar o atendimento.'
  }
}
