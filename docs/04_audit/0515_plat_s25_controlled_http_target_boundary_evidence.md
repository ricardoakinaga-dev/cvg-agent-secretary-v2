# Evidência — PLAT-S25 Controlled HTTP Request-Target Boundary

## Identificação

- sprint: `PLAT-S25_CONTROLLED_HTTP_TARGET_BOUNDARY`
- task: `PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- registro: `2026-08-25T17:26:43-03:00`
- RED: `2026-08-25T17:30:16-03:00`
- GREEN focado: `2026-08-25T17:32:34-03:00`
- crítica lead-only/RED de regressão: `2026-08-25T17:35:16-03:00`
- correção/retest focado: `2026-08-25T17:38:16-03:00`
- fechamento controlado: `2026-08-25T17:47:28-03:00`
- dados: fixtures, tokens fictícios e valores controlados apenas

## Gap e escopo

Antes do lane, uma rota desconhecida retornava o 404 padrão do Fastify,
incluindo o request-target completo na mensagem. Um request-target de 200 KiB
também era aceito no ambiente de teste sem um limite explícito local.

O lane adiciona somente:

- `HTTP_REQUEST_TARGET_LIMIT_BYTES = 8192`, medido em bytes UTF-8 do target
  bruto;
- `routerOptions.maxParamLength = 100` explícito no Fastify;
- `setNotFoundHandler` com envelope 404 `not_found`, mensagem constante e
  correlation ID server-generated;
- rejeição 414 `request_uri_too_long` para path/query acima do limite, sem echo;
- códigos/status HTTP mantidos no contrato de erro compartilhado.

Não houve alteração de body/parser S24, autenticação, autorização, tenant,
identidade, Secretary, persistência, provider, canal, RAG, dado real ou side
effect.

## TDD e crítica

1. RED: a suíte focada foi executada antes do BUILD e falhou porque
   `http-target-boundary.ts` ainda não existia; nenhum PASS amplo foi inferido.
2. GREEN: a implementação mínima passou 8/8, cobrindo limites explícitos,
   classificação por byte, 404, método desconhecido, path/query longo, target
   válido e parâmetro excessivo.
3. Crítica lead-only: o verify revelou que o teste S22 ainda esperava 404 raw
   sem correlation header, incompatível com o novo envelope seguro.
4. Correção: o teste passou a exigir paridade envelope/header no 404 e a
   preservar preflight 204 sem header; focused S25 + correlation passou 14/14.

Child agent independente não esteve disponível por limite de capacidade/modelo;
nenhuma aprovação independente foi inferida.

## Gates executados

| Gate                           | Resultado                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| focused S25 final              | PASS — 1 arquivo/8 testes                                                                      |
| focused S25 + correlation      | PASS — 2 arquivos/14 testes                                                                    |
| `npm run verify`               | PASS — 103 arquivos/367 testes pass/18 skips; typecheck, lint, build e audit incluídos         |
| coverage                       | PASS — statements 85,41%; branches 80,76%; functions 85,24%; lines 86,42%                      |
| `npm run readiness`            | PASS — 1 arquivo/4 testes                                                                      |
| `npm run test:e2e`             | PASS — 3/3 fluxos Playwright                                                                   |
| `npm run test:postgres`        | PASS — 5 arquivos/51 testes pass/18 skips                                                      |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                                      |
| `git diff --check`             | PASS                                                                                           |
| startup smoke                  | PASS controlado — exit 1 esperado e somente JSON startup redigido                              |
| target smoke                   | PASS — rota desconhecida 404 envelopada; target longo 414 envelopado, sem path/query refletido |

## Evidência de boundary

- Rota desconhecida: HTTP 404, código `not_found`, mensagem `Route not found`,
  envelope completo e `X-Correlation-Id` igual a `meta.correlationId`.
- Método desconhecido: mesma resposta segura, sem refletir query ou segredo.
- Path/query acima de 8192 bytes: HTTP 414, código `request_uri_too_long`,
  mensagem constante e nenhum trecho do target na resposta.
- Target dentro do limite: `/health?probe=controlled` permanece HTTP 200.
- Parâmetro acima de 100: não alcança handler de negócio e o 404 não reflete o
  valor recebido.
- Preflight 204 continua sem correlation header; o 404 agora é envelope por
  contrato e possui correlação server-generated.

## Resultado e limites

`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` = `COMPLETED_CONTROLLED`.
Quality bar CTRL-101..104 = `PASS controlled`. O release controlado permanece
`CONTROLLED_MVP_READY`; produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

O lane não entrega limite de headers do host, proxy/edge, query semantics de
negócio, IdP, tenant binding operacional, limiter distribuído, upload,
streaming, provider/canal, RAG, retenção, dado real, deploy ou side effect.
