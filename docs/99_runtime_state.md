# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-agent-secretary-v2
- current_engine: AUDIT

## POSICAO ATUAL

- current_phase: CONTROLLED_CONSTRUCTION
- current_sprint: PLAT-S04_DURABLE_APPROVAL_WEBHOOK_RUNTIME_SECURITY
- current_task: PLAT-S04-001_TO_003_DURABLE_APPROVAL_WEBHOOK_RUNTIME_RELIABILITY

## STATUS

- status: READY_FOR_NEXT_STEP

## PROGRESSO

- last_completed_action: PLAT-S04 fechou approval capability durável single-consume, retry idempotente de inbound, finalização PostgreSQL atômica, input-hash/nonce/expiry/revocation, HMAC sobre raw body, purge/lease recovery de replay, tenant/agente binding de bootstrap, resolver de operador obrigatório e preflight estrutural de schema/grants/baseline; o Git local foi inicializado na branch main, o origin foi configurado e o snapshot controlado foi publicado no GitHub.
- next_action: aguardar decisão humana/infraestrutura para IdP tenant-bound, backfill/rollout RLS real, stores distribuídos, host security, retenção/PII e provider/canal; qualquer próxima construção deve permanecer em fixture e ser registrada antes do BUILD.

## BLOQUEIOS

- blockers: nenhum bloqueio para o MVP controlado; produção real permanece bloqueada por IdP/tenant binding, backfill e rollout do data plane legado sob change control, role/secrets operacionais, limiter e replay store distribuídos, CSRF/CORS/HTTPS/CSP do host, retenção/PII, auditoria de side effects, conflitos otimistas do control plane multioperador e decisões humanas de RAG, cargos, canais, providers e ações sensíveis

## DECISAO HUMANA

- human_decision_required: no
- human_decision_required_for_real_release: yes
- decision_description: o gate controlado está concluído; qualquer piloto real, produção, dado real, RAG, agenda, financeiro, clínico, prontuário, canal ou automação sensível exige decisão humana e infraestrutura aprovada

## TIMESTAMP

- last_update: 2026-08-24T16:19:45-03:00

## REGRAS DE USO

- Sempre ler antes de executar qualquer acao.
- Sempre atualizar apos executar.
- Nunca encerrar sem atualizar estado.
- Usar apenas status oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL, COMPLETED.

## FECHAMENTO CONTROLADO PLAT-S04 — 2026-08-24

- current_task: `PLAT-S04-001_TO_003_DURABLE_APPROVAL_WEBHOOK_RUNTIME_RELIABILITY`
- status: `READY_FOR_NEXT_STEP`
- current_engine: `AUDIT`
- last_completed_action: retry idempotente de inbound com `pending/completed`, finalização PostgreSQL atômica, HMAC sobre raw body, purge de replay expirado, bootstrap tenant-bound, approval issuer/executor separado, consumo com `approval_decision` transacional e preflight estrutural de schema/grants/baseline.
- evidence: `docs/04_audit/0494_plat_s03_tenant_isolation_evidence.md`, `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`
- gates: `npm test` 62 arquivos/225 testes/14 skips; coverage 85,58% statements, 80,17% branches, 86,66% functions, 86,48% lines; PostgreSQL fixture 6 arquivos/63 testes; typecheck, lint, format, build, audit, readiness e E2E PASS.
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL`
- blockers: IdP/tenant/agente/operator binding operacional, backfill/rollout RLS, roles/secrets reais, HA/observabilidade de replay e limiter distribuídos, host security, retenção/PII, provider/canal, compensação de side effects, concorrência multioperador e qualquer agenda/clínica/financeiro/prontuário real.

## REVALIDAÇÃO FINAL CONTROLADA — 2026-08-24T15:42:25-03:00

- P1 pós-revisão fechado: produção agora exige runtime/agente confiável, tenant binding e `operatorIdentityResolver`; replay PostgreSQL recupera lease `reserved` stale após 30s; `test:postgres` inclui teste real da store com purge, concorrência, commit/release e recovery.
- Resultado máximo: `CONTROLLED_MVP_READY`.
- Produção real: `WAITING_HUMAN_APPROVAL`; startup permanece fail-closed até IdP, roles/secrets, HA/observabilidade, host security, retenção/PII e change control.
