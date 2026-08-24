# 0117 — Backlog Estruturado

## P0 — Critico

### P0-01 — Estrutura monorepo

- Motivacao: suportar apps e packages do blueprint.
- Impacto: base de todo o projeto.
- Risco: baixo.
- Fase sugerida: Fase 0.
- Dependencia: nenhuma.

### P0-02 — Runtime de conversa e sessao

- Motivacao: toda execucao depende de sessao.
- Impacto: alto.
- Risco: medio.
- Fase sugerida: Fase 1.
- Dependencia: shared.

### P0-03 — Auditoria de tool calls e safety

- Motivacao: requisito enterprise e seguranca.
- Impacto: alto.
- Risco: alto.
- Fase sugerida: Fase 1.
- Dependencia: dominio base.

### P0-04 — Policy engine e approval request

- Motivacao: limitar autonomia nivel 1-2.
- Impacto: alto.
- Risco: alto.
- Fase sugerida: Fase 2.
- Dependencia: runtime e audit.

## P1 — Alta prioridade

### P1-01 — Workflow identificacao tutor/pet

- Fase sugerida: Fase 2.
- Dependencia: tools de contato e paciente.

### P1-02 — Workflow triagem inicial

- Fase sugerida: Fase 2.
- Dependencia: policy.

### P1-03 — Handoff summary

- Fase sugerida: Fase 2.
- Dependencia: timeline e session state.

### P1-04 — Painel de approvals

- Fase sugerida: Fase 4.
- Dependencia: API approvals.

## P2 — Medio

### P2-01 — Adapter WhatsApp inicial

- Fase sugerida: Fase 3.
- Dependencia: webhook e message normalization.

### P2-02 — RAG institucional

- Fase sugerida: Fase 3 ou 5.
- Dependencia: base institucional validada.

### P2-03 — Memory facts

- Fase sugerida: Fase 5.
- Dependencia: auditoria e consentimento operacional.

## P3 — Baixo

### P3-01 — Billing Agent futuro

- Fase sugerida: pos-MVP.
- Dependencia: regras financeiras e approvals.

### P3-02 — Medical Context Agent futuro

- Fase sugerida: pos-MVP.
- Dependencia: governanca clinica.
