# Evidência de auditoria — PLAT-S35 controlled tool registry identity boundary

## Escopo

`PLAT-S35-001_CONTROLLED_TOOL_REGISTRY_IDENTITY_BOUNDARY` fechou a assimetria
entre bindings configuráveis e o planner/API hardcoded. O runtime controlado
agora usa um registry compilado server-side, versão exata, intents bounded,
deduplicação e bloqueio de colisões. O catálogo de plugins continua
metadata-only e não fornece código, handler, URL, provider ou permissão.

## Implementação auditada

- `PluginTool.intents` é metadata bounded para planejamento; `latest` é
  rejeitado em `PluginBindingSchema` e `PluginManifestSchema`.
- `PluginRegistry.get(name, version)` exige versão; `getLatest(name)` é explícito
  e separado para inspeção, não é usado pela execução.
- Constructor e `register` compartilham normalização que valida manifesto,
  handlers e hooks; snapshots permanecem defensivos/imutáveis.
- `CapabilityGateway` exige binding habilitado com versão exata, bloqueia
  plugin/tool ausente, versão ausente, colisão de identidades e permissão não
  declarada; bindings idênticos são deduplicados.
- `Test Lab` planeja por `planTools(config, intent)` e não contém allowlist
  literal de `find_available_slots`.
- Approval/API resolve a tool contra a versão aprovada/publicada e deriva a
  permissão do registry server-side antes de executar; metadata de catálogo não
  cria autoridade de execução.
- O único handler de produção do slice continua `scheduling.controlled`,
  fixture-only e dry-run. Nenhum provider, canal, egress, broker, outbox ou
  side effect real foi adicionado.

## Evidência executável final

Executada em `2026-08-26` no workspace controlado:

- focused RED inicial: 4 testes, 3 falhas esperadas e 1 passagem;
- focused GREEN/regressão próxima: 10 arquivos/49 testes PASS;
- correção pós-crítica: 3 arquivos/28 testes PASS, typecheck e lint PASS;
- `npm run verify`: 115 arquivos PASS, 2 skipped; 417 testes PASS, 19 skips;
  coverage 84,99% statements / 80,30% branches / 85,11% functions /
  86,01% lines; build, format e audit PASS, 0 vulnerabilidades;
- `npm run readiness`: 4/4 PASS;
- `npm run test:worker:startup`: PASS com
  `worker.startup_smoke_passed/queue_adapter_missing` bounded;
- `npm run test:e2e`: 4/4 PASS;
- `TEST_DATABASE_URL=<fixture PostgreSQL 16 efêmera> npm run test:postgres`:
  8 arquivos/71 testes PASS;
- `git diff --check`: PASS;
- JSON de `0308_task_catalog.json` e `build_tracking.json`: PASS.

O PostgreSQL foi uma fixture descartável em container local, sem dados reais;
foi removido ao final. Uma porta já ocupada foi preservada e uma porta livre
foi usada somente para a fixture.

## Crítica independente e correção

A primeira crítica final retornou `NEEDS_CORRECTION` sem CRITICAL/HIGH porque o
tracking ainda mostrava os números históricos de S34. Os invariantes de código
foram confirmados; a correção foi sincronizar runtime state, tracking, logs,
backlog, progress e esta evidência com os resultados S35 mais recentes. Não
houve alteração de código após essa crítica.

## Veredito

`PLAT-S35-001 = COMPLETED_CONTROLLED`.

`CONTROLLED_MVP_READY` permanece o teto. Produção real continua `NO-GO` /
`WAITING_HUMAN_APPROVAL`; não há autorização para plugins externos, dados reais,
providers, canais ou ações sensíveis.
