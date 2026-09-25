# PRD AUD20-10 — observabilidade operacional conectada

## Objetivo e escopo

Conectar sinais já existentes ao runtime local, emitir latência real de
approval e provar detecção→correlação→entrega→fechamento em exercício sintético.

Inclui configuração explícita de collector local para API/worker, redaction,
correlation/trace IDs, `approval_latency_ms`, avaliação das regras, canal local
de entrega auditável e relatório temporal. Exclui serviço externo, pager real,
dados reais, SLO/owner inventados e release.

## Requisitos

- FR01: API e worker devem aceitar collector controlado opt-in e permanecer
  seguros quando desabilitado ou indisponível.
- FR02: `approval_latency_ms` deve medir `decidedAt-requestedAt` no caminho real,
  sem valor negativo, label de alta cardinalidade ou payload sensível.
- FR03: logs, spans e métricas exportados devem preservar correlação permitida
  e eliminar mensagem, token, objetivo e PII.
- FR04: regras existentes devem consumir o export real e produzir estado
  `firing|ok|no_data` determinístico.
- FR05: entrega local deve registrar rule, severidade, correlation, timestamps
  de detecção/ack/fechamento e nunca alegar pager externo.
- FR06: exercício sintético deve atravessar wiring de runtime e provar pelo
  menos uma detecção e um fechamento.
- FR07: owner/SLO permanecem `PENDING_HUMAN_APPROVAL`; thresholds locais são
  propostas, não compromisso operacional.

## Aceite

- AC01: caminho API→worker→runtime exporta sinais correlacionados no collector.
- AC02: approval real sintético produz `approval_latency_ms` calculada.
- AC03: canary/PII nunca aparece no sink ou entrega.
- AC04: sinal ausente, trace quebrada, sink falho e entrega falha produzem FAIL
  explícito; não há falso fechamento.
- AC05: relatório contém timestamps ordenados de detectar, reconhecer e fechar.
- AC06: focused/full/coverage/static/docs e crítica independente passam.
- AC07: sem owner/SLO humano, resultado máximo é local e `releaseEligible=false`.

## Gate

`PRODUCT_DEFINED`: comportamento e limites definidos; BUILD requer SPEC e
confirmação humana explícita.
