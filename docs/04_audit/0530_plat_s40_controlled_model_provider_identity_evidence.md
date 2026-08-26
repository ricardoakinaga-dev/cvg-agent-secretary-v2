# Evidência — PLAT-S40 identidade controlada de provider/model

## Identificação

- task: `PLAT-S40-001_CONTROLLED_MODEL_PROVIDER_IDENTITY_BOUNDARY`
- sprint: `PLAT-S40`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- fechamento: `2026-08-26T04:41:44-03:00`
- status: `COMPLETED_CONTROLLED`
- modo: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- dados: somente fixtures e valores fictícios

## Discovery e RED

`createDryRunModelProvider` instanciava o provider determinístico diretamente,
sem consultar o `ModelProviderRegistry`. O schema de configuração continuava
aceitando referências genéricas e `fallbackProvider`, embora essas identidades
não fossem executáveis no slice controlado.

O RED focado executou `npx vitest run
packages/platform/src/__tests__/model-provider-boundary.test.ts`: 1 arquivo/4
testes, com os 4 casos falhando como esperado. Provider/model desconhecido foi
aceito, fallback foi ignorado e a execução produziu `openrouter/external` após
emitir eventos. Nenhuma rede, provider externo, dado real ou side effect foi
acionado.

## Implementação auditada

- registry server-side compilado e defensivo com o único binding
  `fake/deterministic-v1`;
- correspondência exata de provider/model e rejeição fail-closed de
  `fallbackProvider`, antes de `message.received` e `model.before`;
- listas, snapshots e facade de providers protegidos contra mutação incidental;
- `Test Lab`, runtime publicado, API e worker convergem para a resolução de
  `executeConfiguredAgent`;
- resposta determinística mantém `externalCall: false`, e `secretRef` não é
  propagado para resposta ou trace;
- nenhum provider/canal real, chamada de rede, retry/fallback operacional,
  secret manager, RAG, broker, outbox, egress, deploy, dado real ou side effect
  foi adicionado.

## Evidência executável

- focused final: 4 arquivos/19 testes PASS;
- `npm test`: 121 arquivos PASS, 2 skipped; 446 testes PASS, 19 skipped;
- coverage: statements 85,08%; branches 80,11%; functions 85,17%; lines
  86,07%;
- readiness: 4/4 PASS;
- worker startup smoke: `{"event":"worker.startup_smoke_passed","code":"queue_adapter_missing"}`;
- PostgreSQL controlado: 8 arquivos/72 testes PASS;
- E2E: 4/4 PASS;
- build: PASS, 70 módulos; bundle web 278,70 kB / gzip 81,93 kB;
- typecheck, lint, format check e `git diff --check`: PASS;
- `npm run audit:security`: 0 vulnerabilidades;
- container scan não é declarado, pois não há Dockerfile/imagem no escopo.

## Revisão independente

A revisão independente de follow-up retornou `PASS — sem achados estáticos`,
incluindo os dois LOW inicialmente apontados: isolamento defensivo do registry
e cobertura explícita de fallback/identidade nos caminhos publicado e worker.
A revisão foi estática; os resultados executáveis acima foram obtidos
separadamente no workspace controlado.

## Decisão

`PLAT-S40-001 = COMPLETED_CONTROLLED`. O boundary do MVP controlado está
fechado e pronto para nova discovery/SPEC. Isto não autoriza produção
irrestrita, piloto com dados reais, providers/canais reais ou ações sensíveis:
`PRODUCTION_REAL_DATA_READY = NO-GO` e permanece pendente de decisão
humana/infraestrutura.
