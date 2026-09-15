# AAA-21 — execução durável de Goal/Plan/Step — 2026-09-15

## Estado da especificação

Esta especificação registra o primeiro BUILD executável do runtime de orquestração exigido pelos prompts 6 e 14. O código foi selado nos commits locais `bf1c17b` (`feat(orchestrator): add durable goal plan execution`), `6d91b31` (`feat(orchestrator): resume governed inbound goals`) e `b02a493` (`feat(orchestrator): bind durable goals to inbound identity`). O resultado é um incremento controlado: a matriz Phase 11 continua `PARTIAL` e a certificação candidate-bound permanece `CONDITIONAL_GO / AAA_CONTROLLED`, com produção `NO-GO`.

Nenhum dado real, provider externo, canal real, identidade externa, fonte RAG institucional ou efeito clínico/financeiro foi usado.

## Contrato executado

O núcleo em `packages/agent-runtime/src/orchestration.ts` fornece:

- estados explícitos para Goal, Plan e PlanStep, incluindo `WAITING_APPROVAL`, `WAITING_EXTERNAL`, `HUMAN_HANDOFF`, `UNCERTAIN`, `BUDGET_EXHAUSTED` e `LOOP_DETECTED`;
- validação de DAG antes da ativação, com dependências conhecidas, detecção de ciclo, capacidades, risco, classificação de dados, timeout e fingerprint determinístico;
- orçamento persistido de passos, replans, chamadas de modelo, chamadas de ferramenta, duração e custo;
- loop durável observe → evaluate → replan, com critérios FACT/EVENT/STATE/SEMANTIC/COMPOSITE e evidência operacional verificável;
- claim, heartbeat, lease token, fencing, tentativa, recuperação de lease expirado e rejeição de worker atrasado;
- isolamento por tenant e controle de versão otimista para Goal, Plan e Step;
- encerramento seguro em aprovação, handoff, espera externa, incerteza, orçamento excedido ou loop detectado.

O armazenamento PostgreSQL em `packages/persistence/src/orchestrator-postgres.ts` e na migration `0019_orchestrator_state.sql` persiste goals, plans, steps, attempts, observations e evaluations. As tabelas têm `tenant_id`, RLS `FORCE`, políticas de isolamento, versão, orçamento, leases e `lease_token`. A conexão usa transações com contexto de tenant e SQL parametrizado.

O worker expõe `PostgresKernelRuntime.runDurableGoal()` como caminho controlado. O executor reconstrói uma intenção governada, chama o kernel existente e só relata sucesso quando há evidência de efeito confirmada ou evento durável no outbox. A intenção persistida não contém um objeto executável de schema Zod; o caminho durável usa `structuredOutput: null` e conserva apenas dados serializáveis. O inbound público pode optar por esse caminho com `CVG_DURABLE_KERNEL_ORCHESTRATOR=true`; o padrão continua desligado. Cada Goal durável é vinculado ao `inbound_message_id` único por tenant, evitando que mensagens distintas com o mesmo correlation ID compartilhem estado. A retomada valida a decisão persistida e faz CAS conjunto para liberar ou cancelar o step aguardando aprovação; o settle do step também atualiza atomicamente o status especial do Goal.

## Evidência local

Validações executadas no candidato local atual:

```text
npx vitest run --no-file-parallelism --maxWorkers=2 packages/agent-runtime/src/__tests__/orchestration.test.ts
PASS — 10 testes

TEST_DATABASE_URL=postgres://... npm run test:postgres
PASS — 23 arquivos, 197 testes

npm test
PASS — 247 arquivos, 1.735 testes; 114 skips condicionais

npx tsc -p tsconfig.typecheck.json --noEmit
PASS

npm run lint
PASS

npx prettier --check <arquivos do incremento e evidências>
PASS
```

Os testes cobrem DAG e ciclos, transições inválidas, execução multi-step, evidência obrigatória, replan e lineage de planos, loop/budget guard, fencing após takeover, isolamento de tenant, retomada após novo processo, lease expirado sem reconciliador, identidade inbound distinta, e a integração HTTP → outbox → worker com aprovação pendente, retomada pelo continuation event e efeito controlado único.

## Limites e próximo gate

Este BUILD não autoriza promoção. O caminho inbound público ainda usa o fluxo legado por padrão; a flag opt-in foi coberta por teste e não é uma liberação irrestrita. Ainda faltam métricas/spans completos do orquestrador, read model operacional completo na console, reconciliação de efeitos externos, provider/canal/IdP reais, RPO/RTO físico, piloto supervisionado e signoff humano. Esses pontos permanecem `PARTIAL` ou `BLOCKED` na matriz e impedem `STATE_OF_ART_TRIPLE_AAA`.

O próximo gate deve conectar o caminho público a uma flag de rollout controlada, adicionar lineage explícito no journal/outbox/audit, executar recuperação com reconciliador e repetir Phase 10/11 em candidato limpo. Nenhuma ação real deve ser habilitada nesse trabalho.
