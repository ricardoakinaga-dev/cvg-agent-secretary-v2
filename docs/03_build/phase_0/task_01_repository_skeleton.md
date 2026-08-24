# Phase 0 Task 01 — Repository Skeleton

## Objetivo

Criar a arvore base do monorepo sem comportamento funcional.

## Arquivos e diretorios a criar

- `apps/api/`
- `apps/worker/`
- `apps/web/`
- `packages/shared/`
- `packages/persistence/`
- `packages/agent-core/`
- `packages/policy/`
- `packages/tools/`
- `packages/workflows/`
- `packages/adapters/`
- `packages/memory/`
- `packages/rag/`

## Arquivos proibidos nesta task

- Qualquer rota HTTP funcional.
- Qualquer workflow LangGraph funcional.
- Qualquer adapter real.
- Qualquer schema de banco alem de placeholder documentado.

## Testes obrigatorios

- Criar ou atualizar `tests/repository-structure.test.js`.

## Comandos

```bash
npm test
```

## Criterio de aceite

- A arvore criada corresponde a `0305_repository_target_structure.json`.
- Teste falha se um package obrigatorio faltar.
- Nenhum modulo implementa regra de produto.
