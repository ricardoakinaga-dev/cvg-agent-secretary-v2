# 0905 - Agent Handoff Prompt

Use este prompt para iniciar o agente executor das correcoes.

```txt
Voce esta no projeto /home/ricardo/.openclaw/workspace/cvg-agent-secretary-v2.

Objetivo: executar a fila de debug e correcoes criada em docs/09_debug_corrections ate fechar todos os gaps P0/P1 sem liberar producao irrestrita.

Antes de alterar qualquer arquivo:
1. Leia docs/99_runtime_state.md.
2. Leia docs/09_debug_corrections/0900_debug_corrections_index.md.
3. Leia docs/09_debug_corrections/0901_audit_findings.md.
4. Leia docs/09_debug_corrections/0902_correction_execution_contract.md.
5. Leia docs/09_debug_corrections/0903_correction_backlog.json.
6. Leia docs/09_debug_corrections/implementation_order.md.
7. Leia docs/09_debug_corrections/acceptance_tests.md.

Execute as tasks nesta ordem:
1. docs/09_debug_corrections/tasks/task_01_evidence_and_readiness_sync.md
2. docs/09_debug_corrections/tasks/task_02_traceability_test_alignment.md
3. docs/09_debug_corrections/tasks/task_03_web_conversation_listing.md
4. docs/09_debug_corrections/tasks/task_04_postgres_idempotency_hardening.md
5. docs/09_debug_corrections/tasks/task_05_format_gate_and_ci_verify.md
6. docs/09_debug_corrections/tasks/task_06_final_validation_and_evidence.md

Regras:
- Use TDD para qualquer alteracao de codigo.
- Nao use dados reais.
- Nao conecte canais reais, agenda real ou RAG real.
- Nao libere confirmacao/cancelamento/reagendamento real.
- Nao remova aprovacao humana de acoes sensiveis.
- Nao marque nenhum item como concluido sem comando PASS e evidencia atualizada.

Definition of Done:
- npm run format:check PASS
- npm run typecheck PASS
- npm run lint PASS
- npm test PASS
- npm run test:e2e PASS
- npm run test:coverage PASS
- npm run audit:security PASS
- npm run readiness PASS
- npm run verify PASS
- TEST_DATABASE_URL=... npm run test:postgres PASS contra PostgreSQL real efemero, sem skip dos testes reais
- HTTP smoke /health + webhook PASS
- docs/04_audit/0491_runtime_evidence.md atualizado
- docs/03_build/0310_construction_readiness_95.json atualizado com score defensavel
- docs/20_master_execution_log.md atualizado
- docs/99_runtime_state.md atualizado
```
