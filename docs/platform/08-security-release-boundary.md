# Security and release boundary — Agent Platform

## Implementado e verificável

- Todo endpoint novo valida body, IDs, tenant, status e fonte controlada com Zod.
- Queries PostgreSQL do control plane são parametrizadas e sempre incluem `tenant_id`.
- Em produção, headers autoafirmados não autenticam operadores; o processo exige `operatorIdentityResolver` confiável e identidade tenant-bound.
- Webhooks em produção exigem `webhookVerifier`; sem verificador o endpoint fecha com `401`.
- O `HmacWebhookVerifier` controlado valida HMAC-SHA256 sobre o corpo JSON bruto recebido, event id, janela temporal, rotação de segredo e replay single-use por `WebhookReplayStore`; a implementação em memória é somente fixture e a store PostgreSQL faz purge oportunista de entradas expiradas.
- Rate limiting em memória e headers defensivos (`nosniff`, `DENY`, `no-referrer`) estão ativos no Fastify.
- Traces e auditoria não recebem credenciais; payloads de auditoria são minimizados/redigidos.
- O provider do Test Lab é determinístico e declara `externalCall: false`.
- O runtime publicado usa somente o actor/gateway controlado neste slice; `scheduling.controlled` retorna fixtures determinísticas e nunca cria, confirma, cancela ou remarca consulta.
- Continuação inbound exige par de IDs validado e escopado pelo tenant, e o estado de takeover é transacional no PostgreSQL; mensagens continuam sendo persistidas, mas o bot não executa provider/tool durante takeover humano.
- Histórico de Test Lab/execution traces é persistido por tenant e redigido para PII comum antes da gravação; a UI mostra apenas evidência controlada.
- Mensagens outbound do runtime controlado entram na timeline somente após redaction; sender references são mascaradas e a continuidade usa fingerprint tenant-scoped, sem armazenar o identificador bruto.
- O runtime limita o histórico enviado ao provider e revalida o estado de takeover antes de emitir resposta; durante takeover humano o bot permanece silencioso.
- Strings livres de evidência de auditoria e texto de trace são redigidos na fronteira de persistência, além da remoção de campos sensíveis por chave.
- Em `NODE_ENV=production`, a configuração falha fechada sem PostgreSQL; a migração inicial executa em transação e registra `schema_migrations`, mantendo a compatibilidade com tenant nulo do legado bloqueada.
- Fora de `NODE_ENV=test`, mutações exigem identidade por padrão; a opção permissiva existe somente para fixtures de teste e não pode desativar a proteção em produção.
- O Control Center clona uma versão em novo DRAFT, valida tenant/agent/source e registra a operação; a versão-fonte permanece imutável.
- Políticas `requires_approval` são convertidas em handoff seguro no Test Lab e o CapabilityGateway bloqueia a execução sem approval estruturado/verificado; `approvalGranted` booleano não faz parte do contrato.
- Approval capability durável é persistido com binding completo, input hash, nonce único, expiry, revocation, single-consume, `FORCE RLS` e trigger de binding imutável; o runtime `postgres-pool` usa conexão tenant-scoped e transacional checked-out.
- Traces e test runs validam a associação tenant/agent/version antes da persistência, tanto no store em memória quanto no repositório PostgreSQL.
- Publicação PostgreSQL bloqueia a versão alvo e a linha de controle do agent na mesma transação; a serialização deste slice não substitui o controle de concorrência multioperador completo.
- O Trace Viewer exibe policy, knowledge, handoff, resposta e provider já redigidos, mantendo `externalCall: false`; a UI preserva plugins desconhecidos e flags reais desligadas ao clonar.
- O runner lê `schema_migrations` antes de reaplicar a versão inicial; corridas de idempotência PostgreSQL de inbound e tarefas são reconciliadas por releitura do registro vencedor, sem duplicação.
- Inbound runtime usa estado persistente `pending/completed`: falha antes do commit libera o replay HTTP e permite reprocessamento seguro da mesma mensagem; a finalização PostgreSQL é transacional e marca o inbound somente junto com os efeitos controlados e evidências.
- `PLAT-S03` adiciona runner versionado com checksum, migration `0001_tenant_isolation`, colunas tenant explícitas nos registros legados, FKs compostas `NOT VALID`, quarentena de IDs sem mapeamento determinístico e policies `USING/WITH CHECK` com `FORCE ROW LEVEL SECURITY`.
- O caminho PostgreSQL tenant-scoped usa pool e conexão dedicada, define `cvg.tenant_id`, restaura/verifica `search_path`, exige role de runtime sem superuser/BYPASSRLS/ownership/DDL/DELETE/TRUNCATE e sem acesso à quarentena, e limpa o contexto antes do release; o modo de conexão única permanece apenas para compatibilidade controlada sem RLS.
- O runner de production falha quando encontra marcador de migration sem checksum confiável; com RLS habilitado, o startup também verifica no catálogo que todas as tabelas protegidas têm `ENABLE/FORCE RLS` e policy tenant-bound, aplica `POSTGRES_SCHEMA` ao pool runtime e exige role de migration separada, sem superuser/BYPASSRLS/memberships administrativas, proprietária do conjunto DDL gerenciado.
- Auditoria e outbox legados nunca atribuem tenant a partir de `payload.tenantId`: somente relações existentes de sessão/conversa/agente/version são autoridade; claim divergente, relação ausente ou registro órfão permanece com `tenant_id` nulo, recebe quarentena persistente e fica invisível sob `FORCE RLS`.
- O lockfile foi auditado com `npm audit --audit-level=high` sem vulnerabilidades.
- O bootstrap de produção exige `INBOUND_TENANT_ID` validado para o modo controlado de tenant único, ou um resolver tenant-bound injetado no factory; ausência de ambos fecha o startup/webhook. Isso não substitui IdP, provisionamento ou roteamento multi-tenant operacional.
- O bootstrap também exige `INBOUND_AGENT_ID` validado (ou runtime injetado) e um `operatorIdentityResolver` confiável; sem esses vínculos o processo fecha antes de aceitar inbound ou mutações operacionais. O agente fixo é somente o modo controlado de tenant único.
- A replay store PostgreSQL compartilha reservas entre instâncias, purga expirados e recupera reservas `reserved` stale após lease de 30 segundos; a operação real ainda exige HA, métricas, retenção e runbook aprovados.
- Capability approval separa issuer e executor, exige `approval:execute` para consumir e registra evidência `approval_decision` sanitizada na mesma transação do consumo durable.
- A evidência reproduzível da rodada PLAT-S03 está em `docs/04_audit/0494_plat_s03_tenant_isolation_evidence.md`; PLAT-S04 e webhook controlado estão em `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`.

## Bloqueios antes de qualquer produção real

- Integrar o resolver de identidade a um IdP real, com tenant derivado da sessão/token, rotação, expiração e revisão de permissões.
- Trocar o rate limiter em memória por um componente distribuído e configurar limites por tenant/operador/IP conforme operação.
- Definir CSRF/CORS/HTTPS/CSP no host que servir o console; o API não usa cookie de sessão, mas o host deve preservar esse contrato.
- Executar a migration `0001` e o plano de backfill em banco real sob change control; a evidência controlada não substitui validação de schema, ownership, role mapping, janela de lock e rollback, e linhas históricas ambíguas permanecem em quarentena/invisíveis.
- Integrar IdP, provisionamento/rotação da role de migration separada e rotação operacional antes de ativar RLS em tenant real; o fixture não substitui signoff.
- Expandir o adapter do `ToolRegistry` além da allowlist controlada somente após capability manifests, approval e side-effect controls de cada ferramenta real.
- Operacionalizar a replay store PostgreSQL ou substituí-la por Redis/serviço distribuído com TTL, HA, métricas e política de recuperação aprovados; validar o contrato de raw-body/segredo por provider real e executar purge operacional contínuo.
- Integrar IdP e issuer/verifier operacional real, com identidade do aprovador, rotação de secrets, escopo de ação, expiração, revogação e auditoria antes de qualquer plugin real.
- Obter decisão humana sobre RAG institucional, retenção, cargos reais e habilitação de canais/ações sensíveis.
- Migrar/validar a política de retenção e PII para dados reais; a redaction atual é uma barreira de MVP, não substitui classificação, DLP ou aprovação jurídica.
- Implementar retenção/purge operacional e leases/cancelamento/compensação para providers e canais reais; o scheduling atual permanece fixture-only.
- Completar concorrência multioperador do control plane PostgreSQL (controle otimista, conflitos de edição e auditoria operacional); o lock transacional de publicação deste slice cobre apenas a serialização básica do publish.

## Veredito operacional

`CONTROLLED_MVP_READY`: o slice é reproduzível com fixtures fictícias, ambiente de teste e aprovação interna. `PRODUCTION_REAL_DATA_READY`: não autorizado.
