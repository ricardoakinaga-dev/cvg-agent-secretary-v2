# Evidência — PLAT-S24 Controlled HTTP Parse and Payload Boundary

## Identificação

- sprint: `PLAT-S24_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY`
- task: `PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- registro: `2026-08-25T16:51:17-03:00`
- RED: `2026-08-25T16:54:19-03:00`
- GREEN inicial: `2026-08-25T16:55:23-03:00`
- crítica lead-only: `2026-08-25T16:55:56-03:00`
- correção/focused final: `2026-08-25T16:56:09-03:00`
- fechamento controlado: `2026-08-25T17:20:00-03:00`
- focused final revalidated: `2026-08-25T17:10:20-03:00`
- dados: fixtures e valores fictícios apenas; nenhum dado real foi usado

## Gap e escopo

Antes do lane, JSON inválido retornava o error handler padrão do Fastify com
status 500 e campos fora do envelope API. O `bodyLimit` não era declarado
explicitamente e falhas de media type/body excessivo não tinham contrato
redaction-safe.

O lane adiciona somente:

- `HTTP_REQUEST_BODY_LIMIT_BYTES = 1 MiB` no Fastify;
- parser JSON que converte parse failure em código conhecido;
- classificação constante para JSON inválido, media type não suportado,
  body excessivo e erro desconhecido;
- error handler global que retorna envelope com correlation ID server-generated;
- código de status 400/415/413/500 sem refletir mensagem, stack, cause,
  headers ou raw body.

Não houve alteração de autenticação, autorização, tenant, identidade, rotas de
negócio, Secretary, persistência, provider, canal, RAG ou side effect.

## TDD e crítica

- RED: import ausente de `http-request-boundary.ts`, antes do BUILD.
- GREEN: 6 testes focados cobrindo limite, classificação e os três caminhos de
  integração HTTP.
- Crítica: um error-like com getter defeituoso em `code` quebrava o classificador.
- Correção: leitura de `error.code` protegida por `try/catch`, com fallback
  `internal_error` genérico; focused intermediário 7/7. Um teste adicional
  cobriu erro não tratado de rota e o focused final revalidado passou 8/8.

## Gates executados

| Gate                           | Resultado                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| focused S24 final              | PASS — 1 arquivo/8 testes                                                              |
| `npm run verify`               | PASS — 102 arquivos/359 testes pass/18 skips; typecheck, lint, build e audit incluídos |
| coverage                       | PASS — statements 85,46%; branches 80,85%; functions 85,21%; lines 86,40%              |
| `npm run readiness`            | PASS — 1 arquivo/4 testes                                                              |
| `npm run test:e2e`             | PASS — 3/3 fluxos Playwright                                                           |
| `npm run test:postgres`        | PASS — 5 arquivos/51 testes pass/18 skips                                              |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                              |
| `git diff --check`             | PASS                                                                                   |
| startup smoke                  | PASS — exit 1 esperado e JSON de startup redigido                                      |

## Testes de boundary

- JSON inválido: HTTP 400, `validation_failed`, mensagem `Request body is
invalid`, envelope e `X-Correlation-Id` server-generated.
- Media type não suportado: HTTP 415, `unsupported_media_type`, mensagem
  constante e envelope; o parser não expõe conteúdo recebido.
- Body acima de 1 MiB: HTTP 413, `payload_too_large`, sem execução de handler,
  sem echo do body e sem detalhes do parser.
- Erro desconhecido/error-like defeituoso: HTTP 500,
  `Unexpected internal error`, sem acesso inseguro à metadata do erro.

## Resultado e limites

`PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY` =
`COMPLETED_CONTROLLED`. O quality bar CTRL-97..100 está `PASS controlled`.
O release controlado permanece `CONTROLLED_MVP_READY`; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

O lane não entrega upload, multipart, streaming, logger distribuído, retenção,
IdP, tenant binding operacional, provider/canal, RAG, dado real, deploy ou
side effect. A revisão independente física não esteve disponível; a crítica
foi lead-only com testes RED/GREEN e gates executáveis.
