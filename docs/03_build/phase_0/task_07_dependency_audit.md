# Phase 0 Task 07 — Dependency Audit

## Objetivo

Controlar vulnerabilidades antes de codigo funcional.

## Arquivos a modificar

- `package.json`
- `package-lock.json`
- `docs/04_audit/0430_enterprise_readiness_audit.md`
- `docs/30_backlog_master.md`

## Comandos

```bash
npm audit --audit-level=high
npm outdated
npm test
```

## Regras

- Nao usar `npm audit fix --force` sem task especifica.
- High ou critical bloqueia Phase 0.
- Moderate pode seguir apenas com item de backlog e justificativa.
- Toda atualizacao de dependencia deve rodar `npm test`, `npm run typecheck` e `npm run lint`.

## Criterio de aceite

- Nao ha high/critical aberto.
- Vulnerabilidades moderadas possuem backlog.
- Lockfile esta consistente.
