# 0494 — PLAT-S03 tenant isolation evidence

## Escopo e decisão

Esta evidência registra o gate controlado de `PLAT-S03-001`: isolamento tenant no data plane PostgreSQL legado, sem dados reais, provider real, canal real, backfill irreversível ou ativação de produção. O resultado máximo permitido é `CONTROLLED_MVP_READY`; `PRODUCTION_REAL_DATA_READY` permanece não autorizado.

## Implementação verificada

- `0001_tenant_isolation.sql` é migration posterior à `0000_initial`, com checksum e baseline legado explícito por `scripts/baseline-postgres.ts`.
- Auditoria e outbox limpam qualquer `tenant_id` pré-preenchido antes do remapeamento. Somente relações existentes de sessão/conversa/agente/version são autoridade; `payload.tenantId` é apenas claim não confiável.
- Claims divergentes, rows nulas, rows sem relação autoritativa e relações contraditórias entram em `tenant_isolation_quarantine`, permanecem ocultos por `FORCE ROW LEVEL SECURITY` e não podem ser alterados pela role runtime.
- As 14 tabelas legadas protegidas usam `ENABLE/FORCE RLS` e uma policy `PERMISSIVE` exata com `USING` e `WITH CHECK` tenant-bound; o startup rejeita policy ausente, extra ou permissiva. A tabela adicional de approvals do PLAT-S04 tem sua própria policy e preflight.
- A role runtime é não-superusuária, sem `BYPASSRLS`, ownership, DDL, `DELETE`, `TRUNCATE` ou acesso à tabela de quarentena. A role migration é separada, não-superusuária, sem memberships/flags administrativas, e proprietária somente do DDL gerenciado.
- A conexão tenant-scoped define e limpa `cvg.tenant_id`, restaura/verifica `search_path` e destrói a conexão se o cleanup falhar.
- Os leitores de auditoria em memória e PostgreSQL não usam `payload.tenantId` como fallback de autorização; sem sessão autoritativa, a evidência é omitida.

## Gates executáveis

Resultados registrados nesta rodada:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run verify`: PASS no fechamento da rodada de código, com format, typecheck, lint, build, 61 arquivos, 207 testes aprovados e 11 skips condicionais; cobertura agregada de 86,06% statements, 80,36% branches, 86,78% functions e 87,26% lines; audit sem vulnerabilidades.
- `npm run test:postgres` com PostgreSQL 16 efêmero em `127.0.0.1:55437`: PASS, 5 arquivos, 42/42 testes.
- O fixture real cobre tenant A/B, `FORCE RLS`, contexto resetado, migration checksum, baseline aprovado, role migration separada, startup com `POSTGRES_AUTO_MIGRATE=true`, claims claim-only, nulos, `tenant_id` pré-preenchido, claims divergentes, relações contraditórias, invisibilidade em ambas as tabelas, tentativa de mutação, rerun e preservação da quarentena.
- `npm run readiness`: PASS, 1 arquivo e 4 testes.
- `npm run test:e2e`: PASS, 1 fluxo Playwright.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.

## Revisão independente e correções

- Noether e Epicurus encontraram P1s no catálogo RLS, role runtime, checksum/baseline e evidência de backfill; esses pontos foram corrigidos com guard semântico exato, role DML-only, checksum fail-closed, baseline explícito e fixture real.
- Aquinas encontrou P1 na confiança indevida em claims de auditoria/outbox, ausência de role migration verificada e cobertura incompleta de quarentena; a migration foi alterada para remapear somente por relações autoritativas, a role migration passou a ser validada antes do auto-migrate e os testes reais foram ampliados.
- A rechecagem independente pós-correção do boundary S03 não encontrou P0/P1 reproduzível no fixture; os achados de mapeamento autoritativo, roles, checksum/baseline e quarentena foram corrigidos e repetidos nos gates acima.

## Limites

Este documento não autoriza aplicar a migration em banco de produção. Ainda faltam plano de backfill e rollback sob change control, IdP tenant-bound, provisionamento/rotação operacional das roles, retenção/PII, limiter distribuído e store de replay distribuído, issuer operacional de approval, providers/canais reais, conflitos multioperador e decisão humana para qualquer dado ou side effect real.

## Addendum — preflight e baseline reforçados

Na rodada final, o startup passou a exigir não apenas o nome das relações, mas também a presença das colunas, constraints, índices, `ENABLE/FORCE RLS`, policy exata e grants `SELECT/INSERT/UPDATE` da role runtime. A role runtime mantém vedados `DELETE`, `TRUNCATE`, `TRIGGER`, `REFERENCES`, ownership, DDL, memberships administrativas e acesso à quarentena; a tabela de replay é tratada separadamente com o mínimo necessário para sua retenção.

O baseline legado também verifica `relkind='r'`, colunas requeridas e índices requeridos antes de registrar a aprovação do checksum. O fluxo de runtime usa `messages.runtime_status` para que falhas parciais não sejam confundidas com duplicatas já concluídas. A evidência continua limitada à fixture fictícia e não substitui backfill, change control, rollback ou signoff de infraestrutura real.
