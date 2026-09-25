# AUD20-05 — evidência de preparação da SPEC

- observado em: `2026-09-21T22:52:00Z`
- execução: `CONTROLLED_LOCAL`
- task: `AUD20-05`
- status: `BLOCKED` / `WAITING_HUMAN_APPROVAL`
- natureza: evidência de preparação; não é receipt de BUILD nem qualificação da task

## Resultado

A SPEC [aud20_05_resource_attestation_replay_20260921.md](../../../02_spec/aud20_05_resource_attestation_replay_20260921.md)
foi criada a partir do mapeamento dos pontos existentes de attestation,
key-ring, replay PostgreSQL, bootstrap API e preflight PostgreSQL do worker.
Ela registra a opção A como orientação de desenho, mantém owner/autoridade/
validade de `AUD20-16` pendentes e define a superfície, critérios, negativos,
rollback e gate para o futuro BUILD.

Nenhum arquivo de produto, schema, migration, bind, staging, produção,
integração externa, dado real ou efeito sensível foi alterado/executado nesta
rodada.

## Verificações

| Verificação | Resultado |
| --- | --- |
| `npm run docs:check` | `PASS` — 787 links, 582 JSONs, estado e próxima ação coerentes |
| `npm run format:check` | `PASS` — todos os arquivos formatados |
| `git diff --check` | `PASS` |
| origem dos dados | somente leitura de código/documentação existente; sem dados reais |
| release eligibility | `false` — preparo bloqueado pelo gate AUD20-16 |

## Limitação explícita

Não foram executados testes de produto, PostgreSQL, startup, grants ou
concorrência de replay: isso seria BUILD de `AUD20-05` e permanece proibido
antes da decisão formal de `AUD20-16`.
