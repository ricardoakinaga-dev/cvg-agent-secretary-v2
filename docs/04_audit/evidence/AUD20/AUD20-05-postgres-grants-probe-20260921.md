# AUD20-05 — prova local descartável de grants efetivos

- observado em: `2026-09-21T23:48:46Z`
- task: `AUD20-05`
- ferramenta: `scripts/aud20-05-replay-grants-probe.mjs`
- ambiente: `CONTROLLED_LOCAL`
- banco: `postgres:16-alpine`, container descartável `cvg-aud20-04-postgres`
- alvo de conexão: loopback `127.0.0.1:55434`; DSN e credenciais não foram
  gravados nem impressos
- status da task: `BLOCKED` / `WAITING_HUMAN_APPROVAL`
- release eligibility: `false`

## Resultado observado

O probe criou um schema, uma role owner, uma role runtime e a tabela sintética
`operator_replay_events` com nomes únicos; em seguida removeu todos os objetos
com `cleanup=PASS`. O schema não pertence ao produto e nenhum dado real foi
usado.

| Verificação | Resultado |
| --- | --- |
| conexão e identidade da role runtime | `PASS` |
| `INSERT` / `SELECT` / `UPDATE` / `DELETE` efetivos | `PASS` |
| database `CREATE` para a role runtime | `false` |
| schema `USAGE` / `CREATE` | `true` / `false` |
| tabela `SELECT` / `INSERT` / `UPDATE` / `DELETE` | `true` / `true` / `true` / `true` |
| tabela `REFERENCES` / `TRIGGER` / `TRUNCATE` | `false` / `false` / `false` |
| schema/tabela owned pela role owner | `PASS` |
| role runtime superuser, inherit, create-role, create-db, replication ou bypass-RLS | `false` em todos |
| role runtime com membership adicional | `false` |
| cleanup do fixture | `PASS` |
| catálogo após a rodada | `0` schemas e `0` roles `aud20_05_*` remanescentes |

PostgreSQL não modela `ALTER` como grant de tabela; esse risco foi coberto pela
prova de ownership distinto e pela ausência de memberships/privilégios
administrativos da role runtime.

O resultado redigido declarou `productSchemaTouched=false`,
`externalEffects=false`, `disposableLocalSideEffects=true`,
`notRuntimeProof=true` e `releaseEligible=false`.

## Verificação da rodada

| Comando | Resultado |
| --- | --- |
| focused dos dois toolings AUD20-05 | `PASS` — 2 arquivos / 12 testes |
| `npm test` | `PASS` — 285 arquivos / 2.196 testes / 188 skips condicionais |
| `npm run test:coverage` | `PASS` — 91,16% statements / 87,24% branches / 89,30% functions / 91,76% lines |
| `npm run typecheck` | `PASS` |
| `npm run lint` | `PASS` |
| `npm run format:check` | `PASS` |

Verificação finalizada em `2026-09-22T00:18:15Z`.

## Limite do resultado

Esta é uma prova de tooling `PASS_LIMITED` para a fatia de grants efetivos em
fixture local. Ela não inicializou API/worker, não executou `assertReady`,
startup, bind, claim, purge concorrente ou efeito externo; também não prova a
attestation candidate-bound nem fecha C04–C07. A task `AUD20-05` permanece
bloqueada pelo gate formal de `AUD20-16`; owner formal, autoridade/ação da
revisão e validade continuam `PENDING`. Staging e produção permanecem `NO_GO`.

## Matriz adversarial V1.13

Em `2026-09-22T00:33:02Z`, o probe passou a aceitar somente um inventário
fechado de cenários controlados. Cada cenário criou um fixture próprio, foi
avaliado pelo oracle esperado e executou cleanup antes do próximo.

| Cenário | Resultado observado | Oracle esperado | Cleanup |
| --- | --- | --- | --- |
| `valid` | `PASS` | configuração mínima aceita | `PASS` |
| `missing_delete` | `REJECTED` | `privileges.table_crud_incomplete` | `PASS` |
| `schema_create_granted` | `REJECTED` | `privileges.schema_create_granted` | `PASS` |
| `table_truncate_granted` | `REJECTED` | `privileges.table_forbidden_granted` | `PASS` |
| `runtime_owns_table` | `REJECTED` | `ownership.runtime_is_owner` | `PASS` |
| `bypass_rls` | `REJECTED` | `role.bypass_rls` | `PASS` |
| `role_membership` | `REJECTED` | `role.membership` | `PASS` |

O catálogo após a matriz permaneceu com `0` schemas `aud20_05_probe_*` e `0`
roles `aud20_05_*`. O teste focado do probe passou `6/6`; a regressão posterior
passou `285` arquivos, `2.198` testes e `188` skips condicionais. Typecheck,
lint e format também passaram. A cobertura global não foi reexecutada nesta
subrodada; o último resultado executado permanece o V1.12 registrado acima.

### Registro de decisão

- problema: um happy path de grants não demonstra que o harness falha fechado;
- invariante: configuração insegura é rejeitada pelo motivo estável e não deixa
  schema, role ou dado residual;
- alternativas: manter apenas o caso válido, simular em memória ou executar
  known-bad variants no PostgreSQL descartável;
- seleção: known-bad variants reais, porque é a menor opção que observa ACL,
  ownership e catálogo no boundary persistente;
- contenção: somente loopback, nomes aleatórios, dados sintéticos, inventário de
  cenários fechado, resultado redigido e cleanup em `finally`;
- limite: não exercita runtime API/worker, concorrência de claim, migration,
  staging ou produção e não altera o gate formal.
