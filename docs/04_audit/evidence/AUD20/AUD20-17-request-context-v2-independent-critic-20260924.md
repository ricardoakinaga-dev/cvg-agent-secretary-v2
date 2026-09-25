# AUD20-17 / IMP50-40 — crítica independente request-context v2 — 2026-09-24

## Veredito

**NÃO ACEITAR nesta rodada.** A crítica fresh-context concluiu C01–C05 como
`PASS`, C06 e C07 como `FAIL`. O parecer avaliou a candidata request-context
v2 e distinguiu a reconstrução v1 da árvore integrada com request-query. O
`PASS_LOCAL` separado de query-parser não satisfaz o aceite desta fatia.

## Escopo, candidato e integridade

A revisão foi somente leitura, sem execução de testes nem escrita. A proposta
v2 aprovada tem SHA-256
`1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`; o recibo
registra `SPEC_APPROVED_CONTROLLED_BUILD` dentro da allowlist local.

O fingerprint completo repository+state foi calculado antes e depois da
revisão com `gauntlet_state.py fingerprint --include-state`:

| Captura | Digest |
| --- | --- |
| Pré — `2026-09-24T04:33:52Z` | `7ea35b982dfd962ac8f7fde4e68252711651413e9e7dcb872aec0d5d7a0079b5` |
| Pós — `2026-09-24T04:41:39Z` | `7ea35b982dfd962ac8f7fde4e68252711651413e9e7dcb872aec0d5d7a0079b5` |

HEAD, diff de worktree e diff de index também permaneceram iguais. Isso
corrobora que o crítico não alterou o repositório durante a revisão.

## Parecer por critério

| Critério | Estado | Fundamentação independente |
| --- | --- | --- |
| C01 — owner e dependências | `PASS` | Os dez helpers originais têm owner em `request-context.ts`; arquitetura valida helpers da emenda, owner único, imports permitidos, injeção explícita e ausência de ciclo runtime. |
| C02 — tamanho e atribuição | `PASS` | A reconstrução v1 tem `server.ts=4.707` (38 linhas abaixo das 4.745 anteriores); request-context tem 328/450. O integrado é `server.ts=4.584`, context 328, query 138, soma 5.050; os parsers integrados não foram usados para satisfazer o limite v1. A atribuição segue a emenda v2 aprovada. |
| C03 — identidade e default deny | `PASS` | Código/testes cobrem trusted sem resolver/tenant, vínculo identidade-tenant, memoização por objeto de headers, resolução em outro request, permissões e platform scope; fixtures são sintéticas. |
| C04 — HTTP e exports | `PASS` | Asserções verificam envelope, malformed JSON, status/códigos/mensagens/limites/headers, bytes originais do webhook e superfície congelada de exports. O focused integrado registra 47 aprovados, 1 skip e 0 falhas. |
| C05 — negativos e arquitetura | `PASS` | Testes verificam channel, tenant, permissões, identidade e memoização; arquitetura verifica imports, env, ciclos, owner, exports e caps sem falhas no recibo focused. |
| C06 — regressão e cobertura | `FAIL` | A suíte integrada registra 2.256 PASS/192 skips/0 falhas. Cobertura: statements 90,84%, branches 87,00%, functions 89,27%, lines 91,43%. Functions fica abaixo de 90%; branches de request-context são 92%, abaixo do piso crítico 95%. O pacote não contém gate PostgreSQL com zero skips, baseline válida anterior nem detecção selecionada de mutation em 100%. |
| C07 — revisão independente | `FAIL` | A revisão fresh foi concluída e separou os dois candidatos; como C06 não passa, o crítico não aprova a candidata request-context. |

A matriz v1 apresenta 113 PASS/9 skips. Os 192 skips integrados não foram
contabilizados como aprovados. A crítica não reclassificou individualmente os
skips; isso não altera C06, que já falha pelos floors de cobertura e pela
ausência dos gates obrigatórios.

## Recibos consultados

- [Build report](AUD20-17-request-context-v2-build-report-20260924.md)
- [Manifesto do candidato](AUD20-17-request-context-v2-build-candidate-manifest-20260924.json)
- [Teste completo integrado](AUD20-17-request-context-v2-integrated-full-test-round1-20260924.log)
- [Coverage integrado](AUD20-17-request-context-v2-integrated-coverage-round1-20260924.log)
- [Coverage JSON](AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json)
- [Crítica focada integrada](AUD20-17-request-context-build-focused-round2-20260924.log)
- [Matriz v1](AUD20-17-request-context-v1-matrix-round2-20260924.log)

## Disposição

`AUD20-17/IMP50-40` permanece `IN_PROGRESS`; request-context v2 não está
aceita. Não executar outro BUILD, gate PostgreSQL, mutation, commit/push,
deploy, staging ou produção sem a autorização/gate aplicável. `AUD20-10`
continua enfileirada e staging/produção permanecem `NO_GO`.
