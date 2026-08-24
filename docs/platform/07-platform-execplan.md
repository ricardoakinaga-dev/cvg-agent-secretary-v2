# ExecPlan — PLAT-S01 control plane foundation

## Estado

- stage: BUILD
- status: CONTROLLED_MVP_READY
- scope: `PLAT-FOUNDATION-001..014`
- next controlled scope: `PLAT-HARDENING-001..004` (`PLAT-S02`)
- owner: main runtime/platform
- write sets: `vitest.config.mts`; `vite.config.mts`; `packages/platform`; `packages/shared`; `apps/api`; `apps/web`; `packages/persistence`; testes correspondentes; docs de evidência

## Ordem de execução

1. Escrever testes vermelhos para resolver alias local e contratos de tenant/version.
2. Corrigir harness sem alterar comportamento do data plane.
3. Implementar schemas, store e máquina de versionamento.
4. Implementar composer, policy evaluator e gateway fake.
5. Implementar runtime dry-run/trace.
6. Integrar exports/tsconfig/package workspace.
7. Rodar testes focados, suíte completa, coverage, typecheck, lint, format, audit, readiness e E2E.
8. Fazer revisão independente de diff/segurança e corrigir os maiores gaps.
9. Atualizar runtime state, execution log, backlog e evidências.

## PLAT-S02 — ordem de hardening

1. Registrar testes vermelhos para clone/edit, approval, trace ownership e publish lock.
2. Implementar a rota de clone como operação de aplicação que só cria versão nova.
3. Tornar resposta de approval fail-closed e validar referências de trace no memory/PostgreSQL.
4. Serializar publish no PostgreSQL com lock transacional do agent.
5. Expor os campos completos e redigidos no Trace Viewer e cobrir o fluxo browser.
6. Rodar a suíte focada, suíte completa, coverage, typecheck, lint, format, audit, readiness, E2E e smoke PostgreSQL.

## Resultado da rodada controlada

O slice foi ampliado com provider dry-run, feature flags fail-closed por configuração de UI, Test Lab eval/regression, rollback consumível no Control Center, auditoria de mutações, tenant binding de identidade confiável, rate limiting, headers defensivos, build web e E2E de navegador. O audit de segurança permanece conservador: o resultado não é autorização de produção real.

O fechamento controlado acrescenta runtime publicado após inbound, histórico persistido de traces redigidos, Trace Viewer, scheduling determinístico pelo gateway, continuidade tenant-scoped e takeover humano transacional em memória/PostgreSQL. O bot permanece silencioso durante `HANDOFF_REQUESTED`, `HUMAN_ACTIVE` e `RESOLVED`, e só volta após `release_to_bot`.

## Stop conditions

Parar e registrar `WAITING_HUMAN_APPROVAL` se a implementação exigir segredo, dado real, chamada externa, alteração destrutiva, mudança de regra clínica/financeira ou decisão de RBAC/tenant real. Falha técnica é corrigida ou registrada como blocker reproduzível; nunca é mascarada.

## Resultado PLAT-S02

`PLAT-HARDENING-001..004` foram concluídos como `COMPLETED_CONTROLLED`: clone/edit versionado pela UI, approval fail-closed, ownership de trace, publicação PostgreSQL serializada e Trace Viewer redigido foram implementados e verificados. O resultado continua limitado a fixtures controladas; os bloqueios de produção real permanecem ativos.

## Evidência de conclusão

O task só pode virar `COMPLETED` com:

- arquivos alterados listados;
- testes RED/GREEN observados para o primeiro caso;
- resultado dos gates e ambiente usado;
- auditoria dos limites de produção;
- referência ao trace/run de Test Lab fictício;
- atualização dos documentos canônicos.

## PLAT-S03 — ordem de implementação

1. Registrar o task e escrever testes RED para migration versionada, políticas RLS e pool tenant-scoped.
2. Implementar o runner sequencial sem alterar o comportamento da `0000_initial`.
3. Implementar policy SQL aditiva com bloqueio fail-closed de linhas sem tenant seguro.
4. Implementar wrappers de runtime/control plane sobre conexão dedicada, com `cvg.tenant_id` e reset garantido.
5. Executar smoke PostgreSQL em schemas únicos e fictícios, incluindo tentativas cross-tenant.
6. Rodar verify, coverage, audit, readiness, E2E e revisão independente.

O resultado desta sprint não muda o boundary de release candidate e não autoriza backfill ou ativação em banco real.

O fechamento pós-auditoria adicionou retry idempotente de inbound com marcador `pending/completed`, finalização atômica em uma conexão PostgreSQL, HMAC sobre raw body, purge e recuperação de lease stale de replay, tenant/agente binding de bootstrap, resolver de operador obrigatório e separação issuer/executor de capability approval. O preflight de schema/role e o baseline legado agora verificam forma estrutural e privilégios, não apenas nomes.

## Resultado PLAT-S03

`PLAT-S03-001` fecha a fronteira controlada: migration `0001` com checksum, baseline legado somente por comando explícito aprovado, mapeamento histórico de auditoria/outbox somente por relação autoritativa, flags de quarentena persistente, policies RLS exatas com `FORCE`, preflight obrigatório de marker/catálogo, pool com `search_path` restaurado/verificado e contexto tenant resetado, role runtime sem ownership/DDL/DELETE/TRUNCATE/acesso à quarentena e role migration separada, não-superusuária e proprietária do DDL gerenciado. O fixture real cobre mismatch, claim não confiável e linhas nulas de auditoria/outbox, invisibilidade/imutabilidade/rerun da quarentena e startup com roles separadas. O status de release segue `CONTROLLED_MVP_READY`; produção real continua não autorizada.

## PLAT-S04 — ordem de implementação

1. Registrar schemas RED para approval issue/verify/revoke/consume e single-use por input hash/nonce.
2. Implementar repository in-memory para testes e migration PostgreSQL RLS para authority durável.
3. Integrar verifier fail-closed ao `CapabilityGateway`, preservando compatibilidade somente com approvals estruturados controlados.
4. Implementar adapter allowlist-only do `ToolRegistry` para `find_available_slots` com `dryRun=true`; bloquear todo outro handler.
5. Cobrir replay, expiração, revogação, cross-tenant, input substitution, concorrência de consumo e auditoria sanitizada.
6. Rodar verify, coverage, audit, readiness, E2E, PostgreSQL real e nova crítica independente.

Nenhuma etapa habilita provider, canal, RAG, agenda real, financeira, clínica ou prontuário; esses gates exigem decisões e infraestrutura externas.

## Resultado controlado PLAT-S04

`PLAT-S04-001` e `PLAT-S04-003` foram concluídas em fixtures: approval durável single-consume com RLS e conexão transacional tenant-scoped; adapter allowlist-only para `find_available_slots` em dry-run; verifier HMAC/replay com raw body, store em memória para testes e store PostgreSQL controlada com purge/lease recovery; e retry/finalização atômica do inbound. Os gates finais estão em `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`. HA/observabilidade de replay, IdP, provider/canal e qualquer side effect real continuam bloqueados.
