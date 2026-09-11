# 0416 — Data Integrity Audit

## Parecer vigente — AUD-DOC-001 — 2026-09-05T00:54:31-03:00

Integridade: PostgreSQL16 efêmero: 8 arquivos/72 testes PASS, sem skips; RLS, roles, migrations, pinning e concorrência controlados. Backup/restore e migração de dados reais não validados.

Fonte atual: [relatório integral](0539_documentation_implementation_review.md), [inventário](0540_documentation_review_inventory.json) e [evidências](0541_documentation_review_evidence.json). Auditoria solicitada concluída; correções futuras ainda abertas.

AUD-F07 (P2) adicional: repositório de approval de atendimento aceita escrita de snapshot obsoleto; consumo único de capability approval não prova CAS nessa fila. Reprodução e limites no relatório 0539; remediação futura por gate próprio.

## Registro histórico anterior a esta auditoria

## Validacoes

- Toda message pertence a conversation.
- Toda session pertence a conversation.
- Toda tool call pertence a agent run.
- Todo approval pertence a session.
- Todo handoff contem resumo.
- Todo safety event possui correlation id.
- Idempotency keys evitam duplicidade.

## Dados orfaos a procurar

- Message sem conversation.
- AgentRun sem session.
- ToolCall sem agentRun.
- Task sem origem.
- Approval pendente expirado sem status final.

## Dados invalidos a procurar

- Status fora da maquina de estados.
- Decision sem operador.
- ToolCall concluida sem resultado ou erro.
- Handoff sem motivo.

## Status atual

Aguardando banco e dados reais.
