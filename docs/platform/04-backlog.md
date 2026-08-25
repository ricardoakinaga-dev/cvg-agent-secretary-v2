# Backlog — Agent Platform

## Regras

- Cada task tem ownership, escopo e evidência.
- Nenhuma task BUILD começa sem SPEC aprovada e registro aqui.
- Prioridade P0 exige teste antes de implementação.
- Dados e integrações reais permanecem fora do backlog executável controlado.

## Sprints controlados — estado atual `PLAT-S09`

### `PLAT-FOUNDATION-001` — harness hermético

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/platform
- escopo: aliases Vitest locais, teste de resolução e verificação de caminho
- aceite: import de `@cvg/shared` e `@cvg/persistence` vem do workspace atual em todos os testes

### `PLAT-FOUNDATION-002` — contratos e store de AgentVersion

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: control-plane
- escopo: tenant, agent, versões, lifecycle, publish/rollback, imutabilidade
- aceite: draft → testing → approved → published; rollback sem mutar snapshot anterior

### `PLAT-FOUNDATION-003` — prompt/model/policy declarativos

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: policy/runtime
- escopo: prompt blocks, model refs sem segredo, policy layers e response templates
- aceite: composição determinística e hard safety vence toda configuração

### `PLAT-FOUNDATION-004` — plugin registry e capability gateway

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/security
- escopo: manifest, binding, permission, risk, approval, audit e execução fake
- aceite: tool desconhecida ou não autorizada nunca executa

### `PLAT-FOUNDATION-005` — Test Lab dry-run/trace

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: test-lab
- escopo: input/history/context → intent/policy/knowledge/tool/response/handoff/trace
- aceite: sem canal ou efeito real; trace contém agent/version/config/policy decisions

### `PLAT-FOUNDATION-006` — API/UI Control Center

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: control-plane/web
- dependências: 002–005
- aceite: Admin tenant-aware cria draft, roda lab, publica e faz rollback

### `PLAT-FOUNDATION-007` — persistência PostgreSQL aditiva

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: persistence
- dependências: 002–005
- aceite: migration e smoke sem alterar o data plane legado

### `PLAT-FOUNDATION-008` — takeover state machine

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: handoff
- dependências: 002, 004, 005
- aceite: bot silencioso durante `HUMAN_ACTIVE`; return explícito e auditado

### `PLAT-FOUNDATION-009` — hardening/release candidate audit

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: audit/security
- dependências: 001–008
- aceite: verify, coverage local, Postgres, E2E, security review, boundary report e signoff template

## Sprint de hardening controlado — `PLAT-S02`

Esta sprint corrige gaps encontrados na auditoria do MVP controlado. Ela não altera o limite de release: continua sem dados reais, provider/canal real, RAG real ou ações sensíveis.

### `PLAT-HARDENING-001` — edição versionada pelo Control Center

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: control-plane/web
- escopo: clonar uma versão como novo snapshot, validar pertencimento tenant/agent e permitir edição controlada pela UI sem mutar versões anteriores
- aceite: Admin altera uma configuração pela UI, o sistema cria nova versão DRAFT, o snapshot original permanece intacto e a ação é auditada

### `PLAT-HARDENING-002` — approval e trace fail-closed

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/security
- escopo: transformar `requires_approval` em handoff seguro no Test Lab e rejeitar traces cujo agent/version não pertençam ao escopo
- aceite: nenhuma ação que exige aprovação gera resposta afirmativa ou persiste trace órfão/cross-object

### `PLAT-HARDENING-003` — publish PostgreSQL serializado

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: persistence
- escopo: bloquear o agent/version corrente dentro da transação de publicação e cobrir o contrato no fake e no smoke de persistência
- aceite: publicações concorrentes não deixam mais de uma versão PUBLISHED nem activeVersionId divergente

### `PLAT-HARDENING-004` — Trace Viewer operacional completo

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: web/audit
- escopo: exibir policy reason, knowledge, handoff, resposta e provider no trace selecionado, mantendo redaction e `externalCall: false`
- aceite: operador Admin consegue investigar uma execução fictícia sem abrir payload bruto ou segredo

## Sprint de fronteira pré-produção — `PLAT-S03`

Esta sprint fecha a fronteira técnica de tenant isolation sem ativar dados reais, canais reais ou ações sensíveis. A migration é aditiva, opt-in no runner de produção e fail-closed para linhas legadas sem mapeamento seguro.

### `PLAT-S03-001` — contexto PostgreSQL por tenant e RLS do data plane legado

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: persistence/security
- dependências: `PLAT-FOUNDATION-007`, `PLAT-HARDENING-002`, decisão humana de backfill para dados legados reais
- escopo: runner versionado de migrations, policy RLS para conversas e tabelas filhas, coluna tenant-aware de auditoria/outbox, pool de conexões com contexto tenant resetado e guard de startup para produção
- aceite controlado: tenant A não consegue ler, escrever ou listar dados de tenant B sob `FORCE ROW LEVEL SECURITY`; operações do runtime e control plane usam conexão dedicada por escopo; conexão nunca retorna ao pool com contexto residual; migration antiga continua intacta; linhas históricas nulas ou incompatíveis ficam quarentenadas e invisíveis
- evidência: migration versionada/checksum, baseline legado explícito com aprovação, preflight obrigatório mesmo com auto-migration desligado, policies exatas, role runtime DML-only, auditoria com tenant explícito e fixture PostgreSQL real
- limite: não executar backfill em banco real, não inferir dono de linhas órfãs, não autorizar produção irrestrita até signoff de retenção, IdP, role mapping e plano de migration

## Sprint de autorização durável e gateway legado — `PLAT-S04`

Esta sprint permanece controlada e registrada antes do BUILD. Ela fecha a autoridade de approval e a adaptação mínima do `ToolRegistry` sem habilitar provider, canal, RAG, agenda real ou qualquer efeito externo.

### `PLAT-S04-001` — approval capability durável e adapter seguro do legado

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/security/persistence
- dependências: `PLAT-S03-001`, decisão humana para qualquer ativação real
- escopo: authority de approval tenant/agent/version/tool/input-hash/actor/nonce/expiry/revocation/consumption; persistência PostgreSQL com RLS e conexão transacional checked-out; adapter único para `find_available_slots` em modo dry-run; qualquer outra ferramenta bloqueada
- aceite controlado: aprovação não pode ser reutilizada, trocada de input ou consumida por outro actor; revogação/expiração falham fechadas; gateway é o único caminho; adapter não confirma/cancela/reagenda nem chama provider real
- limite: issuer/verifier operacional, IdP, Redis, providers/canais e side effects reais seguem bloqueados

### `PLAT-S04-002` — HMAC e replay protection no webhook controlado

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: api/security
- dependências: `PLAT-FOUNDATION-009`, decisão humana para provider/canal real
- escopo: assinatura HMAC-SHA256 sobre raw body, event id, janela temporal, rotação controlada de segredo, replay lease, purge e recuperação de reserva stale; fixture usa store em memória e PostgreSQL controlado compartilha reservas entre instâncias
- aceite controlado: payload adulterado, canal trocado, timestamp stale, header ausente e replay são rejeitados; purge, concorrência, commit/release e recuperação de lease PostgreSQL passam em fixture real; HA/observabilidade operacionais permanecem fora do slice

### `PLAT-S04-003` — retry idempotente e finalização transacional do inbound

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/persistence
- dependências: `PLAT-S03-001`, `PLAT-S04-001`, decisão humana para rollout real
- escopo: marcador `messages.runtime_status`, reprocessamento seguro de duplicata pendente após falha parcial, finalização PostgreSQL na mesma transação que outbound/tool audit/trace/integration audit e coordenação com lease HMAC recuperável
- aceite controlado: falha antes do commit deixa o evento retryable; execução já concluída não duplica efeitos; tenant, takeover e runtime status são verificados sob lock
- limite: fila/worker distribuído, provider real, compensação de side effects e operação multi-região seguem fora do slice

## Sprint de fechamento do Test Lab controlado — `PLAT-S05`

Esta sprint foi registrada após a auditoria atual do checkout e permanece restrita a
fixtures, dry-run e efeitos controlados. Ela não altera o boundary de produção.

### `PLAT-S05-001` — trace seguro, segurança clínica e fechamento do Control Center

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/security/web
- dependências: `PLAT-S04-001..003`
- escopo: completar metadados seguros do Test Lab (risco, prompt snapshot, timestamps/status, latência, uso estimado de tokens e spans); tornar explícita a rota segura para pedido de medicamento veterinário; validar IDs do CapabilityGateway na fronteira; corrigir o binding de versão de knowledge enviado pelo Control Center e exibir os novos metadados no Trace Viewer
- aceite: `Meu cachorro está vomitando. Posso dar dipirona?` nunca prescreve, nunca chama ferramenta/provedor externo e retorna handoff/bloqueio seguro com trace redigido; IDs malformados são rejeitados antes de resolver plugin/handler; a versão de knowledge configurada é a mesma enviada ao Test Lab; snapshots e runtime legado permanecem verdes
- evidência: `docs/platform/final-technical-audit.md`; `npm run verify`, readiness, Playwright E2E, smoke PostgreSQL e auditoria de dependências passaram na árvore final
- limite: não criar provider/canal/RAG/agendamento real, não ativar dados reais e não alterar decisões humanas de produção

### `PLAT-S05-002` — preset controlado `CVG Secretary`

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: control-plane/runtime
- dependências: `PLAT-FOUNDATION-002..006`, `PLAT-S05-001`
- escopo: disponibilizar um bootstrap idempotente, fictício e versionado do primeiro agente `CVG Secretary` para desenvolvimento, preservando a porta de `ControlPlaneStore` e sem alterar dados existentes
- aceite: ambiente de desenvolvimento inicia com `CVG Secretary` publicado no tenant controlado, com persona/greeting/policy/handoff/plugin controlados; repetir o bootstrap não cria versões duplicadas; teste e produção não sofrem mutação automática
- evidência: `packages/platform/src/secretary-preset.ts`, testes de lifecycle/bootstrap e `docs/platform/final-technical-audit.md`
- limite: nenhum tenant real, secret real, fonte institucional real, provider/canal, agenda, dado ou side effect externo

### `PLAT-S06-001` — catálogo persistente de TestCase/TestSuite e avaliação A/B controlada

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: platform/qa/control-plane
- dependências: `PLAT-S05-001`, decisão de modelo de governança de suites
- escopo: persistir suites tenant-aware ancoradas em agente/versão, executar avaliações reproduzíveis, registrar histórico redigido de runs e comparar duas versões no Test Lab sem canal/provider real
- aceite: suite criada/listada/atualizada por nova versão sem mutação destrutiva; avaliação A/B valida que ambas as versões pertencem ao mesmo agente/tenant; cada trace permanece redigido e `externalCall: false`; nenhuma publicação automática ocorre
- evidência: `docs/04_audit/0496_plat_s06_suite_catalog_evidence.md`, `packages/persistence/migrations/0003_test_suite_catalog.sql`, verify, readiness, E2E e smoke PostgreSQL controlado
- limite: não ativar tráfego real, rollout gradual real, provider/canal real ou decisão automática de publicação

## Sprint de consistência multioperador controlada — `PLAT-S07`

Esta sprint trata somente conflito otimista nas mutações de lifecycle do Control Center. Ela não transforma a store controlada em coordenação distribuída nem autoriza produção real.

### `PLAT-S07-001` — compare-and-swap de lifecycle e resposta HTTP 409

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: control-plane/persistence/web
- dependências: `PLAT-S06-001`, `PLAT-FOUNDATION-002`, `PLAT-S03-001`
- escopo: aceitar `expectedStatus` nas transições, publish e rollback; rejeitar snapshot stale com erro `conflict`/HTTP 409; preservar transação e condição de status no PostgreSQL; enviar o status observado pelo Control Center
- aceite: dois operadores com o mesmo snapshot não conseguem sobrescrever a decisão do primeiro; o segundo recebe conflito explícito, sem mutação parcial, e o fluxo legacy sem precondition continua compatível apenas no boundary controlado
- evidência: `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: não declarar HA, lock distribuído, ETag de proxy, sessão de IdP ou coordenação multi-região; qualquer rollout real exige novo SPEC e aprovação humana

## Sprint de integridade de manifests e reprodutibilidade controlada — `PLAT-S08`

Esta sprint trata somente da integridade semântica dos manifests e da seleção determinística de versões no registry local. Ela não cria marketplace, instala código de terceiros, persiste handlers ou habilita provider/canal.

### `PLAT-S08-001` — validação semântica e version pinning de plugins

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: runtime/security/control-plane
- dependências: `PLAT-S07-001`, `PLAT-FOUNDATION-004`
- escopo: rejeitar manifestos com ferramentas duplicadas, permissões ausentes, dependência de si próprio ou coleções ambíguas; permitir versões imutáveis do mesmo plugin; aceitar `version` opcional no binding para pinning; resolver a versão mais alta de forma determinística somente quando o binding legacy não fixa versão
- aceite: binding pinned para versão inexistente falha fechado sem chamar handler; binding pinned chama somente a versão exata; binding sem pinning preserva compatibilidade e escolhe a versão determinística; registry retorna cópias defensivas
- evidência: `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: não persistir catálogo, não executar código externo, não resolver dependências de rede, não criar marketplace e não declarar readiness de produção

## Sprint de catálogo declarativo de plugins controlado — `PLAT-S09`

Esta sprint persiste somente metadata e manifests validados, com escopo por tenant e lifecycle aprovado/arquivado. Não instala código, não cria marketplace aberto, não resolve dependências por rede e não conecta o catálogo a provider/canal real.

### `PLAT-S09-001` — catálogo tenant-aware de manifests sem handlers

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: control-plane/persistence/security
- dependências: `PLAT-S08-001`, `PLAT-S03-001`
- escopo: criar/listar/ler manifests declarativos imutáveis, transicionar DRAFT → APPROVED/ARCHIVED com precondition, persistir em memória e PostgreSQL com RLS e expor API admin tenant-scoped
- aceite: nome/versão duplicados no tenant falham; catálogo A não é visível para B; manifest e identidade permanecem imutáveis; transição stale retorna conflito sem mutação; APPROVED só representa metadata revisada, nunca autorização de handler
- evidência: `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`; migration `0004_plugin_manifest_catalog.sql`; verify, readiness, E2E, smoke PostgreSQL, format, diff check e audit
- limite: não instalar/executar código, não buscar dependências externas, não fazer marketplace, provider/canal, dados reais ou produção irrestrita

## Sprint de operação do catálogo declarativo — `PLAT-S10`

Esta sprint fecha somente a lacuna de superfície operacional identificada na
auditoria: o catálogo S09 tem API e persistência, mas ainda não é visível e
mutável pelo Control Center. O lane não altera o boundary metadata-only.

### `PLAT-S10-001` — Control Center tenant-aware para catálogo de plugins

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: web/control-plane/security
- dependências: `PLAT-S09-001`, `PLAT-FOUNDATION-006`
- escopo: client web e seção do Control Center para listar, criar e transicionar
  manifests declarativos via API existente, com headers de identidade/tenant,
  precondition stale e estados visíveis de erro/vazio
- aceite: Admin lista somente o catálogo do próprio tenant; cria um manifest
  metadata-only sem segredo/código; aprova ou arquiva com `expectedStatus`; a
  UI diferencia conflito 409; `APPROVED` é apresentado como metadata revisada
  sem habilitar handler, permission, provider, canal ou side effect
- evidência: `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`;
  testes do client/UI, verify, readiness, E2E, diff/audit e smoke PostgreSQL
- limite: sem migration, marketplace, instalação, dependências de rede, health
  probe externo, handlers persistentes, provider/canal, dados reais ou produção
  irrestrita

## Sprint de eventos internos e hooks controlados — `PLAT-S11`

Esta sprint fecha a lacuna de execução observável dos `hooks` declarados no
manifest. O barramento é process-local, best-effort e não conecta o catálogo de
metadata a handlers executáveis.

### `PLAT-S11-001` — event bus tipado e hooks tenant-scoped

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: runtime/security/platform
- dependências: `PLAT-S10-001`, `PLAT-S08-001`, `PLAT-FOUNDATION-005`
- escopo: allowlist de eventos, inscrição por plugin local com hook declarado,
  tenant explícito, payload redigido/imutável, isolamento de falhas e emissão
  observacional no Test Lab
- aceite: evento desconhecido, tenant/ID inválido, hook não declarado ou
  handler ausente falha fechado; hooks só recebem o próprio tenant; mutação do
  envelope não altera a origem; erro de um hook não para outros nem o Test Lab;
  eventos representativos ficam cobertos sem dispatch externo
- evidência: `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`; testes
  unitários de bus/registry, integração do Test Lab, `npm run verify`,
  readiness, E2E, PostgreSQL controlado, `npm audit`, `git diff --check` e
  auditoria técnica
- limite: sem broker, retry/outbox, webhook, catálogo executável, marketplace,
  provider/canal, payload bruto, dado real ou produção irrestrita

## Limites preservados

- Nenhum segredo, dado real ou chamada externa entra na implementação.
- Não há aprovação para produção irrestrita, backfill real, IdP real, limiter distribuído/replay store real, retenção legal ou ações clínicas/financeiras.

Durante `PLAT-S03` e `PLAT-S04`, RLS, approval e webhook security são preparados e verificados somente em fixtures. O caminho de produção exige migration, pool tenant-scoped, IdP, stores distribuídos e change control aprovados; ausência dessas condições deve interromper o startup.

## Decisões humanas bloqueadas

- tenant/cargos reais e mapeamento RBAC;
- fonte RAG institucional e ciclo de aprovação;
- provider/modelo real, custos e secret refs;
- destinos de handoff reais;
- qualquer piloto, canal, dado ou ação sensível.
