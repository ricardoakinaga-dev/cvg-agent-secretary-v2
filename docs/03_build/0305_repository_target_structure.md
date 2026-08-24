# 0305 — Repository Target Structure

## Objetivo

Definir a arvore exata que o executor deve construir. Qualquer arquivo fora desta arvore exige task nova antes de ser criado.

## Raiz esperada

```txt
cvg-agent-secretary-v2/
├── apps/
│   ├── api/
│   ├── worker/
│   └── web/
├── packages/
│   ├── shared/
│   ├── persistence/
│   ├── agent-core/
│   ├── policy/
│   ├── tools/
│   ├── workflows/
│   ├── adapters/
│   ├── memory/
│   └── rag/
├── tests/
│   ├── docs-readiness.test.js
│   └── e2e/
├── docs/
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── tsconfig.typecheck.json
├── .github/workflows/verify.yml
├── eslint.config.js
├── .prettierrc.json
├── .gitignore
└── .env.example
```

## Arquivos obrigatorios por package

Cada package em `packages/*` deve ter:

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/__tests__/index.test.ts`

## Arquivos obrigatorios por app

`apps/api`:

- `package.json`
- `tsconfig.json`
- `src/main.ts`
- `src/server.ts`
- `src/routes/health.ts`
- `src/routes/webhooks.ts`
- `src/routes/conversations.ts`
- `src/routes/approvals.ts`
- `src/routes/tasks.ts`
- `src/routes/audit.ts`
- `src/__tests__/health.test.ts`

`apps/worker`:

- `package.json`
- `tsconfig.json`
- `src/main.ts`
- `src/worker.ts`
- `src/jobs/process-agent-turn.ts`
- `src/jobs/process-outbox-event.ts`
- `src/__tests__/worker.test.ts`

`apps/web`:

- `package.json`
- `tsconfig.json`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/api/client.ts`
- `src/features/conversations/`
- `src/features/approvals/`
- `src/features/tasks/`
- `src/features/audit/`
- `src/__tests__/app.test.tsx`

## Packages e responsabilidades congeladas

- `packages/shared`: ids, enums, Zod schemas, envelopes, erros, pagination, env schema.
- `packages/persistence`: Drizzle schema, migrations, repositories, transaction boundary, outbox.
- `packages/agent-core`: commands, sessions, agent runs, state transitions, audit hooks.
- `packages/policy`: autonomy level, decisions, safety rules, approval requirement.
- `packages/tools`: tool registry, tool contracts, local implementations, idempotency.
- `packages/workflows`: LangGraph workflows for intent, tutor/pet, triage, scheduling draft, handoff, institutional QA.
- `packages/adapters`: channel/system adapter interfaces and local fake adapters.
- `packages/memory`: approved memory facts and retrieval interfaces.
- `packages/rag`: institutional source interface and blocked/noop implementation until source approval.

## Regras de dependencia

Permitido:

- `apps/api` importa `shared`, `agent-core`, `policy`, `persistence`.
- `apps/worker` importa `shared`, `agent-core`, `workflows`, `tools`, `policy`, `memory`, `persistence`.
- `apps/web` importa apenas tipos de `shared` e chama HTTP API.
- `agent-core` importa `shared`, `persistence`, `policy`.
- `workflows` importa `shared`, `tools`, `policy`.
- `tools` importa `shared`, `adapters`, `policy`.
- `persistence` importa `shared`.

Proibido:

- `apps/web` importar `tools`, `persistence` ou `agent-core`.
- `workflows` acessar banco diretamente.
- `tools` chamar provider externo sem adapter.
- `api` acessar tabela diretamente fora de repository.
- Qualquer package importar arquivo de `apps/*`.

## Estrutura tecnica em JSON

A versao machine-readable desta arvore esta em `docs/03_build/0305_repository_target_structure.json`.
