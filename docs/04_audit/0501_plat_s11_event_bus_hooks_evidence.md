# Evidência de auditoria — PLAT-S11 event bus e hooks controlados

## Identificação

- task: `PLAT-S11-001_EVENT_BUS_HOOKS`
- timestamp do fechamento: `2026-08-24T22:00:02-03:00`
- fase: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- escopo: event bus interno process-local, hooks de plugins locais e emissão observacional no Test Lab
- dados: somente fixtures e valores fictícios

## Gap registrado

A auditoria do prompt confirmou que `PluginManifest.hooks` existia como
metadata, mas não havia barramento interno, allowlist de eventos ou inscrição
tenant-aware ligada ao pipeline. O catálogo persistente S09 permaneceu fora da
execução por decisão de segurança.

## RED/GREEN

Antes da implementação, o teste focado
`packages/platform/src/__tests__/event-bus.test.ts` e
`packages/platform/src/__tests__/test-lab-events.test.ts` falhou em 7 testes:
`PlatformEventBus`/`PLATFORM_EVENT_NAMES` não existiam, hooks não eram
preservados pelo registry e `runTestLab` não possuía contrato de `eventBus`.

Depois da implementação, o mesmo comando passou:

```text
npm test -- packages/platform/src/__tests__/event-bus.test.ts packages/platform/src/__tests__/test-lab-events.test.ts
2 files passed; 7 tests passed
```

## Implementação verificada

- `packages/platform/src/event-bus.ts` define 33 eventos internos tipados e
  allowlisted, envelope com identidade/tenant/agent/version/mode, payload
  sanitizado, redacted fields e cópia profundamente congelada por entrega;
- `PlatformEventBus.registerPlugin` exige manifest válido, tenant válido,
  evento allowlisted e handler para cada hook declarado; handlers não
  declarados falham fechado;
- subscriptions são mantidas imutavelmente e `emit` entrega somente ao
  mesmo tenant; falhas de hook são isoladas e produzem delivery/audit
  sanitizados sem parar os demais handlers;
- `PluginRegistry` preserva cópias defensivas de handlers de hooks e rejeita
  handler cuja chave não esteja no manifest;
- `executeConfiguredAgent`/`runTestLab` emitem eventos representativos de
  mensagem, contexto, agente, intent, policy, knowledge, prompt, model,
  tools, response, handoff, segurança e conclusão, sem texto bruto;
- a emissão é opcional e observacional; qualquer falha de observabilidade é
  absorvida pelo Test Lab e não altera policy, resposta, trace ou decisão;
- nenhum evento conecta o catálogo S09 `APPROVED` a handler, provider, canal,
  rede ou side effect.

## Gates executáveis

| Gate                               | Resultado                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- |
| testes focados RED/GREEN           | PASS — 2 arquivos; 7 testes                                               |
| `npm run verify`                   | PASS — 74 arquivos; 264 testes pass; 16 skips condicionais                |
| `npm run test:coverage` via verify | PASS — 84,88% statements; 80,11% branches; 85,26% functions; 85,81% lines |
| `npm run typecheck`                | PASS                                                                      |
| `npm run lint`                     | PASS                                                                      |
| `npm run format:check`             | PASS                                                                      |
| `npm run build`                    | PASS — bundle web produzido                                               |
| `npm run readiness`                | PASS — 4/4                                                                |
| `npm run test:e2e`                 | PASS — 1/1 fluxo Playwright                                               |
| `npm run test:postgres`            | PASS — 4 arquivos; 49 testes pass; 16 skips condicionais                  |
| `npm run audit:security`           | PASS — 0 vulnerabilidades                                                 |
| `git diff --check`                 | PASS                                                                      |

## Segurança e limites

- payloads de hooks não carregam a mensagem bruta do Test Lab; PII conhecida,
  campos sensíveis e tokens em erros são redigidos;
- handlers recebem envelope/contexto congelados e cópia independente por
  entrega; mutação do handler não altera origem nem outro tenant;
- o event bus é process-local, best-effort e não oferece broker, retry
  durável, outbox, webhook, entrega remota ou garantia após reinício;
- não foram adicionados dados reais, segredos, migrations, providers,
  canais, marketplace, código de terceiros ou efeitos externos;
- `CONTROLLED_MVP_READY` continua sendo o máximo autorizado;
  `PRODUCTION_REAL_DATA_READY` continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Revisão independente

Child agents foram tentados nas rodadas anteriores, mas permaneceram
indisponíveis por limite de conta/incompatibilidade de modelo. Este fechamento
é lead-only, sustentado por RED/GREEN, typecheck/lint/format, cobertura,
auditoria estática e gates executáveis; nenhuma aprovação independente é
reivindicada.

## Decisão

`PLAT-S11-001 = COMPLETED_CONTROLLED`. O gap de eventos/hooks internos foi
fechado dentro do boundary controlado. A próxima fase, caso aprovada, deve
registrar novo SPEC para lifecycle/health persistente, entrega durável,
observabilidade distribuída ou plugins executáveis; nada disso é habilitado
por este lane.
