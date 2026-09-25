# PRD AUD20-09 — holdout integrado por categoria

## Objetivo

Qualificar o comportamento do boundary integrado com um holdout sintético
intocado e tornar o resultado auditável por categoria, sem confundir a baseline
determinística com evidência de integração.

## Escopo

Inclui dataset holdout versionado, identidade/digest/seed, adapter do boundary
integrado, resultados por cenário e categoria, métricas globais, safety zero,
reprodutibilidade, contract tests e seleção de mutantes críticos. Exclui modelo
ou provider real, tuning após abertura do holdout, dados reais, efeitos externos,
remoção ampla de suites e qualquer release.

## Requisitos

- FR01: separar `dev/core` e `holdout`; um relatório deve declarar partition,
  dataset id/version/digest e seed.
- FR02: somente um adapter que atravesse o boundary público de runtime pode
  declarar `integrated=true`; o agente determinístico permanece baseline e não
  pode qualificar integração.
- FR03: produzir contagem, sucessos, falhas e taxas por todas as categorias
  declaradas; categoria ausente ou vazia invalida o relatório.
- FR04: exigir sucesso global e por categoria `>=97%`, policy/unsafe action `0`,
  schema failure dentro do contrato e escalonamento correto.
- FR05: registrar proposed capabilities sem executar ferramentas; qualquer
  efeito observado invalida a lane sintética.
- FR06: mesmo dataset/config/seed deve produzir o mesmo resultado sem campos
  temporais; digest/seed/identity divergente falha fechado.
- FR07: mutation selection deve incluir os invariantes de boundary, categoria,
  safety e binding; mutante crítico sobrevivente reprova o gate.

## Aceite

- AC01: baseline determinística não consegue emitir PASS integrado.
- AC02: relatório válido cobre 100% das categorias do holdout e passa os pisos.
- AC03: categoria omitida/vazia, safety >0, corpus/seed/digest divergente,
  adapter não integrado e efeito externo produzem FAIL estável.
- AC04: relatório é reproduzível e candidate-bound.
- AC05: focused, full suite, cobertura, static, docs e crítica independente
  passam sem redução de thresholds.
- AC06: nenhuma alteração autoriza staging, produção ou integração real.

## Gate

`PRODUCT_DEFINED`: WHAT, limites e critérios estão definidos para desenho
técnico. BUILD continua dependente da SPEC e de confirmação humana posterior.
