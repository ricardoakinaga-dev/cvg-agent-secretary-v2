# Task 04 - PostgreSQL Idempotency Hardening

## ID

DBG-COR-04

## Prioridade

P0

## Finding relacionado

- DBG-F05

## Objetivo

Garantir idempotencia de inbound por `channel + externalMessageId` no banco, nao apenas em consulta previa de aplicacao.

## Arquivos permitidos

- `packages/persistence/migrations/0000_initial.sql`
- `packages/persistence/src/postgres.ts`
- `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
- `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- `docs/03_build/0312_controlled_construction_sprint_02.md`

## Estrategia tecnica recomendada

Preferir uma destas abordagens:

1. Adicionar `channel` em `messages` e criar `UNIQUE (channel, external_message_id)`.
2. Ou usar tabela `idempotency` de forma transacional com chave `inbound:<channel>:<externalMessageId>`.

A abordagem escolhida deve:

- ser protegida por constraint ou chave primaria;
- funcionar em transacao;
- retornar duplicate sem criar nova conversa;
- permitir auditoria clara.

## Passos

1. Criar teste PostgreSQL que falhe com duplicidade por mesmo canal e mesmo `externalMessageId`.
2. Criar teste de contrato para canal diferente, se a regra permitir o mesmo `externalMessageId` em canais diferentes.
3. Ajustar migration.
4. Ajustar `PostgresRuntimeRepository.createWithSession`.
5. Garantir rollback sem registros parciais.
6. Executar teste contra PostgreSQL efemero real.

## Testes

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:<PORT>/cvg_test npm run test:postgres
npm run verify
```

## Definition of Done

- Duplicate em mesmo canal retorna `accepted=false`.
- Banco nao cria segunda conversa/mensagem para duplicidade.
- Constraint ou idempotency table protege concorrencia.
- Teste roda contra PostgreSQL real efemero sem skip.
