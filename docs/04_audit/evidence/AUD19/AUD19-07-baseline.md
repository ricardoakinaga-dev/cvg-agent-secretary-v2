# AUD19-07 — Baseline de hotspots e barra congelada

- Programa: `AUD19-REM`; task: `AUD19-07` (P2-MAINT-01 da auditoria 0566).
- Data da medição: 2026-09-20.
- Commit inspecionado: `99dffff71c768bc7741e373a5fb19bcf08ef4702` (worktree com alterações de outras lanes preservadas; nenhum commit feito por esta task).
- Método: `wc -l <arquivo>` no worktree local; nenhum número é estimado nesta evidência.

## Medição antes (baseline real)

| Arquivo                                         | Linhas (`wc -l`) | Bytes | `export` | declarações top-level |
| ----------------------------------------------- | ---------------: | ----: | -------: | --------------------: |
| `apps/api/src/server.ts`                        |             6215 |   203 KB |       17 |                    51 |
| `packages/persistence/src/postgres.ts`          |             4221 |   140 KB |       24 |                    40 |
| `apps/worker/src/kernel-composition.ts`         |             1900 |    65 KB |       26 |                    20 |
| `packages/agent-runtime/src/composition.ts`     |              340 |    11 KB |       19 |                     4 |

Observação: a auditoria 0566 citava "~6.158" e "~4.219" linhas; a contagem real no
worktree é `6215` e `4221`. O baseline desta task usa os valores medidos.

Hotspots-alvo desta fatia: `server.ts` e `postgres.ts`. `kernel-composition.ts` e
`composition.ts` permanecem intactos (fronteira ADR 0001) e a decomposição deles fica
registrada como pendência na ADR 0002.

## Barra de aceitação congelada (antes do código)

1. **Sem mudança de contrato**: todos os símbolos exportados de `server.ts` e
   `postgres.ts` antes da extração continuam exportados depois (snapshot em
   `tests/architecture.test.js`), e nenhum símbolo novo é adicionado a esses dois
   arquivos.
2. **Movimentação mecânica**: os módulos extraídos preservam o comportamento; nenhuma
   mensagem de erro observável, threshold ou assinatura de rota é alterada.
3. **Hotspots não crescem**: `wc -l` pós-extração de `server.ts` e `postgres.ts` deve
   ser `<=` o baseline acima.
4. **Architecture tests executáveis** (`tests/architecture.test.js`, sem dependência
   nova):
   - nenhum import de `langgraph`/`@langchain/*` fora de
     `packages/agent-runtime/src/composition.ts` (fronteira ADR 0001);
   - nenhum import profundo entre workspaces (`packages/x/src/...`, `apps/x/src/...`,
     `@cvg/x/src`, ou caminho relativo que escapa do pacote) — exceções justificadas
     listadas no próprio teste;
   - nenhum ciclo de import **de runtime** dentro de um pacote; ciclos apenas de tipo
     pré-existentes ficam em allowlist congelada e documentados na ADR 0002;
   - cada módulo extraído declara responsabilidade única em comentário curto;
   - snapshot de exports antes/depois preservado.
5. **Verificação obrigatória (Node 22.23.2)**: `tsc -p tsconfig.typecheck.json
   --noEmit`, `eslint`/`prettier` nos arquivos alterados, testes focados de
   `apps/api` (server/identity/tenant), `kernel-composition-state`,
   `packages/persistence` unit (sem `TEST_DATABASE_URL`) e o novo
   `tests/architecture.test.js`.
6. **Negativo embutido**: o teste de exports falha se qualquer símbolo público for
   removido; o teste de ciclos falha se um novo ciclo de runtime for introduzido; o
   teste de LangGraph falha se qualquer arquivo fora da fronteira importar o pacote.
7. **Fora de escopo/rollback**: nenhum caminho legacy é removido; nenhum arquivo de
   `certification/**`, `package.json`, `docs/99`, `docs/20`, `docs/30` ou
   `scripts/lib/phase11-rules.mjs` é tocado. Rollback = reverter apenas os arquivos
   listados na evidência final (git checkout dos arquivos novos/alterados desta task).

## Escopo de arquivos permitido

- Novos: `apps/api/src/server/*.ts`, `packages/persistence/src/postgres/*.ts`,
  `tests/architecture.test.js`, `docs/02_spec/adr/0002-*.md`,
  `docs/04_audit/evidence/AUD19/AUD19-07-*.md`.
- Alterados: `apps/api/src/server.ts`, `packages/persistence/src/postgres.ts`,
  `vitest.config.mts` (somente exclusão de cobertura dos adaptadores PostgreSQL
  extraídos, mantendo o denominador de cobertura neutro).
