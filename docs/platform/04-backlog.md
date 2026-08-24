# Backlog — Agent Platform

## Regras

- Cada task tem ownership, escopo e evidência.
- Nenhuma task BUILD começa sem SPEC aprovada e registro aqui.
- Prioridade P0 exige teste antes de implementação.
- Dados e integrações reais permanecem fora do backlog executável controlado.

## Sprints controlados — estado atual `PLAT-S04`

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
