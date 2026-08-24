# 0900 - Debug And Corrections Index

## Status

```txt
STATUS: READY_FOR_AGENT_EXECUTION
DATA: 2026-04-29
ESCOPO: fila controlada de debug e correcoes apos auditoria local de CC-S1/CC-S2
MODO: controlled_construction_only
```

## Objetivo

Esta pasta transforma a auditoria local em um pacote executavel de correcao. O agente executor deve ler estes arquivos antes de alterar codigo ou documentacao:

1. `0901_audit_findings.md`
2. `0902_correction_execution_contract.md`
3. `0903_correction_backlog.json`
4. `0904_validation_matrix.json`
5. `implementation_order.md`
6. `acceptance_tests.md`
7. `tasks/task_*.md`
8. `0905_agent_handoff_prompt.md`

## Resultado esperado

Ao concluir esta fila, o projeto deve sair de `CONTROLLED_CONSTRUCTION_ACTIVE_WITH_AUDIT_GAPS` para `CONTROLLED_CONSTRUCTION_ACTIVE_VALIDATED`, sem liberar producao irrestrita, dados reais, canais reais, RAG real ou automacoes sensiveis.

## Escopo fechado

- Sincronizar documentacao de evidencia com o estado real dos gates.
- Corrigir rastreabilidade que aponta para testes inexistentes.
- Remover dependencia de IDs fixos no console web por meio de listagem real de conversas.
- Endurecer idempotencia PostgreSQL para `channel + externalMessageId`.
- Incluir formatacao como gate obrigatorio.
- Reexecutar validacao local, PostgreSQL efemero, E2E, security audit, readiness e verify.

## Fora de escopo

- Usar dados reais.
- Conectar WhatsApp real.
- Conectar agenda real.
- Liberar RAG institucional real.
- Confirmar, cancelar ou reagendar consulta real automaticamente.
- Executar acao clinica, financeira ou prontuario definitivo.
- Remover aprovacao humana de qualquer acao sensivel.

## Mapa dos artefatos

| Arquivo                                           | Uso                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `0901_audit_findings.md`                          | Evidencia auditada e gaps que precisam correcao.                                                                  |
| `0902_correction_execution_contract.md`           | Regras obrigatorias de execucao, bloqueio e DoD.                                                                  |
| `0903_correction_backlog.json`                    | Backlog machine-readable das correcoes.                                                                           |
| `0904_validation_matrix.json`                     | Gates obrigatorios por correcao.                                                                                  |
| `implementation_order.md`                         | Ordem deterministica de execucao.                                                                                 |
| `acceptance_tests.md`                             | Testes e comandos obrigatorios de aceite.                                                                         |
| `tasks/task_01_evidence_and_readiness_sync.md`    | Corrigir evidencia inflada/desatualizada.                                                                         |
| `tasks/task_02_traceability_test_alignment.md`    | Corrigir matriz e testes inexistentes.                                                                            |
| `tasks/task_03_web_conversation_listing.md`       | Implementar listagem real de conversas no API/web.                                                                |
| `tasks/task_04_postgres_idempotency_hardening.md` | Endurecer idempotencia PostgreSQL.                                                                                |
| `tasks/task_05_format_gate_and_ci_verify.md`      | Incluir formatacao no gate e corrigir estilo.                                                                     |
| `tasks/task_06_final_validation_and_evidence.md`  | Coletar evidencia final e atualizar runtime docs.                                                                 |
| `0905_agent_handoff_prompt.md`                    | Prompt pronto para iniciar a execucao das correcoes.                                                              |
| `0906_cc_s6_rbac_panel_read_audit.md`             | Auditoria e correcao CC-S6 para RBAC fail-closed em reads operacionais.                                           |
| `0907_cc_s7_audit_evidence_review.md`             | Auditoria CC-S7 de audit evidence, com correcao de resumo e debitos de payload/filtros/indices.                   |
| `0908_cc_s8_console_evidence_review_audit.md`     | Auditoria CC-S8 do console de evidencia, com correcao de RBAC test coverage e debitos de paginacao.               |
| `0909_cc_s9_audit_governance_review.md`           | Auditoria CC-S9 de governanca de audit evidence, com reforco de redacao e fechamento de filtros/indices.          |
| `0910_cc_s10_evidence_pagination_export_audit.md` | Auditoria CC-S10 de paginacao e export approval, com correcao de identidade obrigatoria no pedido de export.      |
| `0911_cc_s11_release_candidate_boundary_audit.md` | Auditoria CC-S11/CC-S12 boundary, com correcao dos artefatos documentais exigidos pelo gate de release candidate. |
