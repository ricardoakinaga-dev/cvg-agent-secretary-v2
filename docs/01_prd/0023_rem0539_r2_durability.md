# REM-0539 R2 — PRD de processamento durável

Estado: `PRD_VALIDATED_CONTROLLED`; deriva da Discovery 0012 e dos achados AUD-F02/AUD-F06. Este PRD descreve apenas execução local com fixtures sintéticos; não autoriza integração ou operação real.

## Objetivo do produto

Quando uma mensagem inbound for aceita, a equipe deve conseguir localizar seu estado e retomá-la após reinício sem perder correlação, tenant, sessão ou versão publicada. O worker deve processar eventos de forma recuperável e auditável, com efeitos locais idempotentes e handoff quando o risco ou a configuração exigir.

## Requisitos funcionais

- **R2-F01 — Aceite durável:** persistir inbound, idempotency key e evento outbox no mesmo limite transacional; duplicata retorna o recurso existente sem novo efeito.
- **R2-F02 — Envelope:** cada evento contém id, tenant, tipo, versão do envelope, payload mínimo, correlação, chave idempotente, `conversationId`, `sessionId`, `agentId`, `agentVersionId`, `inboundMessageId`, tentativas e timestamps; payload não deve carregar segredo ou texto além do necessário.
- **R2-F03 — Claim:** um worker reivindica somente eventos elegíveis do tenant solicitado; o claim grava owner, lease e tentativa atomically e não permite dupla posse durante lease válido.
- **R2-F04 — Ack:** o evento só chega a `processed` após o resultado local necessário, o journal de efeito idempotente e sua evidência durável; retorno de função não é ack.
- **R2-F05 — Retry:** falha transitória usa backoff e limite autoritativos da configuração (default controlado: cinco tentativas); o worker calcula `availableAt`, sem aceitar prazo arbitrário do payload. Falha terminal ou limite excedido vai para dead-letter sem apagar o evento original.
- **R2-F06 — Recuperação:** lease expirado volta a ser elegível; reinício não perde eventos `pending`/`processing` recuperáveis.
- **R2-F07 — Dead-letter:** dead-letter registra causa redigida, tentativas, worker, correlação e horário; reprocessamento exige comando explícito, idempotency key e nova auditoria.
- **R2-F08 — Segurança:** risco alto/crítico continua bloqueando tools, approval lookup e efeitos; takeover humano silencia resposta automática mesmo se o job já estiver na fila.
- **R2-F09 — Observabilidade:** métricas e logs estruturados permitem contar pendentes, idade, retries, leases expirados, dead-letter e latência sem expor payload sensível.

## Requisitos não funcionais

- **Consistência:** semântica at-least-once; a combinação de unicidade `(tenantId, idempotencyKey)` e journal de efeitos faz cada efeito local controlado ser aplicado no máximo uma vez. Exactly-once externo fica explicitamente fora do contrato.
- **Isolamento:** todas as leituras, claims, acks e reprocessamentos são tenant-scoped e respeitam a política PostgreSQL existente.
- **Disponibilidade controlada:** reinício e perda de worker recuperam trabalho dentro do lease; falha de banco impede processamento e deixa causa observável.
- **Privacidade:** somente fixtures; logs redigidos; não persistir dados reais ou credenciais nos testes, docs ou envelopes.
- **Auditabilidade:** cada transição relevante inclui correlationId, actor/worker, policy version, tentativa e resultado.
- **Operação:** limites de lease, backoff, tentativas, lote e dead-letter são configuração validada, com defaults seguros e relógio injetável apenas em testes.

## Jornada de referência

`inbound recebido → deduplicação → commit de mensagem + outbox → claim → execução pinned → efeito local idempotente → resultado + audit + ack`. Em qualquer falha, o evento permanece recuperável ou é movido para dead-letter com evidência. Se o operador assumir a sessão, o worker registra `handoff` e não envia resposta automática.

## Métricas e aceites

- 100% dos eventos aceitos no cenário sintético têm estado investigável após reinício, incluindo sessão, versão pinned e histórico de tentativas.
- Em uma corrida controlada de dois workers, no máximo um lease válido processa o evento; o segundo recebe ausência de claim ou conflito.
- A matriz de crash não demonstra perda; retries não duplicam o efeito idempotente local e duplicatas da mesma chave retornam o resultado já registrado.
- 100% dos dead-letters têm causa, tentativas e correlação; reprocessamento é explícito e auditado.
- Nenhuma regressão nos gates de safety, approval, tenant e takeover.

## Riscos e decisões pendentes

O risco principal é confundir ack de memória com resultado durável. A escolha de broker e de provider continua pendente de decisão humana e contrato externo; R2 deve funcionar sem eles. A política de retenção e os limites operacionais devem ser registrados antes de qualquer ambiente com dados reais.

## Gate PRD

`PRD_VALIDATED_CONTROLLED`: o produto está definido para SPEC e BUILD controlado local. A aprovação não libera integração externa, dados reais ou ações sensíveis; essas dependências têm gates próprios.
