# 0113 — Observabilidade, Runtime e Operacao

## Logs necessarios

- Mensagem recebida.
- Sessao criada ou retomada.
- Intencao classificada.
- Workflow iniciado e finalizado.
- Tool call solicitada, concluida ou falha.
- Policy decision.
- Approval request e decision.
- Handoff criado.
- Task criada.
- Integration event.
- Safety event.

## Metricas minimas

- Mensagens por canal.
- Tempo de criacao de sessao.
- Tempo de classificacao.
- Duracao de agent run.
- Taxa de tool call por status.
- Taxa de approvals pendentes.
- Taxa de handoff.
- Falhas por integracao.
- Safety events por categoria.

## Tracing e correlation

Toda execucao deve carregar `correlation_id` do webhook ate tool calls, approvals, tasks e eventos de auditoria.

## Health checks

- API pronta para receber mensagens.
- Worker processando jobs.
- Banco disponivel.
- Policy carregada.
- Adapter critico configurado.

## Falhas criticas monitoraveis

- Falha de persistencia.
- Policy indisponivel.
- Fila de jobs parada.
- Adapter de canal fora.
- Crescimento anormal de approvals expirados.
- Safety events repetidos.

## SLOs conceituais

- Recebimento e persistencia de mensagem: p95 menor ou igual a 2s no piloto.
- Primeira resposta ou acknowledgement: p95 menor ou igual a 10s quando dependencias externas estiverem saudaveis.
- Acoes sensiveis: 100% devem falhar fechado quando policy, auth ou audit estiver indisponivel.
- Investigabilidade: 100% das sessoes com timeline contendo mensagens, runs, tools, approvals e safety events aplicaveis.
- Duplicidade: 0 tool calls ou tasks duplicadas para a mesma idempotency key.

## Alertas minimos

- Policy indisponivel por mais de 1 minuto.
- Fila de worker sem consumo por mais de 5 minutos.
- Taxa de erro de tool call acima de 5% em janela de 15 minutos.
- Safety events de mesma categoria acima do baseline definido.
- Approval expirado acima de limite operacional aprovado.
- Webhook recebendo mensagens sem persistencia confirmada.

## Operacao

MVP opera de forma semi-autonoma. Fluxos simples podem responder, mas acoes sensiveis exigem approval ou handoff.
