# Phase 0 — Implementation Order

## Regra

Executar exatamente nesta ordem. Nao iniciar uma task enquanto a anterior nao estiver `DONE` no tracking JSON.

## Ordem deterministica

1. `task_00_build_docs_baseline.md`
2. `task_01_repository_skeleton.md`
3. `task_02_npm_workspaces.md`
4. `task_03_typescript_baseline.md`
5. `task_04_quality_gates.md`
6. `task_05_security_env_baseline.md`
7. `task_06_ci_local_and_tracking.md`
8. `task_07_dependency_audit.md`

## Comandos por checkpoint

Depois de cada task:

```bash
npm test
```

Depois da Task 4:

```bash
npm run typecheck
npm run lint
npm run test:coverage
```

Depois da Task 7:

```bash
npm audit --audit-level=high
```

## Bloqueio

Se qualquer comando falhar, marcar a task como `FAILED_VERIFICATION` e nao prosseguir.
