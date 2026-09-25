# AUD20-02 — RED/GREEN do piso de eval

**Programa:** `AUD20-REM`
**Task:** `AUD20-02`
**Escopo:** BUILD local controlado, dataset sintetico deterministico, Node `v22.23.2`
**Candidato:** `e0c06990996e661ee383d32c8d89463d15dc9088104ccb913d22af731ea28f09`
**Commit:** `25434811334f5cec92ee0741079302271b82b7cb`
**Tree:** `49ffa1af7231daa614b4eb5018919e87ab7aabea066ea249b500f7ea9a86f584`
**Receipt SHA-256:** `9bb44d052ac2bfd17ed00784c1bf01681a4d92ea0182a57d4e6972eaa26a3cd4`

## Objetivo

Impedir que `runEvalSuite` aceite threshold abaixo do contrato `0,97`,
corpus reduzido/sem cobertura adversarial ou valores que possam ser
convertidos/coagidos para fabricar um PASS. O caminho direto do certificador
tambem rejeita metrica fora do threshold declarado.

## RED

Antes da implementacao anterior, os testes de threshold falharam com `exit 1`.
A critica fresca tambem reproduziu dois bypasses adicionais:

- override `taskSuccessRate=0,85` retornava `PASS` com score perfeito;
- `NaN`, ausencia, string e valor arredondado abaixo do contrato retornavam
  `PASS`;
- uma fatia nao vazia do corpus e uma metrica abaixo do threshold declarado
  podiam atravessar o caminho direto como `PASS`.

O RED reproduziu o bypass de `P1-EVAL-01` sem alterar o dataset ou usar dados
reais.

## Implementacao

- `packages/agent-evals/src/runner.ts` valida dominio, finitude, corpus
  canonico, digest, cobertura adversarial, rates e metricas auxiliares;
- compara cada threshold na direcao correta e rejeita overrides menos estritos;
- `scripts/lib/eval-contract.mjs` exige os treze campos metricos, o corpus
  canonico, os seis thresholds de contrato, a satisfacao dos thresholds
  declarados e `verdict=PASS`;
- `scripts/lib/certification-rules.mjs` aplica a mesma rejeicao aos dados
  auxiliares e ao threshold explicito de escalation;
- fixtures formais e red-team foram alinhados ao contrato vigente sem alterar a
  barra.

## GREEN e regressao

| Verificacao | Resultado |
| --- | --- |
| focused eval + contrato + mutation sentinel + fixture formal | `5 arquivos / 64 testes PASS` |
| `npm run test:evals` | `2 arquivos / 24 testes PASS` |
| `node scripts/phase11-2-redteam.mjs --suite=all` | `19/19 PASS` |
| `npm run typecheck` | `PASS` |
| `npm run lint` | `PASS` |
| `npm run format:check` | `PASS` |
| `npm run build` | `PASS` |
| `npm test` | `282 arquivos PASS, 12 SKIP; 2.175 testes PASS, 172 SKIP` |
| `npm run test:coverage` | `PASS`; statements `91,68%`, branches `87,53%`, functions `89,56%`, lines `92,26%` |

O relatorio sintetico fresco `certification/agent-eval-report.json` tem SHA-256
`d21e8ccf08d51b78c0826679ddee10b85eac988147e51ae72356c57cafab8f7d`, `56/56`,
`taskSuccessRate=1`, threshold `0,97`, zero policy violation, zero unsafe
action e `thresholdFailures=[]`.

## Negativos

- `AUD20-N01`: `53/56` com override `0,85` falha no runner; o certificador
  rejeita threshold, score abaixo do contrato e evidencia incompleta; o
  red-team mantém os checks de false-go.
- `AUD20-N02`: `NaN`, missing, string, rates fora do dominio, corpus
  vazio/reduzido, digest divergente, cobertura adversarial ausente, verdict
  ausente, metricas auxiliares nao finitas e arredondamento abaixo de `0,97`
  falham fechado no runner/certificador/verifier.

## Limitacoes e fronteiras

- Coverage de functions global `89,56%` nao fecha o gate final; denominador,
  coverage final e required gates pertencem a AUD20-12.
- `certification/current.json` continua historico/stale e nao foi re-selado.
- Nao houve PostgreSQL, Docker, Playwright, provider, canal, IdP, RAG, egress,
  staging, producao, dado real ou efeito externo.

**Veredicto da task:** `AUD20-02=READY_FOR_NEXT_STEP` somente em BUILD local
controlado; critica independente fresca ainda e necessaria.
**Manifesto e comandos:** `AUD20-02-candidate-manifest.json` e
`AUD20-02-command-receipt.json` contem a saida completa do candidato e os
comandos executados.

**Proxima acao:** critica independente fresca do pacote corrente; se emitir
`PACKAGE_READY`, executar `AUD20-03` com RED/GREEN de lineage/concorrencia e
negativos `AUD20-N03/N04`.
