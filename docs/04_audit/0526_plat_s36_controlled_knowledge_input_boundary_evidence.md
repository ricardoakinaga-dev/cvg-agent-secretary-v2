# Evidência de auditoria — PLAT-S36

## Identificação e veredito

- lane: `PLAT-S36-001_CONTROLLED_KNOWLEDGE_INPUT_PROVENANCE_BOUNDARY`
- data: `2026-08-26`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- veredito: `COMPLETED_CONTROLLED`
- produção: `NO-GO` / `WAITING_HUMAN_APPROVAL`

O lane fecha a fronteira de proveniência do fixture interno
`approvedKnowledge`. Ele não adiciona RAG, ingestão, conteúdo documental
real, provider, canal, URL externa, egress, broker, outbox, dado real, deploy
ou side effect.

## Contrato implementado

`ApprovedKnowledgeForTestSchema` em
[`packages/platform/src/contracts.ts:174`](../../packages/platform/src/contracts.ts:174)
é o contrato único e strict para o payload:

- `source`: trimada, 1–200 caracteres, somente `^controlled://`;
- `version`: trimada, 1–120 caracteres;
- `answer`: trimada, 1–4.000 caracteres;
- chaves adicionais são rejeitadas.

O runtime valida e normaliza antes dos eventos de knowledge, prompt, modelo ou
tool em
[`packages/platform/src/test-lab.ts:79`](../../packages/platform/src/test-lab.ts:79)
e
[`packages/platform/src/test-lab.ts:334`](../../packages/platform/src/test-lab.ts:334).
Depois, o binding configurado ainda exige `source` e `version` exatos; o
payload não concede autoridade nem carrega código ou fonte externa.

O mesmo contrato é usado por `TestLabRequestSchema` em
[`apps/api/src/server.ts:3130`](../../apps/api/src/server.ts:3130), por
`CapabilityApprovalExecutionRequestSchema` em
[`apps/api/src/server.ts:3216`](../../apps/api/src/server.ts:3216) e por
`TestLabCaseSchema` em
[`packages/platform/src/contracts.ts:754`](../../packages/platform/src/contracts.ts:754).

## TDD e evidência de execução

### RED

Comando:

```text
npx vitest run packages/platform/src/__tests__/knowledge-input-boundary.test.ts apps/api/src/__tests__/knowledge-input-boundary.test.ts
```

Resultado: 4 testes; 2 casos válidos passaram e 2 falharam como esperado,
reproduzindo que o runtime aceitava resposta acima de 4.000/campo extra e a
API aceitava `controlled://` acima de 200. Não houve chamada externa nem
efeito colateral.

### GREEN e correção de auditoria

- focused platform/API inicial: 2 arquivos/4 testes PASS;
- regressão próxima após compartilhar o schema: 4 arquivos/15 testes PASS,
  typecheck e lint PASS;
- teste adicional em
  [`apps/api/src/__tests__/capability-approval-api.test.ts:205`](../../apps/api/src/__tests__/capability-approval-api.test.ts:205)
  exercita a rota de execução de capability approval, rejeita payload inválido
  com `validation_failed` e confirma que a approval permanece `issued`;
- focused final combinado: 3 arquivos/8 testes PASS — platform 3, API Test Lab
  1 e capability approval 4.

A revisão independente retornou `NEEDS_CORRECTION` somente por três achados
MEDIUM, sem CRITICAL/HIGH: chave `last_green` duplicada no tracking, backlog
mestre fora de fase e ausência do teste negativo da segunda rota. A chave foi
eliminada, o backlog foi fechado em AUDIT e o teste foi adicionado e passou.

## Gates finais

| Gate                                                              | Resultado                                                                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                                                  | PASS — 117 arquivos, 422 testes, 19 skips; coverage 85,05% statements, 80,31% branches, 85,11% functions, 86,07% lines |
| `npm run readiness`                                               | PASS — 1 arquivo, 4 testes                                                                                             |
| `npm run test:worker:startup`                                     | PASS — `worker.startup_smoke_passed`, `queue_adapter_missing`                                                          |
| `npm run test:e2e`                                                | PASS — 4 testes                                                                                                        |
| `TEST_DATABASE_URL=<fixture PostgreSQL 16> npm run test:postgres` | PASS — 8 arquivos, 71 testes; container descartável removido                                                           |
| `npm audit --audit-level=high`                                    | PASS — 0 vulnerabilidades                                                                                              |
| `git diff --check`                                                | PASS                                                                                                                   |

## Critérios CTRL

- CTRL-141: `PASS controlled` — validação no boundary interno do runtime;
- CTRL-142: `PASS controlled` — Test Lab, approval execution e `TestLabCase`
  compartilham o schema;
- CTRL-143: `PASS controlled` — source controlada e binding `source/version`
  exato continuam obrigatórios;
- CTRL-144: `PASS controlled` — payload inválido falha antes de modelo/tool e
  nenhuma integração externa foi introduzida.

O resultado autoriza somente a continuação do MVP controlado e uma nova
discovery/SPEC. Não autoriza produção, dados reais, automação de consultas,
ações clínicas/financeiras, canais, providers ou RAG real.
