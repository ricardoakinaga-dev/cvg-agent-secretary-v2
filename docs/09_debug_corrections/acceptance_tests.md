# Acceptance Tests - Debug Corrections

## Suite obrigatoria final

Executar ao final de todas as tasks:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:coverage
npm run audit:security
npm run readiness
npm run verify
```

## PostgreSQL efemero obrigatorio

Executar contra Docker `postgres:16-alpine` ou servico equivalente:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:<PORT>/cvg_test npm run test:postgres
```

Regras:

- Resultado com teste real pulado nao conta.
- A evidencia deve informar numero de arquivos e testes executados.
- O banco deve ser descartavel.

## HTTP smoke obrigatorio

Executar API local em porta livre:

```bash
PORT=<PORT> npx tsx apps/api/src/main.ts
curl -fsS http://127.0.0.1:<PORT>/health
curl -fsS -X POST http://127.0.0.1:<PORT>/v1/webhooks/channels/whatsapp/messages \
  -H 'content-type: application/json' \
  -d '{"externalMessageId":"debug-smoke-1","senderRef":"fixture-sender","body":"Mensagem de smoke","receivedAt":"2026-04-29T20:00:00-03:00"}'
```

Aceite:

- `/health` retorna `success=true`.
- Webhook retorna `success=true`.
- Webhook retorna `accepted=true`.
- Resposta contem `conversationId` e `sessionId`.

## Validacao de rastreabilidade

`npm test` deve falhar se `docs/03_build/0304_traceability_matrix.json` apontar para arquivo de teste inexistente.

## Validacao de console

O console web deve:

- carregar lista de conversas por API;
- mostrar empty state sem conversas;
- selecionar conversa existente quando houver dados;
- carregar timeline e auditoria sem IDs hardcoded.

## Validacao de idempotencia

PostgreSQL deve impedir duplicidade real de inbound por `channel + externalMessageId`.

Aceite minimo:

- primeira mensagem retorna `accepted=true`;
- segunda mensagem com mesmo canal e mesmo `externalMessageId` retorna `accepted=false`;
- o banco nao cria segunda conversa/mensagem para a duplicidade;
- teste roda contra PostgreSQL real efemero.
