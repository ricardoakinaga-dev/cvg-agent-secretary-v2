# REM-0539 R2 — Discovery de processamento durável

Estado: `DISCOVERY_VALIDATED_CONTROLLED`. Origem: AUD-F02/AUD-F06, plano executivo 0311, roadmap 0312 e backlog 0313. R1 foi fechada com a evidência 0544; este documento delimita a próxima onda e não autoriza integrações externas.

## Problema observado

O runtime aceita uma mensagem, mas o caminho de outbox ainda é um fixture em memória e `processOutboxEvent` retorna `processed` sem persistir o efeito. O worker também recusa iniciar quando não há adapter controlado. Um crash entre aceite, execução e confirmação pode deixar uma mensagem aceita sem continuidade investigável, ou repetir uma entrega sem deduplicação durável.

## Resultado desejado

Entregar uma fila local controlada, tenant-scoped e auditável para mensagens sintéticas. O sistema deve sobreviver a reinício, expirar leases recuperáveis, limitar tentativas, encaminhar falhas ao dead-letter local e preservar a versão do agente e a correlação do inbound. A semântica pública é at-least-once com efeitos locais idempotentes; não há promessa de exactly-once para provider, broker ou canal externo.

## Escopo da investigação

- Outbox persistente em memória e PostgreSQL, com envelope versionado, tenant, correlação, idempotency key e relógio injetável de teste.
- Claim/lease transacional, `ack` durável, retry com backoff limitado, dead-letter e reprocessamento explicitamente auditado.
- Aceite inbound antes da execução e finalização atômica do runtime, sem perder pinning, takeover ou estado de mensagem.
- Matriz de crash antes/depois de commit, efeito e ack, com dois consumidores e expiração de lease.
- Observabilidade sintética: contagem de pendentes, idade, tentativas, dead-letter e correlação sem payload sensível.

## Fora de escopo e limites

Não serão conectados broker, provider de modelo, canal de mensagem, destinatário real, RAG institucional, deploy, dado real ou ação clínica/financeira/prontuário. O destino da entrega R2 é local e fictício. Uma aprovação jamais confirma, cancela ou reagenda uma consulta real. Falha de configuração deve parar com segurança, sem fallback silencioso para memória em ambiente que declare persistência.

## Hipóteses e riscos

1. Uma transação única para claim e atualização de estado evita que dois workers possuam o mesmo lease válido.
2. Idempotency key e resultado durável evitam duplicar efeito controlado depois de crash; se o efeito falhar, o evento permanece retryable.
3. A expiração do lease recupera trabalho abandonado sem apagar evidência do worker anterior.
4. Dead-letter não é descarte: contém causa, tentativas, correlação e ação de reprocessamento, com autorização explícita.
5. A principal dependência externa é a instância PostgreSQL isolada para fechar REM-07 e provar as invariantes de concorrência antes de promover R2.

## Critérios de sucesso da Discovery

- Matriz de estados e pontos de falha aprovada em PRD/SPEC.
- Invariantes de tenant, correlação, idempotência, lease e auditoria identificadas antes do código.
- Gate separa evidência de fixture local de qualquer prontidão externa.
- R2 só entra em `READY_FOR_BUILD` após REM-08 auditada, SPEC aprovada e revisão humana registrada.

## Decisão do gate

`DISCOVERY_VALIDATED_CONTROLLED`: a investigação de durabilidade está delimitada e REM-08 foi fechada. A revisão humana controlada continua exigida antes de qualquer mudança fora das fixtures.
