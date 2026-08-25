# Auditoria técnica final — CVG Agent Platform controlada

## Identificação

- data da auditoria: `2026-08-24`
- timestamp do fechamento: `2026-08-24T22:00:02-03:00`
- base Git: `420dc90` (`main`) + fechamento controlado `PLAT-S11`
- escopo: todos os arquivos de `docs/`, o prompt fornecido e o checkout atual
- modo: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- dados: somente fixtures e valores fictícios

## Veredito

```txt
CONTROLLED_MVP_READY: PASS
PRODUCTION_REAL_DATA_READY: NO-GO
REAL_EXTERNAL_SIDE_EFFECTS: 0
```

O vertical slice atual é reproduzível como MVP controlado da Agent Platform. Ele entrega Control Plane tenant-aware, versões imutáveis, Control Center, Test Lab dry-run, Trace Viewer, policy/gateway fail-closed, handoff e preset controlado `CVG Secretary`, sem provider, canal, RAG, agenda, dado ou ação sensível real.

O resultado não autoriza piloto, produção irrestrita, migração destrutiva, uso de dados reais ou automação clínica/financeira. Os bloqueios de produção são requisitos deliberados de segurança e governança, não falhas mascaradas como sucesso.

## Evidência executável da árvore final

| Gate                           | Resultado                                                                 |
| ------------------------------ | ------------------------------------------------------------------------- |
| `npm run verify`               | PASS — format, typecheck, lint, build, testes, coverage e audit           |
| `npm test`                     | PASS — 74 arquivos; 264 testes pass; 16 skips condicionais; 280 total     |
| `npm run test:coverage`        | PASS — statements 84,88%; branches 80,11%; functions 85,26%; lines 85,81% |
| `npm run readiness`            | PASS — 1 arquivo; 4 testes                                                |
| `npm run test:e2e`             | PASS — 1 fluxo Playwright; 9,7 s                                          |
| `npm run test:postgres`        | PASS — 6 arquivos; 49 testes pass; 16 skips condicionais                  |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                 |
| `git diff --check`             | PASS — nenhum erro de whitespace                                          |

O E2E final cobre a jornada browser/API de criar, editar, publicar e executar o Test Lab, incluindo o caso fictício `Meu cachorro está vomitando. Posso dar dipirona?`, além de criar e aprovar metadata de plugin no Control Center. O smoke PostgreSQL executa somente fixtures controladas; skips condicionais não são tratados como cobertura de infraestrutura de produção.

## Matriz de aceite do prompt

| Capacidade                                 | Implementação verificada                                                                                                    | Estado          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Agent/AgentVersion tenant-aware            | `packages/platform/src/contracts.ts`, `control-plane-store.ts` e repositório PostgreSQL                                     | PASS controlado |
| Imutabilidade e lifecycle                  | DRAFT → TESTING → APPROVED → PUBLISHED, snapshot defensivo, rollback como nova versão                                       | PASS controlado |
| Control Center                             | `apps/web/src/features/platform/index.tsx` e rotas `/v1/admin/agents/*`                                                     | PASS controlado |
| Persona, greeting, model, policy e plugins | `AgentConfigSchema`, editor web e `secretRef` sem segredo material                                                          | PASS controlado |
| Preset `CVG Secretary`                     | `secretary-preset.ts`, bootstrap somente `NODE_ENV=development`, testes de idempotência                                     | PASS controlado |
| Test Lab dry-run                           | provider determinístico, `externalCall: false`, nenhum dispatcher externo                                                   | PASS controlado |
| Segurança clínica de medicamento           | classifier/policy hard-safety, risco `critical`, handoff e resposta sem prescrição                                          | PASS controlado |
| Trace investigável                         | risco, policy, knowledge, prompt snapshot, tools, handoff, provider, status, timestamps, latência, tokens estimados e spans | PASS controlado |
| Redaction/persistência                     | clones in-memory/PostgreSQL redigem input/response e preservam apenas output de tool `{ redacted: true }`                   | PASS controlado |
| Knowledge provenance                       | source/version devem coincidir com binding habilitado; UI envia a versão configurada                                        | PASS controlado |
| Capability gateway                         | valida tenant/agent/version, binding, actor, policy, approval e dry-run antes do handler                                    | PASS controlado |
| Handoff/takeover                           | state machine e silêncio do bot existentes no runtime publicado                                                             | PASS controlado |
| Secretary legada                           | suíte completa, readiness, E2E e smoke PostgreSQL permanecem verdes                                                         | PASS controlado |
| Catálogo persistente Test Lab              | suites tenant/agent/version-scoped, clone versionado, histórico redigido, API/UI e comparação A/B em dry-run                | PASS controlado |
| Conflito otimista de lifecycle             | `expectedStatus`, compare-and-swap em memória/PostgreSQL, HTTP 409, UI de recuperação e ausência de audit de sucesso        | PASS controlado |
| Integridade e version pinning de plugins   | invariantes semânticas, registry multi-versão imutável, seleção pinned/legacy e gateway fail-closed                         | PASS controlado |
| Catálogo declarativo de plugins            | metadata tenant-aware, unique name/version, lifecycle preconditionado, RLS, API admin e ausência de dispatch                | PASS controlado |
| Control Center do catálogo de plugins      | client/UI tenant-aware, criação metadata-only, status/actor, expectedStatus, conflito stale e E2E browser/API               | PASS controlado |
| Event bus e hooks de plugins               | allowlist tipada, inscrição declarada/tenant-scoped, payload redigido/imutável, falha isolada e eventos no Test Lab         | PASS controlado |

## Implementação entregue nas rodadas S05/S06/S07/S08/S09/S10/S11

1. O Test Lab passou a produzir um trace compatível com investigação operacional controlada, mantendo campos antigos opcionais para compatibilidade histórica.
2. O classificador reconhece pedidos explícitos de medicamento em português e inglês. A amostra veterinária é classificada como `medication_advice`, risco `critical`, policy `blocked`, handoff solicitado e provider/tool externo desativado.
3. O Capability Gateway rejeita IDs de escopo malformados antes de procurar plugin ou handler.
4. O Control Center preserva a versão de knowledge escolhida pelo operador e renderiza os novos metadados do trace.
5. O bootstrap controlado cria uma única versão publicada do `CVG Secretary` somente em memória durante desenvolvimento; teste e produção não sofrem mutação automática.
6. Os clones de trace do store em memória e do repositório PostgreSQL preservam os novos campos sem reintroduzir payload bruto.
7. O Test Lab ganhou catálogo persistente de suites com snapshot imutável, clone versionado, cases redigidos e histórico de runs limitado a variantes controladas.
8. A migration `0003_test_suite_catalog.sql` adiciona tabelas tenant-aware com FK, índices e `FORCE ROW LEVEL SECURITY`; o repository PostgreSQL usa SQL parametrizado e cópia sanitizada.
9. API e Control Center expõem criação, listagem, clone, avaliação, comparação A/B e histórico sem dispatcher/provider externo; versões A/B são validadas contra o mesmo agente e tenant.
10. O lifecycle de `AgentVersion` aceita `expectedStatus` em transition/publish/rollback; snapshot stale falha com `conflict`/HTTP 409 sem mutação parcial ou audit de sucesso.
11. O repository PostgreSQL mantém o compare-and-swap dentro da transação e a UI diferencia conflito de recusa de policy, orientando o operador a recarregar o agente.
12. `PluginManifestSchema` valida invariantes de unicidade, permissions e dependências; `PluginRegistry` suporta versões imutáveis com resolução determinística e o gateway honra pinning sem bypass de autorização.
13. O Control Center permite informar ou remover a versão pinned de um plugin lógico; nenhum handler externo, rede, provider ou canal foi adicionado.
14. O catálogo S09 persiste snapshots declarativos tenant-aware em memória e PostgreSQL, com unique `(tenant, name, version)`, cópia defensiva, lifecycle `DRAFT/APPROVED/ARCHIVED`, precondition e API admin.
15. A migration `0004_plugin_manifest_catalog.sql` aplica constraints de identidade, trigger de imutabilidade, índice de status, `FORCE ROW LEVEL SECURITY` e política fail-closed; `APPROVED` não alimenta o gateway nem autoriza handler.
16. O S10 adiciona a superfície operacional do catálogo ao client/UI: lista sob demanda, cria manifests somente metadata, exibe status/actor/versão, envia `expectedStatus`, trata conflito stale e mantém `APPROVED` desacoplado de execução.
17. O S11 adiciona `PlatformEventBus` com allowlist completa dos eventos internos, envelopes tenant-aware e subscriptions imutáveis; handlers só entram quando o hook está declarado no manifest validado.
18. O bus sanitiza payloads, congela objetos aninhados, entrega cópia independente por handler, filtra por tenant e isola/audita falhas sem propagar exceções ao pipeline.
19. O Test Lab emite eventos representativos de mensagem, contexto, agente, intent, policy, knowledge, prompt, model, tool, handoff, segurança, response e conclusão sem texto bruto ou efeito externo.
20. O catálogo S09 continua metadata-only: aprovação não instala plugin, não registra hook executável e não concede capability, provider, canal ou side effect.

## Segurança e limites

### Passes controlados

- schemas Zod validam IDs, tenant, configuração, plugin, policy e knowledge na fronteira;
- valores de segredo não entram em `AgentVersion`, UI, prompt ou trace; somente `secretRef` é permitido;
- hard safety não pode ser liberada por policy configurável;
- ações de confirmação/cancelamento/reagendamento real permanecem bloqueadas;
- Test Lab usa provider fake/determinístico e `externalCall: false`;
- knowledge sem source/version aprovado não responde e encaminha;
- output de ferramenta nunca é persistido em claro;
- hooks recebem somente eventos minimizados e redigidos; tokens e PII em erros
  de handlers são mascarados e falhas não alteram decisões do Test Lab;
- `npm audit --audit-level=high` encontrou 0 vulnerabilidades.

### Bloqueios de produção ainda abertos

- IdP confiável, tenant binding derivado de identidade e RBAC operacional;
- rollout real de RLS/backfill do data plane legado sob change control e roles separadas;
- rate limit, replay store, lease recovery e observabilidade distribuídos;
- configuração do host para CSRF/CORS/HTTPS/CSP;
- secret manager, rotação operacional e provider/modelo/canal reais;
- coordenação distribuída multioperador, HA, ETag de proxy e operação real além do compare-and-swap controlado;
- retenção, purge, classificação legal e governança de PII;
- ciclo institucional real de ingestão/aprovação/versionamento de knowledge;
- marketplace aberto, instalação de código de terceiros, catálogo de handlers executáveis e providers duráveis com compensação de side effects;
- decisões humanas sobre cargos, tenants, handoff, piloto e qualquer ação clínica, financeira ou de prontuário.

Esses itens não foram simulados como se estivessem prontos. Ativá-los exige novo SPEC, infraestrutura e aprovação humana.

## Gaps de produto explicitamente fora deste slice

O catálogo declarativo tenant-aware de manifests agora tem superfície operacional no Control Center, mas continua somente metadata-only; ele não é marketplace nem catálogo de handlers executáveis. O event bus e os hooks S11 são process-local/best-effort, sem broker, retry durável ou entrega remota. A comparação A/B existe somente no Test Lab controlado. Ainda não existe marketplace aberto, instalação de código de terceiros, lifecycle institucional real de knowledge, registry/lease de providers externos, tráfego gradual real, coordenação multioperador distribuída ou publicação automática baseada em A/B. Isso é trabalho de próxima fase, não autorização para inventar dados ou efeitos reais.

Também permanecem históricas as descrições antigas de Discovery e das auditorias anteriores. Este arquivo é a fonte de decisão atual para o estado do checkout; os documentos históricos não foram reescritos para apagar evidência temporal. As evidências específicas das rodadas recentes estão em `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`, `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`, `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`, `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md` e `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`.

## Limitação da revisão independente

Foram tentados scouts paralelos de backend, frontend e segurança e uma revisão independente final. O runtime de child agents rejeitou os modelos disponíveis por limite de uso da conta e incompatibilidade de modelo. Portanto, esta rodada não reivindica aprovação independente: o fechamento foi feito por auditoria lead-only, testes RED/GREEN, inspeção temporal do diff, gates executáveis e revisão de segurança estática.

## Próximo passo seguro

Manter o release em `CONTROLLED_MVP_READY` e abrir novo SPEC antes de qualquer próximo lane. A preparação de infraestrutura real continua separada e dependente de decisão humana. Nenhum deploy, push operacional, piloto, dado real ou provider/canal deve ser ativado a partir deste veredito.
