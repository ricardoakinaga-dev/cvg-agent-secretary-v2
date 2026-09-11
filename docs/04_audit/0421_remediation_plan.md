# 0421 — Remediation Plan

## Parecer vigente — AUD-DOC-001 — 2026-09-05T00:54:31-03:00

Remediação: Priorizar discovery/PRD/SPEC para F01 e F05. Aceites: intenção composta gera handoff sem tool; HTTP direto não pode afirmar HTTPS. Demais capacidades exigem lanes próprias. Nenhum BUILD iniciado.

Fonte atual: [relatório integral](0539_documentation_implementation_review.md), [inventário](0540_documentation_review_inventory.json) e [evidências](0541_documentation_review_evidence.json). Auditoria solicitada concluída; correções futuras ainda abertas.

AUD-F07 (P2) adicional: repositório de approval de atendimento aceita escrita de snapshot obsoleto; consumo único de capability approval não prova CAS nessa fila. Reprodução e limites no relatório 0539; remediação futura por gate próprio.

## Registro histórico anterior a esta auditoria

## R-01 — Executar build faseado

- GAP relacionado: GAP-C01.
- Causa raiz: sistema ainda esta em fase documental.
- Impacto: nao ha runtime para auditar.
- Acao: iniciar Phase 0 somente apos aprovacao humana da SPEC.
- Prioridade: P0.
- Fase sugerida: Build Phase 0.

## R-02 — Formalizar regras de agenda

- GAP relacionado: GAP-C02.
- Causa raiz: confirmacao de consulta depende de politica operacional.
- Impacto: risco de confirmacao indevida.
- Acao: documentar regras de confirmacao, excecoes e approvals.
- Prioridade: P0.
- Fase sugerida: antes de liberar workflow de agendamento.

## R-03 — Definir base RAG institucional

- GAP relacionado: GAP-I01.
- Causa raiz: fonte oficial nao definida.
- Impacto: respostas institucionais podem ficar limitadas.
- Acao: listar documentos autorizados, versao e responsavel por atualizacao.
- Prioridade: P1.
- Fase sugerida: Build Phase 4 ou 6.

## R-04 — Definir politica de retencao

- GAP relacionado: GAP-I02.
- Causa raiz: governanca de dados pendente.
- Impacto: risco de privacidade e auditoria incompleta.
- Acao: definir retencao para mensagens, audit events, tool calls e memory facts.
- Prioridade: P1.
- Fase sugerida: Build Phase 6.

## R-05 — Executar Phase 0 com gates reais

- GAP relacionado: GAP-C03, GAP-M02.
- Causa raiz: projeto ainda esta no estado documental.
- Impacto: sem fundacao testavel, proximas sprints acumulam risco estrutural.
- Acao: executar sprint 0 apenas apos aprovacao humana do escopo; criar monorepo, contratos, testes, lint/typecheck, baseline de secrets e CI local.
- Prioridade: P0.
- Fase sugerida: Build Phase 0.

## R-06 — Validar matriz de cargos hospitalares

- GAP relacionado: GAP-I03.
- Causa raiz: papeis tecnicos ainda nao foram conectados aos cargos reais.
- Impacto: risco de autorizacao incorreta em approval e auditoria.
- Acao: mapear cargos reais para Operator, Approver, Supervisor e Admin antes de liberar painel de approvals.
- Prioridade: P1.
- Fase sugerida: antes de painel de approvals.
