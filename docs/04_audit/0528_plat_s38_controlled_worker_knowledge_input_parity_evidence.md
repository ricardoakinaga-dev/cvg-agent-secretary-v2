# Evidência — PLAT-S38-001

## Identificação

- task: `PLAT-S38-001_CONTROLLED_WORKER_KNOWLEDGE_INPUT_PARITY`
- data: `2026-08-26`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- ambiente: fixtures fictícias e runtime local; nenhum broker, dado real,
  provider, canal, RAG ou efeito externo
- resultado: `COMPLETED_CONTROLLED`

## Gap e contrato

O runtime publicado já aceitava `approvedKnowledge` strict/bounded, mas o job do
worker rejeitava o campo antes de chamar o executor. Além disso, o job limitava
`history` a 20 itens, enquanto os boundaries controlados equivalentes aceitam 50. O contrato final em `published-worker-job.ts` reutiliza
`ApprovedKnowledgeForTestSchema`, limita `history` a 50 e mantém
`tenantId`/`agentId`/`versionId` pinned. `processAgentTurnJob` encaminha somente
o valor parseado para `executePublishedAgent`.

## RED, crítica e GREEN

RED inicial:

```text
npx vitest run apps/worker/src/__tests__/published-worker-knowledge-boundary.test.ts
```

Resultado: 3 testes, 1 falha esperada; job válido com fixture
`controlled://` era rejeitado pelo schema strict antigo.

Uma crítica independente encontrou o drift de `history` e a ausência de
assertion de contexto/limites. Foi escrito um teste adicional de 21 itens antes
da correção; o RED passou a 5 testes com 1 falha esperada. O GREEN final passou
3 arquivos/14 testes, cobrindo forwarding de knowledge, contexto de sessão,
limite compartilhado de histórico e rejeições de source externa, campo extra e
histórico acima do limite. O parecer independente não encontrou CRITICAL/HIGH;
o achado MEDIUM foi corrigido e o achado LOW foi coberto.

## Implementação e arquivos

- `packages/agent-core/src/commands/published-worker-job.ts`: schema shared,
  strict, `approvedKnowledge` opcional e history bounded em 50;
- `apps/worker/src/worker.ts`: forwarding do payload parseado e contexto
  bounded ao executor pinned;
- `apps/worker/src/__tests__/published-worker-knowledge-boundary.test.ts`:
  testes RED/GREEN de validade, limites, contexto e falha precoce.

O worker continua sem bootstrap fictício e sem adapter de fila. O job não
fornece código, permissão, versão alternativa ou fonte não controlada.

## Gates executáveis

| Gate                                                                                                  | Resultado                                                                 |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm test`                                                                                            | PASS — 120 arquivos; 432 testes pass; 19 skips condicionais               |
| `npm run test:coverage`                                                                               | PASS — statements 84,92%; branches 80,09%; functions 85,08%; lines 85,92% |
| `npm run readiness`                                                                                   | PASS — 4 testes                                                           |
| `npm run test:worker:startup`                                                                         | PASS — `worker.startup_smoke_passed`, `queue_adapter_missing`             |
| `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test npm run test:postgres` | PASS — 8 arquivos; 71 testes                                              |
| `npm run test:e2e`                                                                                    | PASS — 4 testes Playwright                                                |
| `npm run build` / `npm run typecheck`                                                                 | PASS                                                                      |
| `npm run lint` / `npm run format:check`                                                               | PASS                                                                      |
| `npm run audit:security`                                                                              | PASS — 0 vulnerabilidades                                                 |
| `git diff --check`                                                                                    | PASS                                                                      |

## Limites e decisão

Esta alteração prova somente paridade do transporte de fixture controlado até o
runtime pinned. Não autoriza broker, retry/lease distribuído, provider/canal,
RAG, egress, outbox, deploy, dados reais ou side effect. O resultado máximo é
`CONTROLLED_MVP_READY`; produção real continua `NO-GO` /
`WAITING_HUMAN_APPROVAL`.
