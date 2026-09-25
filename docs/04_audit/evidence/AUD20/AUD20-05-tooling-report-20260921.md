# AUD20-05 — relatório da fatia de tooling offline

- observado em: `2026-09-21T23:26:20Z`
- task: `AUD20-05`
- pipeline: `SPEC -> BUILD` somente para tooling neutro
- status da task: `BLOCKED` / `WAITING_HUMAN_APPROVAL`
- execução: `CONTROLLED_LOCAL`
- Node: `22.23.2`
- release eligibility: `false`

## Entrega

Foi adicionada a ferramenta
`scripts/aud20-05-resource-attestation-check.mjs` e sua suíte
`tests/aud20-05-resource-attestation-check.test.js`. Ela é read-only e aceita
somente fixtures com `dataOrigin=synthetic`, `observationMode=offline_fixture` e
`environment=CONTROLLED_LOCAL`.

A ferramenta verifica, sem imprimir material sensível:

- digest calculado dos bytes observados contra o digest declarado;
- vínculo do candidato e da configuração;
- janela, owner e assinatura HMAC da attestation sintética;
- referências opacas de key-ring/segredo, sem aceitar valores crus;
- schema/tabela, grants `SELECT/INSERT/UPDATE/DELETE`, role distinta do owner,
  RLS sem bypass e privilégios proibidos;
- redaction, ausência de efeitos e `notRuntimeProof=true` no resultado.

## Verificações executadas

| Comando | Resultado |
| --- | --- |
| focused `npm test -- tests/aud20-05-resource-attestation-check.test.js` | `PASS` — 1 arquivo / 8 testes |
| `npm test` | `PASS` — 284 arquivos, 2.192 testes, 188 skips condicionais |
| `npm run test:coverage` | `PASS` — 284 arquivos, 2.192 testes, 188 skips; 91,16% statements / 87,24% branches / 89,30% functions / 91,76% lines |
| `npm run typecheck` | `PASS` |
| `npm run lint` | `PASS` |
| `npm run format:check` | `PASS` |
| `npm run docs:check` | `PASS` — 789 links, 582 JSONs |
| `git diff --check` | `PASS` |

## Cobertura da task e limite

| Critério | Estado desta fatia |
| --- | --- |
| C01/C02 | `PASS_LIMITED` — binding, validade e assinatura somente em fixture offline |
| C03 | `PASS_LIMITED` — contrato de grants modelado, sem consulta a PostgreSQL |
| C04/C05 | `NOT_RUN` — startup/bind/claim concorrente do produto aguardam o gate |
| C06 | `PASS_LIMITED` — saída redigida e candidate/config binding do fixture |
| C07 | `NOT_RUN` — rollback do adapter real aguarda BUILD |

Este relatório não qualifica `AUD20-05` como concluída. Na fatia offline
original não houve conexão PostgreSQL nem prova de grants da role efetiva; não
houve alteração de API/worker, migration, bind, staging, produção, integração
externa, dado real, commit, push ou efeito sensível. Os campos formais de
`AUD20-16` continuam pendentes.

## Complemento posterior — prova local descartável de grants

Em `2026-09-21T23:48:46Z`, o probe independente
`scripts/aud20-05-replay-grants-probe.mjs` foi executado no PostgreSQL
descartável `cvg-aud20-04-postgres`. Ele criou e removeu somente objetos
sintéticos com nomes únicos e confirmou a role runtime mínima: CRUD efetivo na
tabela, `USAGE` sem `CREATE` no schema, ausência de `CREATE` no database,
ownership distinto, ausência de memberships e flags administrativas/bypass-RLS
desligadas. O cleanup passou; o resultado redigido declarou
`productSchemaTouched=false`, `externalEffects=false`, `notRuntimeProof=true` e
`releaseEligible=false`.

Esse complemento muda apenas C03 para `PASS_LIMITED` na dimensão de grants
efetivos. Não é prova de API/worker, startup, bind, claim, purge concorrente,
attestation candidate-bound ou rollback; C04–C07 continuam sem fechamento. A
task e o gate formal de `AUD20-16` permanecem bloqueados.

Evidência detalhada: [AUD20-05-postgres-grants-probe-20260921.md](AUD20-05-postgres-grants-probe-20260921.md).
