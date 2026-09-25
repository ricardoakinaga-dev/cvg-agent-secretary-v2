# AUD20-17-FU1 / IMP50-40 — relatório BUILD local query-parser

- data: `2026-09-23`;
- SPEC aprovada: 7.398 bytes, SHA-256
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`;
- estado: BUILD local controlado concluído; AC01–AC06 da PRD 0033 e crítica
  independente final `PASS` para este slice;
- task-mãe: `AUD20-17` permanece `IN_PROGRESS`.

## Mudança

Os sete parsers/schema/lista de query passaram a ter ownership em
`apps/api/src/server/request-query.ts`. `server.ts` importa o módulo e não
mantém cópias locais; handlers e contratos públicos permanecem no servidor.
Foram adicionados testes diretos e assertions arquiteturais. Cinco arquivos
de teste de rota na allowlist passaram a conferir mensagem HTTP e envelope de
erro exatos. A crítica de implementação v1 pediu essas assertions e testes de
limite adicionais; a correção ficou restrita a testes autorizados.

## Caps e verificações

| Medida | Resultado | Cap | Estado |
| --- | ---: | ---: | --- |
| `server.ts` | 4.622 linhas | 4.708 | PASS |
| `request-context.ts` | 258 linhas | 450 | PASS |
| `request-query.ts` | 138 linhas | 160 | PASS |
| Total dos três módulos | 5.018 linhas | 5.050 | PASS |

Sob Node `22.23.2`, os recibos registram:

- testes focados: 7 arquivos, 43 testes aprovados;
- `npm test`: 289 arquivos aprovados, 12 ignorados; 2.252 testes aprovados,
  192 ignorados, 2.444 no total;
- coverage: statements 90,83%, branches 86,99%, functions 89,25%, lines
  91,43%;
- typecheck, lint, format:check, docs:check e `git diff --check`: PASS;
- docs:check: 1.218 links e 615 JSONs válidos; estado semântico válido.

Logs brutos e hashes dos arquivos estão em
[AUD20-17-query-raw-20260923](AUD20-17-query-raw-20260923/). Os arquivos dos
quais depende o parecer final estão listados em
[candidate-final-audit.sha256](AUD20-17-query-raw-20260923/candidate-final-audit.sha256).
O aceite técnico local específico da fatia está registrado na
[crítica final v3](AUD20-17-query-final-critic-v3-20260923.md); a crítica de
evidência intermediária e seu fechamento constam na
[crítica v2](AUD20-17-query-evidence-critic-v2-20260923.md).

## Rollback e limites

O ensaio de rollback isolado teve resultado `PASS_ISOLATED`: parser original e
owners foram reconstruídos em uma cópia temporária; os bytes do slice
request-context permaneceram idênticos. O rollback não foi aplicado ao
worktree compartilhado.

O request-context foi incluído somente como parte do candidato integrado para
medição de caps e regressão. A crítica e a aprovação query-parser não alteram
seu status previamente não aceito. O resultado da primeira fatia continua
registrado separadamente em
[AUD20-17-v1-build-report](AUD20-17-v1-build-report-20260923.md); não se declara
aceite retroativo. `AUD20-17` permanece em andamento até disposição própria
dessa fatia e do restante de seus critérios.

Sem dados reais, PostgreSQL configurado, serviços externos, staging, produção,
commit, push ou deploy. Os skips das suítes estão discriminados nos recibos.
