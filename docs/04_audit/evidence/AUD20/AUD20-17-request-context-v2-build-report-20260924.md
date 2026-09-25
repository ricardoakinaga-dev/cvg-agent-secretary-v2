# AUD20-17 / IMP50-40 — BUILD local request-context v2 — 2026-09-24

## Resultado

O BUILD local controlado aprovado para a emenda request-context v2 foi
executado na allowlist registrada. A fatia continua `IN_PROGRESS` e **não está
aceita**: C02 tem evidência local dentro dos caps; C06 falha nos floors AAA e
nos gates de banco/mutation; a crítica independente fresh-context concluiu
C01–C05 `PASS`, C06 e C07 `FAIL`.

Autorização: [proposta v2](AUD20-17-request-context-spec-amendment-proposal-v2-20260924.md),
SHA-256 `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`;
[recibo humano](AUD20-17-request-context-spec-amendment-human-approval-v2-20260924.md).
O [manifesto do candidato](AUD20-17-request-context-v2-build-candidate-manifest-20260924.json)
tem SHA-256 `11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d` e
vincula os arquivos-fonte/teste e os recibos executados.

## Candidato e implementação

A reconstrução isolada v1 passou os hashes guard antes do primeiro write; veja
o [registro de precondições](AUD20-17-request-context-v1-reconstruction-20260924.json).
O rollback atribuiu os cinco parsers ao `server.ts` v1 e restaurou os cinco
testes alterados pelo query-parser para `HEAD`. Em
`server-boundary-envelope.test.ts`, o candidato usou `HEAD` mais somente a nova
assertion request-context de envelope/mensagem de JSON inválido; as assertions
de query-parser foram removidas. O candidato executado ficou em
`server.ts=4.707` linhas.

O clone de teste reutilizou o `node_modules` instalado na workspace via
symlink. As árvores `packages/` (411 arquivos) e `apps/worker/` (39 arquivos)
resolvidas pelos links de workspace foram comparadas byte a byte com as cópias
do candidato e coincidiram; hashes estão no manifesto.

O módulo request-context final tem 328 linhas. Na árvore integrada,
`server.ts=4.584`, `request-context.ts=328`, `request-query.ts=138`, soma
`5.050`. A factory injeta os hooks de métricas, parser/raw-body e helpers de
autorização; os testes verificam cleanup, corpo JSON exato, mensagens HTTP,
raw-body HMAC e o truth table de mutações autenticadas. Nenhuma alteração de
API/schema foi feita.

Nota para revisão independente: os tipos locais de request/reply usam aliases
estruturais compactos e `RequestMetricRoute` permite `url?: string | undefined`
para compatibilidade com Fastify e `exactOptionalPropertyTypes`; a mudança é
de tipo e não altera comportamento em runtime.

A primeira execução focada com hooks de request síncronos travou chamadas
`inject` e terminou com 16 falhas por timeout. Os hooks foram tornados async;
as execuções finais focada/integrada passaram (4 arquivos, 47 PASS/1 skip).
O [log da tentativa inicial](AUD20-17-request-context-build-focused-20260924.log)
permanece preservado como evidência intermediária.

## Verificação

Todas as execuções abaixo usaram Node `v22.23.2` e `TEST_DATABASE_URL=''`.
Nenhum PostgreSQL, dado real, serviço externo ou efeito externo foi usado.

| Verificação | Resultado |
| --- | --- |
| Integrado com query-parser | 4 arquivos; 47 passaram, 1 ignorado, 0 falhas — [log](AUD20-17-request-context-build-focused-round2-20260924.log) |
| Matriz request-context v1 | 13 arquivos; 113 passaram, 9 ignorados, 0 falhas — [log](AUD20-17-request-context-v1-matrix-round2-20260924.log) |
| Suíte completa | 300 arquivos; 2.248 passaram, 192 ignorados, 0 falhas — [log](AUD20-17-request-context-v1-full-test-round2-20260924.log) |
| Cobertura completa | statements 90,83%; branches 86,97%; functions 89,27%; lines 91,42% — [log](AUD20-17-request-context-v1-coverage-round2-20260924.log) |
| Inventário de testes | reporter JSON por arquivo e por teste; 29 arquivos/192 skips condicionais reconciliados com NQP-02 — [inventário](AUD20-17-request-context-v1-test-inventory-20260924.json) |
| Typecheck | PASS — [log](AUD20-17-request-context-typecheck-final-20260924.log) |
| Lint | PASS — [log](AUD20-17-request-context-lint-final-20260924.log) |
| Prettier | PASS — [log](AUD20-17-request-context-format-final-round2-20260924.log) |
| `docs:check` após atualizar os estados | PASS — 1.458 links, 627 JSONs, estado semântico coerente — [log](AUD20-17-request-context-v2-docs-check-final-round5-20260924.log) |
| `format:check` após atualizar os estados | PASS — [log](AUD20-17-request-context-v2-format-check-final-round5-20260924.log) |
| `git diff --check` após atualizar os estados | PASS — [log](AUD20-17-request-context-v2-diff-check-final-round5-20260924.log) |

O módulo `request-context.ts` registrou 99% statements, 92% branches, 100%
functions e 98,91% lines. O piso crítico de branches é 95%; a execução não
atinge esse floor. O reporter confirmou os 192 skips nos 29 arquivos
condicionais do inventário NQP-02. Eles foram ignorados no run unitário e não
contam como aprovados. O gate PostgreSQL e a detecção de mutation selecionada
não foram executados.

## Disposição C01–C07

| Critério | Estado desta rodada | Evidência / razão |
| --- | --- | --- |
| C01 | `PASS_LOCAL` | Arquitetura valida owner único e boundary injetado. |
| C02 | `PASS_LOCAL` | Reconstrução v1 `4.707/4.708`; contexto `328/450`; query `138/160`; soma integrada `5.050/5.050`. |
| C03 | `PASS_LOCAL` | Matriz de identidade, default deny, tenant e inbound passou; casos condicionais de PostgreSQL seguem sem execução. |
| C04 | `PASS_LOCAL` | Compatibilidade de envelope/mensagens HTTP, JSON inválido e raw-body webhook verificados. |
| C05 | `PASS_LOCAL` | Negativos e assertions arquiteturais passaram. |
| C06 | `FAIL` | Functions globais 89,27% (<90%); branches críticos request-context 92% (<95%); mutation não executada; gate PostgreSQL não executado e 192 casos condicionais ignorados. |
| C07 | `FAIL` | A crítica independente fresh-context terminou; como C06 falha, não aprova o candidato. Veja o [parecer](AUD20-17-request-context-v2-independent-critic-20260924.md). |

`PASS_LOCAL` é evidência de BUILD, não aceite final. A crítica independente
concluiu C01–C05 `PASS` e C06/C07 `FAIL`; veja o [parecer](AUD20-17-request-context-v2-independent-critic-20260924.md).
`AUD20-17` permanece `IN_PROGRESS`; `AUD20-10` segue enfileirada até Q1
liberar o DAG. O próximo passo depende de uma rota SPEC/gate própria para os
gaps C06. Não há autorização para ampliar o BUILD, usar PostgreSQL, fazer
commit/push/deploy, ou avançar staging/produção; ambos continuam `NO_GO`.

## Verificação integrada adicional no workspace — 2026-09-24

Depois da reconstrução isolada v1, a suíte completa e a cobertura foram
executadas no workspace integrado atual, com request-context e query-parser,
ambas contra os hashes integrados registrados no manifesto. Os recibos foram
preservados separadamente dos resultados da reconstrução v1:

| Verificação | Resultado no candidato integrado | Evidência |
| --- | --- | --- |
| `npm test` | 301 arquivos: 289 passaram, 12 ignorados; 2.256 testes passaram, 192 ignorados, 0 falhas | [log](AUD20-17-request-context-v2-integrated-full-test-round1-20260924.log) |
| `npm run test:coverage` | statements 90,84% (11.497/12.656); branches 87,00% (8.849/10.171); functions 89,27% (2.107/2.360); lines 91,43% (10.922/11.945) | [log](AUD20-17-request-context-v2-integrated-coverage-round1-20260924.log), [resumo JSON](AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json) |
| Módulo request-context | statements 99%; branches 92% (69/75); functions 100%; lines 98,91% | [resumo JSON](AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json) |

As duas execuções usaram Node `v22.23.2` e `TEST_DATABASE_URL=''`. Os 192
testes condicionais ignorados não contam como aprovados. O piso global de
functions e o piso crítico de branches do módulo continuam abaixo dos valores
exigidos; mutation selecionada e PostgreSQL permanecem `NOT_RUN`. Portanto,
esta verificação integrada também mantém C06 em `FAIL` e não conclui aceite.

Uma verificação documental intermediária detectou uma divergência semântica
entre o índice corrente, o runtime state e o JSON canônico de estado. Os três
foram alinhados e a verificação final acima passou; a tentativa intermediária
permanece preservada como [log superseded](AUD20-17-request-context-v2-docs-check-superseded-round2-20260924.log).
