# AUD19-05 — mapa de dados persistidos por classificação e lifecycle

- Programa: `AUD19-REM` (auditoria `docs/04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md`, achado `P1-DATA-01`).
- Task: `AUD19-05` (backlog `docs/03_build/0332_aud20260919_backlog.md`).
- Escopo desta rodada: ambiente local, PostgreSQL descartável (`127.0.0.1:5434/cvg_test`, PG 16.15), fixtures sintéticas marcadas; nenhum dado real.
- Worktree de referência: `9848ec0` + alterações não commitadas da rodada (documentais do solicitante e de tasks AUD19 concorrentes).
- Mecanismo implementado: `packages/persistence/src/retention.ts` (manual, sem side effect de import).
- Ledger/holds: migration aditiva `packages/persistence/migrations/0025_retention_ledger.sql` (`retention_holds`, `retention_erasure_ledger`).

## Decisões aprovadas usadas (nenhuma política nova foi inventada)

| Decisão | Conteúdo aprovado | Uso nesta task |
| --- | --- | --- |
| D05-3/4 (`prod20260913_decision_packet.md` §Registros emitidos, APPROVED 2026-09-13) | Retenção do journal/deduplicação 30 dias; TTL inbound 30 dias; `UNCERTAIN` nunca expira automaticamente; purga nunca permite duplicação | TTL default operacional de 30 dias (`DEFAULT_RETENTION_TTL_DAYS`), `UNCERTAIN` em `neverExpireStates`, alvos `effect_journal` e `inbound_idempotency` |
| D02 (APPROVED 2026-09-13) | Drafts draft-only com TTL 24h; sem confirmação/reagendamento/cancelamento reais | Registrado como limite dos drafts de jornada; mecanismo não os altera (purga/minimização exigem decisão específica) |
| D04 (APPROVED 2026-09-13) | Integrações reais bloqueadas; fixtures locais | Nenhum provider/canal tocado; dados 100% sintéticos |

Observação de autoridade: o próprio pacote registra que D05-3/4 veio de resposta explícita do solicitante humano da sessão, sem nome/cargo formal; ratificação nominal segue recomendada. Ativação operacional do sweep continua `WAITING_HUMAN_APPROVAL` (ver §Pendências).

## Catálogo executável (fechado em código, sem identificadores dinâmicos)

| Alvo | Tabela | Colunas sensíveis/relevantes | Classificação conservadora | Ação suportada | Estado | Política |
| --- | --- | --- | --- | --- | --- | --- |
| `effect_journal` | `effect_journal` | `proposal_hash`, `execution_ref`, `result_digest`, `reason`, `reconciliation_evidence_ref`; estados `UNCERTAIN`/`RESERVED`/`EFFECT_STARTED` protegidos | INTERNAL | delete | executável | **D05-3/4 aprovado** (30d, terminal; `UNCERTAIN` nunca) |
| `inbound_idempotency` | `idempotency` | `key` (hash de identidade inbound), `resource_id` | INTERNAL | delete | executável | **D05-3/4 aprovado** (TTL inbound 30d) |
| `runtime_approvals` | `runtime_approvals` | `proposal_payload`, `continuation_payload`, `decision_reason`, tokens de reserva | CONFIDENTIAL | redact | executável | pendente de aprovação humana |
| `orchestrator_goals` | `orchestrator_goals` | `objective`, `planner_context`, `success_criteria`, `last_reason`, `last_error`, `execution_snapshot` | CONFIDENTIAL | redact (default) / delete | executável | pendente de aprovação humana |
| `outbox_events` | `outbox_events` | `payload` (já sanitizado `outbox-r6`), `last_error` | CONFIDENTIAL | redact | executável | pendente de aprovação humana |

Propriedades do mecanismo: fail-closed (alvo sem declaração aprovada não é tocado e gera pendência no ledger), idempotente (segunda execução reporta 0), tenant-scoped (filtro explícito + RLS + verificação de `cvg.tenant_id`), legal hold explícito e auditável, minimização por substituição de campos, TTL ancorado em `retentionDaysFor(classification)` como teto, relógio injetável e ledger só com metadados (alvo, política, janela, contagens e `batch_hash` sha256). O sweep é manual (`runTenantRetentionSweep`); nenhum worker/chamada de import o executa.

## Mapa completo das tabelas persistidas

Classificação usa a taxonomia compartilhada (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `CLINICAL`, `FINANCIAL`, `CREDENTIAL`); valores são conservadores e devem ser ratificados pelo owner da política.

| Tabela | Payload persistido relevante | Classificação conservadora | Lifecycle hoje | Status AUD19-05 |
| --- | --- | --- | --- | --- |
| `conversations` | `sender_ref` (telefone já redigido na escrita), `sender_ref_hash`, `correlation_id` | CONFIDENTIAL | nenhum expurgo | pendente de política |
| `messages` | `body` (segredos/e-mail redigidos na escrita), `external_message_id`, `runtime_approval_id`, `runtime_trace_id` | CONFIDENTIAL / CLINICAL possível | `runtime_status` terminal, sem expurgo | pendente de política |
| `sessions` | `takeover_state`, vínculo agente/versão | INTERNAL | nenhum | segue decisão de mensagens |
| `agent_runs` | `status` | INTERNAL | nenhum | pendente |
| `tool_calls` | `input`/`output` jsonb (podem conter dado clínico/financeiro) | CLINICAL/FINANCIAL possível | nenhum | pendente; candidato a minimização |
| `approval_requests` | `proposed_action`, `summary` | CONFIDENTIAL | nenhum | pendente |
| `tasks` | `title`, `description` | INTERNAL | nenhum | pendente |
| `audit_events` | `payload` jsonb sanitizado | evidência de auditoria | append-only | nunca purgado pelo mecanismo; retenção pendente |
| `idempotency` | chave hash de identidade inbound | INTERNAL | nenhum | **executável** (`inbound_idempotency`, D05-3/4) |
| `outbox_events` | `payload` r6, `last_error` sanitizado | CONFIDENTIAL | nenhum | **executável** (redact em `processed`; aprovação pendente) |
| `outbox_attempts` | `error` redigido | INTERNAL | nenhum | segue decisão do outbox |
| `outbox_effects` | `result` r6 | INTERNAL | nenhum | segue decisão do outbox |
| `outbox_quarantine` | forensic de ownership legado | INTERNAL | nenhum | não purgar antes de revisão de ownership |
| `effect_journal` | identidade/digests de efeito | INTERNAL | nenhum | **executável** (D05-3/4) |
| `channel_effect_journal` | `result` jsonb (id externo/canal), `payload_hash` | INTERNAL | nenhum | D05-3/4 aplicável, mas identidade composta `(tenant, channel, kind, key)` ainda não suportada pelo catálogo — decisão técnica pendente |
| `runtime_approvals` | `proposal_payload`, `continuation_payload`, `decision_reason` | CONFIDENTIAL | nenhum | **executável** (redact terminal; aprovação pendente) |
| `runtime_audit_events` | `payload` + cadeia de hash | evidência de auditoria | append-only, hash chain | nunca purgado automaticamente; política de cadeia pendente |
| `audit_evidence_checkpoints` | filtros, `event_ids`, `evidence_digest` | evidência de auditoria | append-only | pendente |
| `orchestrator_goals` | `objective`, `planner_context`, `success_criteria`, `execution_snapshot`, `last_reason/last_error` | CONFIDENTIAL | nenhum | **executável** (redact default; aprovação pendente) |
| `orchestrator_plans` | `reason` (texto livre) | CONFIDENTIAL | cascade com goal | segue decisão do goal |
| `orchestrator_steps` | `description`, `input`, `expected_outcome`, `intent`, `last_error` | CONFIDENTIAL | cascade com goal | segue decisão do goal |
| `orchestrator_attempts` | worker/lease/correlação | INTERNAL | cascade com goal | segue decisão do goal |
| `orchestrator_observations` | `evidence` jsonb, `result_digest` | CONFIDENTIAL | cascade com goal | segue decisão do goal |
| `orchestrator_evaluations` | `criteria`, `evidence`, `reason` | CONFIDENTIAL | cascade com goal | segue decisão do goal |
| `journey_owner_drafts` | `phone`, `name` | CONFIDENTIAL | `expires_at` + status `expired` (D02 24h), sem purga | pendente de mecânica de purga/minimização |
| `journey_patient_drafts` | `name`, `species` | CONFIDENTIAL | idem | pendente |
| `journey_appointment_drafts` | `slot`, `source_version` | INTERNAL | idem | pendente |
| `platform_test_runs` | `trace` jsonb (mensagens de modelo possíveis) | CONFIDENTIAL | nenhum | pendente |
| `platform_execution_traces` | `trace` jsonb | CONFIDENTIAL | nenhum | pendente |
| `platform_agents` / `platform_agent_versions` | `config` jsonb | INTERNAL | versionamento imutável | pendente (provável retenção longa de evidência de release) |
| `platform_knowledge_sources` | metadados de fonte RAG | INTERNAL/PUBLIC | fluxo de aprovação | pendente |
| `platform_release_candidates` | evidência de release jsonb | INTERNAL | imutável | pendente (evidência de release) |
| `platform_plugin_catalog` | manifest jsonb | INTERNAL | imutável | pendente |
| `platform_capability_approvals` | `nonce`, `input_hash`, `issuer` | INTERNAL | estados, sem expurgo | pendente |
| `platform_test_suites` / `platform_test_suite_runs` | definição/execução jsonb | INTERNAL | nenhum | pendente |
| `webhook_replay_events` | `event_key`, `status`, `expires_at` (sem `tenant_id`) | INTERNAL | coluna de expiração sem cleaner | pendente; alvo global não tenant-scoped |
| `retention_holds` (nova) | escopo do hold + autorização/aprovação | INTERNAL | `released_at` | suporte do mecanismo |
| `retention_erasure_ledger` (nova) | metadados do sweep + `batch_hash` (sem conteúdo) | INTERNAL | append-only | auditoria do mecanismo |
| `schema_migrations` | versão/checksum | INTERNAL | append-only | excluída (metadado de engenharia) |

## Pendências de decisão humana (nada foi presumido)

1. Aprovar (ou rejeitar) política de minimização/expiração para `orchestrator_goals` e lineage (`objective`, `planner_context`, `success_criteria`, filhos). `delete` de goal pode conflitar com FKs `ON DELETE RESTRICT` de `effect_journal`/`outbox_events`; a ordem de sweep e a disposição do lineage precisam de decisão.
2. Aprovar minimização de `outbox_events` após `processed` e o destino de `outbox_attempts`/`outbox_effects`/`outbox_quarantine`.
3. Aprovar minimização de `runtime_approvals` terminais e quais campos de decisão permanecem como evidência.
4. Definir retenção de evidência de auditoria (`audit_events`, `runtime_audit_events`, `audit_evidence_checkpoints`); `runtime_audit_events` é cadeia de hash — qualquer expurgo exige política chain-aware.
5. Definir retenção/mecânica para `messages`/`conversations`/`tool_calls` e drafts de jornada (D02 aprova TTL 24h, não a mecânica de purga/minimização).
6. Decidir o alvo `channel_effect_journal` (identidade composta) e o cleaner de `webhook_replay_events` (global, sem tenant).
7. Ratificar nominalmente a autoridade de D05-3/4 e designar o owner operacional que pode criar/release `retention_holds` e executar o sweep manual (quem, quando, com qual aprovação).
8. Decidir se o sweep será agendado no worker/futura topologia (AUD19-11/12) — hoje permanece manual por desenho.

## Limitações e riscos residuais

- O sweep roda em uma única transação: falha de um alvo faz rollback de tudo (fail-closed, sem eliminação parcial), sem savepoints por alvo.
- `delete` de `orchestrator_goals` pode ser bloqueado por lineage `ON DELETE RESTRICT`; `redact` é o default do catálogo.
- Holds protegem a identidade do alvo no catálogo (e o cascade no delete do goal), não linhas filhas individualmente.
- Sem limite de lote por alvo; volumes grandes executam em uma única instrução/transação.
- O ledger é append-only e cresce um registro por alvo do catálogo por execução (executado + pendências).
- A idempotência da minimização usa comparação com o marcador; se um escritor futuro regravar campo sensível em linha terminal, o sweep o reporta novamente.
- Testes usam PostgreSQL local descartável e fixtures sintéticas; nenhuma prova de produção/staging é alegada.

## Evidência de verificação

- `packages/persistence/src/__tests__/retention.test.ts` — 27 testes unitários (política/TTL/relógio sintético, fail-closed, idempotência, hold, minimização, ausência de conteúdo no ledger, hash de lote).
- `packages/persistence/src/__tests__/retention-postgres.test.ts` — 3 testes PostgreSQL reais (migration+checksum, tenant A/B + hold + idempotência, RLS/contexto).
- `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` — 9 testes (regressão das migrations existentes, incluindo 0025 no runner default).
- Resultados brutos e invariantes: `AUD19-05-execution-evidence.json` nesta pasta.
