# PLAT-S32 — evidência de pinning controlado por sessão

## Identificação e veredito

- task: `PLAT-S32-001_CONTROLLED_SESSION_AGENT_VERSION_PINNING`
- sprint: `PLAT-S32`
- data: `2026-08-25`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- resultado: `COMPLETED_CONTROLLED`
- release controlado: `CONTROLLED_MVP_READY`
- release com dados reais: `NO-GO / WAITING_HUMAN_APPROVAL`
- dados e efeitos: somente fixtures; zero provider/canal/side effect externo

## Lacuna reproduzida antes do BUILD

O runtime resolvia a publicação corrente em todos os turnos. Depois de publicar
v2, uma continuação da sessão iniciada em v1 podia executar v2. O RED focado de
2026-08-25T20:38:26-03:00 confirmou 5 falhas em 12 testes: a continuação
selecionava v2, `executePublishedAgent` ignorava `versionId`, o binding em
memória não existia e a migration 0008 estava ausente.

## Entrega auditada

- `SessionRecord` agora aceita o par opcional `agentId`/
  `agentVersionId`; o par é sempre completo ou ausente.
- A migration aditiva `0008_session_agent_version_pin.sql` adiciona colunas,
  constraint de par, FKs compostas tenant-aware e índice bounded. Não há
  backfill automático.
- O repository em memória faz binding monotônico por cópia defensiva; troca
  de par retorna `conflict` sem mutação.
- O repository PostgreSQL usa `BEGIN`, `FOR UPDATE`, validação de tenant e
  commit único; o wrapper de pool executa na conexão com contexto tenant.
- O runtime passa a usar a versão pinned e permite apenas `PUBLISHED` ou
  `ARCHIVED` do mesmo agente/tenant. Pinning inválido falha fechado.
- O modo legacy baseado em `0000_initial`, sem as colunas novas, permanece
  explícito e não tenta fingir pinning tenant-scoped.
- Foi adicionada prova browser/API de publish v1 → publish v2 → continuation.
- O gate PostgreSQL revelou e corrigiu uma incompatibilidade pré-existente em
  `0007_audit_evidence_checkpoint.sql`: `jsonb_object_length` não existe no
  PostgreSQL 16; a contagem agora usa `jsonb_path_query_array`.

## Matriz de aceite

| Critério                                  | Evidência                                                               | Resultado       |
| ----------------------------------------- | ----------------------------------------------------------------------- | --------------- |
| CTRL-123 — nova sessão fixa uma vez       | testes memory/API, binding idempotente e traces                         | PASS controlled |
| CTRL-124 — v1 continua após publish v2    | integração Vitest e `tests/e2e/session-version-pinning.spec.ts`         | PASS controlled |
| CTRL-125 — tenant, par completo e corrida | CAS memory/PostgreSQL, `FOR UPDATE`, FKs/RLS e teste cross-tenant       | PASS controlled |
| CTRL-126 — pinning inválido fail-closed   | schema/status/agent mismatch, sem fallback/provider/tool                | PASS controlled |
| CTRL-127 — regressão do produto           | suíte completa, readiness, E2E, PostgreSQL, cobertura, lint/build/audit | PASS controlled |

## Gates executados

| Comando/gate                                           | Resultado                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| focused GREEN S32                                      | 4 arquivos; 12 testes pass                                         |
| regressão próxima                                      | 3 arquivos; 34 testes pass; 10 skips condicionais                  |
| `npm test`                                             | 111 arquivos pass; 2 skipped; 402 testes pass; 19 skipped          |
| `npm run test:coverage`                                | statements 85,01%; branches 80,37%; functions 85,11%; lines 85,99% |
| `npm run readiness`                                    | 1 arquivo; 4 testes pass                                           |
| `npm run test:e2e`                                     | 4 fluxos Playwright pass                                           |
| `npm run test:postgres`                                | 8 arquivos; 71 testes pass; PostgreSQL 16 fixture controlada       |
| `npm run typecheck` / `npm run lint` / `npm run build` | PASS                                                               |
| `npm run format:check` / `git diff --check`            | PASS                                                               |
| `npm audit --audit-level=high`                         | 0 vulnerabilidades                                                 |

O PostgreSQL foi executado contra o container de teste local com schemas
efêmeros e tenants fictícios. Nenhum banco, segredo ou canal real foi usado.

## Auditoria de segurança e limites

O binding não aceita substituição, não atravessa tenant, não aceita par parcial
e não converte `ARCHIVED` em publicação ativa. A FK composta impede associar a
sessão a agente/versão de outro tenant; `FOR UPDATE` serializa o primeiro
binding no PostgreSQL. Uma falha de leitura, status ou identidade não seleciona
outra versão e não finaliza o inbound como sucesso.

Este fechamento não autoriza IdP/RBAC real, backfill de sessões, rollout RLS,
worker distribuído, provider, canal, RAG, agenda, ação clínica/financeira,
prontuário, dados reais ou efeitos externos. Permanecem os bloqueios do audit
técnico final e a necessidade de decisão humana para qualquer release real.

## Limitação de revisão

Não havia runtime de subagentes disponível nesta sessão. A revisão foi
lead-only, compensada por RED/GREEN reproduzível, inspeção do diff, testes
negativos, PostgreSQL real de teste, Playwright, cobertura, lint, build,
auditoria de dependências e verificação dos documentos canônicos. Nenhuma
aprovação independente é declarada.
