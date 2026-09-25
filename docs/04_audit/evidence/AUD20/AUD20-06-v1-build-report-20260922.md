# AUD20-06 — relatório de BUILD/AUDIT v1

- execução: `CONTROLLED_LOCAL`
- ambiente: Node `22.23.2`
- dados: somente fixtures sintéticas
- staging/produção: `NO_GO`
- release eligible: `false`

## Resultado

O certifier geral passa a exigir `independent_critic` e `mutation_sentinel`.
O catálogo de nove mutantes possui digest canônico ancorado no código; o
report de mutação é ligado a candidate/commit/tree, freshness, catálogo,
targets, testes focados e resultados observados. O verifier reabre os reports
empacotados e rejeita divergência em relação aos inputs autoritativos.

## Evidência executada

- RED inicial: ausência de `mutation_sentinel` na lista requerida falhou como
  esperado.
- focused final: `5` arquivos / `40` testes PASS.
- mutation sentinel integral: `9/9` detectados, zero gaps e zero
  `not_applicable`, com `--fail-on-gaps`.
- regressão integral: `285` arquivos / `2.217` testes PASS; `192` skips
  condicionais.
- cobertura: statements `90,83%`, branches `86,99%`, functions `89,16%`,
  lines `91,42%`.
- typecheck, lint, format, docs-check e `git diff --check`: PASS.
- pacote Phase 11 histórico/stale foi rejeitado pelo verifier, inclusive por
  gate/report ausentes e candidato divergente.

## Crítica e correções

A primeira crítica independente retornou `FAIL`: exigiu identidade realmente
distinta, âncora imutável para o catálogo, prova semântica de execução de cada
mutante, inclusão do raw report e comparação do critic empacotado. Os quatro
controles foram implementados. A v2 ainda demonstrou um report forjado baseado
somente em exit code autodeclarado; o raw report foi então ligado pelo SHA-256
ao log do subprocesso e passou a exigir contagens reais de testes ou timeout.

## Limites e rollback

Rollback consiste em reverter apenas runner/rules/verifier/testes; relatórios
históricos não são reescritos. Nenhum commit, push, deploy, dado real,
integração externa ou ação sensível foi executado.
