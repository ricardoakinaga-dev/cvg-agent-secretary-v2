# Evidência — PLAT-S46 correlação única da execução controlada

## Identificação

- task: `PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- timestamp de registro: `2026-08-26T10:33:24-03:00`
- timestamp de fechamento: `2026-08-26T11:22:54-03:00`
- owner: `platform/observability/agent-core`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

## Discovery

A inspeção local reproduziu três identidades independentes no caminho
controlado: `executeConfiguredAgent` cria o `traceId` somente ao montar o trace
final; `PlatformEventBus.emit` cria `event.id` novo para cada lifecycle event; e
`CapabilityGateway.execute` cria `correlationId` novo para cada tool. Portanto,
hooks e auditorias de uma mesma execução não compartilham uma relação parental
estável enquanto a pipeline está em andamento.

## Contrato aprovado para BUILD

O `traceId` canônico será resolvido antes do primeiro evento e propagado como
parent bounded da execução para o event bus, hooks, gateway, tool audit,
Test Lab, runtime publicado e sinks. `event.id` e a correlação local da
invocação continuarão distintos e não serão sobrescritos. A validação será
fail-closed e não aceitará header/body externo, grant, tenant ou payload como
autoridade.

## Critérios de auditoria

- [x] uma execução resolve exatamente um `traceId` válido;
- [x] todos os eventos/hooks da execução carregam a mesma referência;
- [x] todas as auditorias de tools da execução carregam a mesma referência;
- [x] `traceId` injetado inválido falha antes de evento, provider ou tool;
- [x] sinks in-memory/PostgreSQL preservam a referência sem payload novo;
- [x] regressão, cobertura, typecheck, lint, readiness, worker smoke, E2E,
      PostgreSQL, audit, build, format e diff check permanecem verdes;
- [x] crítica independente read-only é registrada quando o runtime permitir.

## Limites

Somente correlação parental local do trace controlado. Nenhum OTel/exporter,
tracing distribuído, broker, rede, provider/canal real, RAG, deploy, dado real,
ação clínica/financeira, segredo ou side effect.

## RED observado

Antes do BUILD, o focused executou 4 arquivos/33 testes: 8 falhas esperadas e
25 testes pass. A regressão reproduziu que não havia parent trace único nos
eventos/tools e que um `traceId` injetado inválido não falhava na entrada.
Nenhuma operação externa ocorreu.

## GREEN e verificação controlada

O focused de fechamento passou 6 arquivos/25 testes. A implementação resolve o
trace antes do primeiro evento, propaga a mesma referência por Test Lab,
event-bus, hooks, runtime publicado, gateway, approval e sinks, e preserva
`event.id` e `correlationId` como identidades locais distintas. Validação
inválida ocorre antes de lookup, provider, handler, evento ou transação.

Gates finais: `npm test` passou 126 arquivos, com 2 skipped; 523 testes pass e
19 skipped. Coverage: 85,07% statements, 80,06% branches, 85,95% functions e
86,10% lines. PostgreSQL controlado passou 8 arquivos/72 testes; readiness
4/4; worker startup smoke; E2E 4/4; build 70 módulos; `npm audit` encontrou 0
vulnerabilidades; typecheck, lint, format e `git diff --check` passaram.

## Auditoria independente e limites

A crítica independente compatível read-only retornou `PASS` sem P0/P1/P2 nos
fluxos de handoff, approval, runtime publicado e validação pré-transação. Uma
tentativa especializada incompatível com a conta não foi tratada como
aprovação. Os achados acionáveis da revisão anterior foram convertidos em
regressões e corrigidos.

S46 fecha somente a correlação parental local bounded. Não houve OTel/exporter,
tracing distribuído, broker, rede, provider/canal real, RAG, deploy, dado real,
segredo, ação clínica/financeira ou side effect. O próximo passo é uma nova
`DISCOVERY -> PRD -> SPEC` controlada; produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.
