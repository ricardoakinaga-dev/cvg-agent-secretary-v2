# Phase 0 Task 05 — Security and Env Baseline

## Objetivo

Criar baseline de seguranca para impedir segredo hardcoded e uso acidental de dados reais.

## Arquivos a criar

- `.env.example`
- `packages/shared/src/env.ts`
- `packages/shared/src/__tests__/env.test.ts`

## Variaveis obrigatorias em `.env.example`

```txt
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/cvg_agent_secretary_v2
OPENAI_API_KEY=replace_me
ENABLE_REAL_CHANNELS=false
ENABLE_REAL_RAG=false
ENABLE_REAL_PAYMENTS=false
ENABLE_REAL_MEDICAL_RECORDS=false
```

## Regras

- `ENABLE_REAL_*` deve defaultar para `false`.
- Env schema deve falhar fechado quando `DATABASE_URL` faltar.
- `OPENAI_API_KEY=replace_me` e valor placeholder permitido; segredo real proibido.
- Nenhum teste pode usar dado real de tutor, pet, telefone ou prontuario.

## Testes obrigatorios

- `packages/shared/src/__tests__/env.test.ts`

## Comandos

```bash
npm test
npm run typecheck
```

## Criterio de aceite

- Env invalido falha com erro seguro.
- Flags reais ficam desativadas por padrao.
- Varredura simples por segredo nao encontra chave real.
