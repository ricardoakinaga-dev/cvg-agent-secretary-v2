# Task 03 - Web Conversation Listing

## ID

DBG-COR-03

## Prioridade

P0

## Status

COMPLETED — 2026-04-29T20:10:37-03:00

## Finding relacionado

- DBG-F04

## Objetivo

Remover IDs fixos do console web e conectar o painel a uma listagem real de conversas da API.

## Arquivos permitidos

- `apps/api/src/server.ts`
- `apps/api/src/__tests__/health.test.ts`
- `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- `apps/web/src/api/client.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/__tests__/app.test.tsx`
- testes web criados na task 02, se necessario

## Contrato de API esperado

Adicionar endpoint:

```txt
GET /v1/conversations
```

Resposta envelope:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "conv_x",
        "channel": "whatsapp",
        "senderRef": "fixture-sender",
        "status": "active",
        "createdAt": "2026-04-29T00:00:00.000Z",
        "updatedAt": "2026-04-29T00:00:00.000Z",
        "openSessionId": "sess_x"
      }
    ]
  },
  "error": null,
  "meta": {
    "correlationId": "corr_x"
  }
}
```

## Passos

1. Criar teste de API para `GET /v1/conversations` em modo memory.
2. Criar teste de API para `GET /v1/conversations` em modo PostgreSQL.
3. Implementar listagem no repository in-memory.
4. Implementar listagem no `PostgresRuntimeRepository`.
5. Atualizar `apiClient` com `listConversations`.
6. Atualizar `App.tsx` para:
   - buscar conversas;
   - selecionar primeira conversa quando existir;
   - carregar timeline pela conversa selecionada;
   - carregar audit pelo `latestSessionId`;
   - mostrar empty state real quando nao houver conversa.
7. Remover `conv_demo_controlled` e `sess_demo_controlled` do runtime.

## Resultado

- `GET /v1/conversations?limit=25&offset=0` implementado com `items` e `pageInfo`.
- Repositories in-memory e PostgreSQL listam conversas com `openSessionId`, ultima mensagem e metadados de auditoria.
- Console web carrega listagem pela API e usa selecao de conversa para timeline/audit.
- Testes cobrem memory, PostgreSQL e ausencia de fallback para IDs fixos no runtime.

## Testes

```bash
npm test
npm run test:e2e
npm run verify
```

## Definition of Done

- `rg "conv_demo_controlled|sess_demo_controlled" apps` nao encontra uso em runtime.
- API lista conversas em memory e PostgreSQL.
- Web console nao depende de ID fixo.
- Empty state sem conversa e testado.
- E2E critico continua passando.
