# Evidência de auditoria — PLAT-S45

## Identificação

- task: `PLAT-S45-001_CONTROLLED_TOOL_INVOCATION_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- phase: `AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- data: `2026-08-26`
- escopo: fronteira server-side de invocação de tools compiladas

## Gap e contrato

A discovery reproduziu três falhas na boundary do Capability Gateway: `input:
null` chegava ao handler sem validator, `actor.permissions` inválido podia
causar `TypeError` e um resultado contendo `data.raw` era devolvido sem
projeção. O contrato S45 exige validators server-side de input e output por
tool, autorização efetiva independente do grant do chamador, aprovação durável
e single-use, input bounded antes de consumo/handler e resultado projetado,
limitado e redigido antes de retorno/auditoria.

## Evidência TDD

### RED

Comando:

```text
npx vitest run packages/platform/src/__tests__/tool-invocation-boundary.test.ts --no-file-parallelism --maxWorkers=2
```

Resultado: 1 arquivo/4 testes, os 4 falharam como esperado. O registry aceitava
tool sem validator, input inválido alcançava o handler, actor malformado
causava exceção e o gateway espalhava `error`/payload bruto do handler.

### GREEN focado

Comando final:

```text
npx vitest run packages/platform/src/__tests__/tool-invocation-boundary.test.ts packages/platform/src/__tests__/controlled-tool-registry.test.ts packages/platform/src/__tests__/capability-approval-gateway.test.ts packages/platform/src/__tests__/platform-foundation.test.ts packages/platform/src/__tests__/plugin-registry-versioning.test.ts packages/tools/src/__tests__/platform-adapter.test.ts --no-file-parallelism --maxWorkers=2
```

Resultado: 6 arquivos/41 testes PASS. Os casos cobrem validators ausentes,
extras e inválidos, authorizer ausente/deny, actor com permissões falsificadas,
approval inválido ou replay, input `null`/excedente/cíclico, configuração
cíclica, clone sem mutação, resultado não declarado/redigido/cíclico,
`audit_unavailable` sem reexecução e regressão do Test Lab.

## Implementação auditada

- `packages/platform/src/plugin-gateway.ts`: registry valida o conjunto exato
  de validators por tool e handlers callable; o gateway valida envelope, actor,
  policy, scope, approval e binding, obtém grant por `CapabilityActorAuthorizer`
  server-side sem confiar em `actor.permissions`, usa input parseado e retorna
  estado explícito quando a auditoria falha.
- `packages/platform/src/tool-invocation-boundary.ts`: clone JSON-like bounded
  com limites de profundidade, nós, chaves, arrays, strings e tamanho total;
  rejeição de ciclos, proxies hostis, prototype pollution, tipos não suportados
  e resultado fora do output validator.
- `packages/platform/src/contracts.ts`: inspeção de configuração com limites
  de profundidade/nós, rejeição de ciclos e limite de chaves por binding.
- `packages/platform/src/controlled-plugins.ts` e `apps/api/src/server.ts`:
  tool controlada declara validators e gateways da API recebem authorizer
  server-side apropriado; permissões entregues pelo chamador não são fonte de
  autoridade.
- `packages/platform/src/__tests__/tool-invocation-boundary.test.ts` e
  fixtures de registry, approval, versioning, foundation e API: regressões
  adversariais e compatibilidade controlada.

Não foi criado import dinâmico, marketplace, schema executável fornecido pelo
usuário, provider/canal real, rede, RAG, broker, outbox, egress, deploy, dado
real ou side effect.

## Gates executáveis

| Gate                                                                                             | Resultado                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| focused S45                                                                                      | 6 arquivos/41 testes PASS                                          |
| `npm test`                                                                                       | 125 arquivos PASS, 2 skipped; 512 testes PASS, 19 skipped          |
| `npm run test:coverage`                                                                          | 85,01% statements; 80,14% branches; 85,82% functions; 86,03% lines |
| `npm run typecheck`                                                                              | PASS                                                               |
| `npm run lint`                                                                                   | PASS                                                               |
| `npm run readiness`                                                                              | 4/4 PASS                                                           |
| `npm run test:worker:startup`                                                                    | PASS — smoke controlado                                            |
| `npm run audit:security`                                                                         | 0 vulnerabilidades                                                 |
| `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test npm run test:postgres` | 6 arquivos/53 testes PASS; 2 arquivos/19 testes skipped            |
| `npm run test:e2e`                                                                               | 4/4 PASS                                                           |
| `npm run build`                                                                                  | PASS — 70 módulos; 278,88 kB/gzip 81,99 kB                         |
| `npm run format:check`                                                                           | PASS                                                               |
| `git diff --check`                                                                               | PASS                                                               |

PostgreSQL usou somente `cvg_his_v2_test`; E2E e build permaneceram locais e
controlados. Nenhum dado real ou efeito externo foi usado.

## Revisão e decisão

A tentativa de revisão especializada fixa foi rejeitada pelo ambiente porque o
modelo `gpt-5.3-codex` não é suportado pela conta; isso não foi tratado como
aprovação. A revisão independente compatível, read-only, retornou `PASS sem
P0/P1` depois das correções do BUILD. Esse resultado foi registrado sem
atribuir aprovação à tentativa incompatível.

Decisão: a task está `COMPLETED_CONTROLLED` em `AUDIT`, restrita ao contrato
server-side e às fixtures desta evidência. Produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`; ações clínicas, financeiras, de prontuário,
agenda, RAG, provider/canal, egress e rollout continuam bloqueadas.
