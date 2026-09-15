# AAA-21 — evidência do BUILD de orquestração — 2026-09-15

## Identidade

- Commits do incremento: `bf1c17b` — `feat(orchestrator): add durable goal plan execution`; `6d91b31` — `feat(orchestrator): resume governed inbound goals`; `b02a493` — `feat(orchestrator): bind durable goals to inbound identity`.
- Escopo: runtime durável local, PostgreSQL descartável e worker governado em fixture sintética.
- Dados/efeitos: nenhum dado real e nenhum efeito externo.
- Estado: evidência de BUILD; a certificação candidate-bound do candidato atual ainda não foi executada.

## Implementação observada

| Área | Artefato | Resultado |
| --- | --- | --- |
| Goal/Plan/Step | `packages/agent-runtime/src/orchestration.ts` | estados, DAG, orçamento, O-E-R, replan, leases e fencing |
| Testes de memória | `packages/agent-runtime/src/__tests__/orchestration.test.ts` | 10 testes PASS |
| Estado PostgreSQL | `packages/persistence/migrations/0019_orchestrator_state.sql` | tabelas, FK, RLS, índices, leases e orçamento |
| Store PostgreSQL | `packages/persistence/src/orchestrator-postgres.ts` | CAS, ativação/replan, claim, settle, recovery e ledgers |
| Worker governado | `apps/worker/src/kernel-composition.ts` | `runDurableGoal()` chama o kernel e não executa efeito direto |
| Integração worker | `apps/worker/src/__tests__/kernel-durable-orchestrator-postgres.test.ts` | approval pendente durável e restart sem duplicação |
| Inbound opt-in | `CVG_DURABLE_KERNEL_ORCHESTRATOR=true` + `apps/worker/src/__tests__/kernel-composition-state.test.ts` | flag explícita, aprovação e retorno pelo orquestrador |
| Vertical HTTP | `apps/worker/src/__tests__/kernel-composition-postgres.integration.test.ts` | API → outbox → worker durável → approval decision → continuation, mesmo Goal e um efeito controlado |

## Comandos e resultado

```text
npx vitest run --no-file-parallelism --maxWorkers=1 packages/agent-runtime/src/__tests__/orchestration.test.ts
10 passed

TEST_DATABASE_URL=postgres://postgres@127.0.0.1:<porta>/postgres npm run test:postgres
23 files passed; 197 tests passed

npm test
247 files passed; 1,735 tests passed; 114 conditional skips

npx tsc -p tsconfig.typecheck.json --noEmit
exit 0

npm run lint
exit 0

npx prettier --check <arquivos do incremento e evidências>
exit 0
```

## Auditoria do resultado

PASS local: persistência de Goal/Plan/Step/Attempt/Observation/Evaluation; controle de tenant; versão otimista; claim com token de fencing; rejeição de settle após lease expirado; recuperação de lease; orçamento; loop guard; evidência para conclusão; aprovação pendente sem efeito; aprovação concedida com execução única; identidade inbound única por tenant; flag inbound opt-in; vertical HTTP → outbox → worker durável → continuation.

PARCIAL: o inbound público ainda não está ligado por padrão ao orquestrador; lineage entre goal/plan/step e todos os journals existentes ainda não tem campos dedicados; métricas/spans e console de operações ainda não exibem o read model completo; schemas executáveis não são reidratados em processos novos.

BLOCKED: provider, canal, IdP, RAG institucional, piloto, RPO/RTO físico e signoff humano. A certificação candidate-bound corrente ainda não foi emitida; produção permanece `NO-GO`.
