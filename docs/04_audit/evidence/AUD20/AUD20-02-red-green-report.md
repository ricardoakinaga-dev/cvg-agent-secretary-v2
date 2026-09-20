# AUD20-02 — RED/GREEN do piso de eval

**Programa:** `AUD20-REM`
**Task:** `AUD20-02`
**Escopo:** BUILD local controlado, dataset sintético determinístico, Node `22.23.2`
**Candidato:** `0de51135ea4b0422aede9d45af2d7062f67951753fe93c3346114276f250aff5`
**Commit:** `41b7ea13f57b6629dbe054e8fec64af120f7bdbb`
**Tree:** `4af049f58afc0918db897bdacd980b48266147d008a6e55aaa28deb76f16e26e`
**Receipt SHA-256:** `463a8ed9a38391518b65cc3960e507144130ed37615dcf15e76625c8fd8e3b74`

## Objetivo

Impedir que `runEvalSuite` aceite threshold abaixo do contrato `0,97` ou
valores que possam ser convertidos/coagidos para fabricar um PASS. Overrides
podem apenas aumentar mínimos ou reduzir máximos.

## RED

Antes da implementação, os cinco testes novos do runner falharam com `exit 1`:

- override `taskSuccessRate=0,85` retornava `PASS` com score perfeito;
- `NaN`, ausência, string e valor arredondado abaixo do contrato também
  retornavam `PASS`.

O RED reproduziu o bypass de `P1-EVAL-01` sem alterar o dataset ou usar dados
reais.

## Implementação

- `packages/agent-evals/src/runner.ts` valida domínio, finitude e presença do
  corpus, das rates e das métricas auxiliares;
- compara cada threshold na direção correta e rejeita overrides menos estritos;
- expõe `thresholdFailures` no relatório sem reduzir a barra;
- `scripts/lib/eval-contract.mjs` aplica os seis thresholds também ao
  certificador/verifier;
- fixtures formais foram alinhados ao contrato vigente sem alterar a barra.

## GREEN e regressão

| Verificação | Resultado |
| --- | --- |
| focused eval + contrato + mutation sentinel + fixture formal | `4 arquivos / 52 testes PASS` |
| `npm run test:evals` | `2 arquivos / 23 testes PASS` |
| `node scripts/phase11-2-redteam.mjs --suite=certification` | `9/9 PASS` |
| `npm run typecheck` | `PASS` |
| `npm run lint` | `PASS` |
| `npm run format:check` | `PASS` |
| `npm run build` | `PASS` |
| `npm test` | `282 arquivos PASS, 12 SKIP; 2.171 testes PASS, 172 SKIP` |
| `npm run test:coverage` | `PASS`; statements `91,68%`, branches `87,53%`, functions `89,55%`, lines `92,26%` |

O relatório sintético fresco `certification/agent-eval-report.json` tem SHA-256
`7b9ba9f3f666ffe914dc589df18b06b150546444b4d6b024dacf45232a503824`, `56/56`,
`taskSuccessRate=1`, threshold `0,97`, zero policy violation, zero unsafe action
e `thresholdFailures=[]`.

## Negativos

- `AUD20-N01`: `53/56` com override `0,85` falha no runner; o certificador
  rejeita threshold e score abaixo do contrato; o red-team mantém os checks
  `FALSE-GO-EVAL-THRESHOLD-REDUCED` e `FALSE-GO-EVAL-SUCCESS-BELOW-CONTRACT`.
- `AUD20-N02`: `NaN`, missing, string, rates fora do domínio, corpus vazio,
  métricas auxiliares não finitas e arredondamento abaixo de `0,97` falham
  fechado no runner; métricas e thresholds inválidos falham no certificador.

## Limitações e fronteiras

- Coverage de functions global `89,55%` não fecha o gate final; denominador,
  coverage final e required gates pertencem a AUD20-12.
- `certification/current.json` continua histórico/stale e não foi re-selado.
- Não houve PostgreSQL, Docker, Playwright, provider, canal, IdP, RAG,
  egress, staging, produção, dado real ou efeito externo.

**Veredicto da task:** `AUD20-02=COMPLETED` somente em BUILD local controlado.
**Manifesto e comandos:** `AUD20-02-candidate-manifest.json` e
`AUD20-02-command-receipt.json` contêm a saída completa do candidato e os
comandos executados.

**Próxima ação:** `AUD20-03` com RED/GREEN de lineage/concorrência e negativos
`AUD20-N03/N04`.
