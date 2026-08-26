# Evidência de auditoria — PLAT-S12 prompt profile e templates

## Identificação

- task: `PLAT-S12-001_PROMPT_PROFILE_TEMPLATE_CONTROL_CENTER`
- observado em: `2026-08-25T08:41:18-03:00`
- fase: `AUDIT / CONTROLLED_CONSTRUCTION`
- escopo: editor JSON controlado sobre `AgentVersion`, proteção fail-closed de
  prompt blocks, templates operacionais seguros, checksum/status no trace e
  Test Lab dry-run
- dados: somente fixtures e valores fictícios

## Resultado

`COMPLETED_CONTROLLED` — `CONTROLLED_MVP_READY` permanece o resultado máximo.
`PRODUCTION_REAL_DATA_READY` continua `NO-GO` / `WAITING_HUMAN_APPROVAL`.

Nenhum provider, canal, RAG institucional, migration, dado real, ação clínica,
financeira ou de prontuário, dispatch externo ou side effect foi adicionado.

## Aceite e evidência

| Critério                                                                                    | Evidência atual                                                                                                                      | Resultado       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `CTRL-36` parser/editor valida JSON, shape, limites, ids, duplicidade, protótipo e segredos | `packages/platform/src/__tests__/prompt-profile.test.ts`, `apps/web/src/features/platform/prompt-profile.test.ts`, UI Control Center | PASS controlado |
| `CTRL-37` blocks system/safety/kernel e locks protegidos fail-closed                        | `assertPromptProfileIntegrity`, `assertPromptProfileClone`, clone API negativo e preservação `locked`                                | PASS controlado |
| `CTRL-38` cada edição cria snapshot imutável                                                | `InMemoryControlPlaneStore`, repository PostgreSQL, API clone e regressão de versões                                                 | PASS controlado |
| `CTRL-39` templates operacionais não substituem hard safety                                 | Test Lab para `low_confidence`, `no_knowledge`, `handoff`, scheduling e medicamento/bloqueio                                         | PASS controlado |
| `CTRL-40` checksum/status/version são determinísticos e trace-visible                       | checksum SHA-256, trace `prompt`, Test Lab, client e Trace Viewer                                                                    | PASS controlado |
| `CTRL-41` boundary existente permanece verde                                                | suíte, coverage, build, readiness, E2E, PostgreSQL controlado, audit e diff check                                                    | PASS controlado |

## Procedimentos executados

- `npm test`: 77 arquivos pass, 279 testes pass, 16 skips condicionais.
- `npm run verify`: PASS agregado (format, typecheck, lint, build, testes,
  coverage e audit).
- `npm run test:coverage`: 84,92% statements; 80,30% branches; 85,76%
  functions; 85,87% lines.
- `npm run typecheck`, `npm run lint`, `npm run format:check` e
  `git diff --check`: PASS.
- `npm run build`: typecheck e build web Vite PASS.
- `npm run readiness`: 4/4 PASS.
- `npm run test:e2e`: 1/1 fluxo Playwright PASS.
- `npm run test:postgres`: 49 testes PASS e 16 skips condicionais por ausência
  de `TEST_DATABASE_URL`; nenhum skip foi contado como infraestrutura real.
- `npm run audit:security`: 0 vulnerabilidades.

## Revisão e limitações

A crítica foi lead-only e temporalmente separada da implementação, com RED/GREEN,
inspeção de diff, testes de boundary, revisão de segurança e gates executáveis.
Child agents não estavam disponíveis no runtime; nenhuma aprovação independente
é reivindicada.

Os bloqueios de produção permanecem: IdP/tenant binding/RBAC operacional,
RLS/backfill e change control, secret manager/providers/canais reais, host
security, limiter/replay/HA distribuídos, retenção/PII, knowledge institucional,
coordenação multioperador e decisões humanas para piloto ou ações sensíveis.
