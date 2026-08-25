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

## PLAT-S06 — ordem de implementação

1. Registrar o task e escrever testes RED para catálogo, clone imutável, histórico redigido e comparação A/B tenant-scoped.
2. Implementar contratos e ids de suite/run, lifecycle em memória e repository PostgreSQL com migration `0003` e RLS fail-closed.
3. Expor as rotas admin do Test Lab, validar agente/versão e manter a avaliação em `dryRun` sem dispatcher/provider.
4. Integrar criação, avaliação e comparação controladas no Control Center sem auto-fetch.
5. Executar testes focados, smoke PostgreSQL em fixture, E2E, verify, readiness, audit e inspeção de redaction/tenant boundary.
6. Atualizar runtime state, execution log, backlog, evidências e registrar explicitamente os bloqueios de produção.

## Resultado controlado PLAT-S06

`PLAT-S06-001` só pode ser marcado `COMPLETED_CONTROLLED` quando o catálogo persistente, clone versionado, histórico redigido, API/UI e comparação A/B passarem todos os gates definidos na SPEC. O resultado máximo continua `CONTROLLED_MVP_READY`; nenhuma suite ou execução pode provocar provider, canal, tráfego real ou ação sensível.

## PLAT-S07 — ordem de implementação

1. Registrar testes RED para precondition stale, HTTP 409 e ausência de mutação parcial.
2. Adicionar o erro de domínio `conflict` e a precondition `expectedStatus` às portas memory/PostgreSQL e ao wrapper tenant-scoped.
3. Preservar lock/conditional update no PostgreSQL e alinhar a store em memória ao mesmo compare-and-swap.
4. Expor a precondition nas rotas de transition/publish/rollback e enviar o status observado pela UI.
5. Rodar verify, readiness, E2E, smoke PostgreSQL e auditoria de que o conflito não emite audit de sucesso nem libera efeitos externos.
6. Atualizar runtime state, execution log, backlog e evidência, mantendo explicitamente os limites de produção.

## Resultado controlado PLAT-S07

`PLAT-S07-001` foi marcado `COMPLETED_CONTROLLED`: um operador stale recebe conflito explícito sem mutação parcial em memória, API e PostgreSQL fixture; a UI apresenta recuperação; e nenhum audit de sucesso é emitido no conflito. O resultado máximo continua `CONTROLLED_MVP_READY`; coordenação distribuída real permanece fora do escopo. Evidência: `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`.

## PLAT-S08 — ordem de implementação

1. Registrar testes RED para invariantes semânticas de manifest e resolução pinned/unpinned.
2. Adicionar `version` opcional ao `PluginBinding` sem mutar snapshots existentes.
3. Tornar o `PluginRegistry` imutável e multi-versão por nome, com ordenação determinística e cópias defensivas.
4. Fazer o `CapabilityGateway` distinguir versão pinned inexistente de plugin ausente, sempre sem chamar handler.
5. Rodar verify, readiness, E2E, PostgreSQL smoke e auditoria do boundary sem rede, código externo ou side effect.
6. Atualizar runtime state, execution log, backlog e evidência, mantendo o marketplace e produção fora do escopo.

## Resultado controlado PLAT-S08

`PLAT-S08-001` foi marcado `COMPLETED_CONTROLLED`: invariantes de manifest, registro multi-versão, pinning, compatibilidade legacy e fail-closed do gateway passaram todos os gates. O resultado máximo continua `CONTROLLED_MVP_READY`; marketplace, rede, provider/canal e código de terceiros permanecem bloqueados. Evidência: `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`.

## PLAT-S09 — ordem de implementação

1. Registrar RED para lifecycle, duplicate name/version, tenant isolation e stale transition.
2. Adicionar contratos/ids de catálogo, lifecycle em memória e cópia defensiva.
3. Adicionar migration PostgreSQL com JSONB de manifest, RLS, unique tenant/name/version, trigger de imutabilidade e índice de status.
4. Implementar repository PostgreSQL e wrapper tenant-scoped com precondition transacional.
5. Expor API admin de create/list/get/transition, auditando somente metadata e sem executar handlers.
6. Rodar verify, readiness, E2E, PostgreSQL real e auditoria de que APPROVED não libera execução.
7. Atualizar runtime state, execution log, backlog e evidência; marketplace/instalação/provider continuam bloqueados.

## Resultado controlado PLAT-S09

`PLAT-S09-001` foi marcado `COMPLETED_CONTROLLED`: o catálogo metadata-only passou os gates de memória, API, PostgreSQL/RLS e isolamento. O resultado máximo continua `CONTROLLED_MVP_READY`; aprovação de manifest não é aprovação de execução. Evidência: `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`.

## PLAT-S10 — ordem de implementação

1. Registrar testes RED para client headers, lista vazia, criação de manifest
   metadata-only, approval com `expectedStatus` e conflito stale.
2. Adicionar tipos e métodos do catálogo ao client web sem armazenar ou enviar
   secrets/código.
3. Integrar no Control Center uma seção explícita de Plugin Catalog com
   carregamento sob demanda, criação e transições controladas.
4. Exibir status, versão, actor e a mensagem de que `APPROVED` não habilita
   execução; tratar erro/conflict sem retry automático.
5. Rodar testes focados, suíte completa, typecheck, lint, format, build,
   coverage, readiness, E2E e audit; depois inspecionar o diff e a superfície
   de rede/side effect.
6. Atualizar runtime state, execution log, backlog, evidência e auditoria.

## Limites do PLAT-S10

O lane é somente UI/client sobre a API metadata-only já existente. Não inclui
marketplace, instalação, dependências de rede, health probe, handler persistente,
provider, canal, RAG, agenda, dados reais, deploy ou produção irrestrita.

## Resultado controlado PLAT-S10

`PLAT-S10-001` foi concluída como `COMPLETED_CONTROLLED`. O client e o Control
Center cobrem listagem, criação metadata-only, actor/versão, transições com
`expectedStatus`, conflito stale e E2E browser/API. Os gates passaram com 72
arquivos, 257 testes, 16 skips condicionais, coverage 84,97% statements /
80,21% branches / 84,93% functions / 85,90% lines, readiness, E2E, PostgreSQL
controlado, format, diff check e audit. `APPROVED` continua desacoplado de
handler/permission/provider/canal; nenhuma autorização de produção foi alterada.
Evidência: `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`.

## PLAT-S11 — ordem de implementação

1. Registrar testes RED para allowlist de eventos, declaração de hooks no
   manifest, tenant isolation, redaction, imutabilidade e falha isolada.
2. Implementar o contrato do `PlatformEventBus` com inscrições imutáveis,
   handlers somente de plugins locais validados e auditoria sanitizada.
3. Integrar `RegisteredPlugin` com handlers de hooks sem conectar o catálogo
   persistente S09 à execução.
4. Emitir eventos representativos no Test Lab de forma opcional e
   observacional, preservando policy, trace, resposta e `externalCall=false`.
5. Rodar testes focados RED/GREEN, suíte completa, typecheck, lint, format,
   build, coverage, readiness, E2E, audit e inspeção de side effects.
6. Atualizar runtime state, execution log, backlog, evidência e auditoria;
   manter broker durável, entrega remota, marketplace, provider/canal e
   produção real fora do escopo.

## Limites do PLAT-S11

O event bus é process-local, best-effort e exclusivo do runtime controlado.
Não há retry durável, outbox, webhook, execução de manifest APPROVED, código
de terceiros, payload bruto, dado real ou qualquer efeito externo.

## Resultado controlado PLAT-S11

`PLAT-S11-001` foi concluída como `COMPLETED_CONTROLLED`. O event bus e os
hooks passaram RED/GREEN, verify, coverage acima de 80%, readiness, E2E,
PostgreSQL controlado, audit, format e diff check. Evidência:
`docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`. O resultado máximo
continua `CONTROLLED_MVP_READY`; delivery durável, plugins executáveis,
provider/canal e produção real continuam bloqueados.
