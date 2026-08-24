# 0015 — Metricas de Sucesso

## KPIs operacionais

- Percentual de mensagens com sessao criada.
- Percentual de conversas classificadas por intencao.
- Percentual de casos com tutor e pet identificados ou draft criado.
- Percentual de handoffs com resumo completo.
- Tempo medio ate primeira resposta.
- Tempo medio ate classificacao.
- Taxa de escalonamento humano.
- Taxa de approvals aprovados, rejeitados e expirados.

## KPIs de qualidade

- Taxa de tool calls bem-sucedidas.
- Taxa de duplicidade evitada.
- Quantidade de safety events.
- Percentual de conversas investigaveis por auditoria.
- Numero de respostas bloqueadas por policy.

## Metas iniciais do MVP

- 100% das mensagens recebidas registradas em conversa e sessao.
- 100% das tool calls auditadas.
- 100% das acoes sensiveis passando por policy.
- 90% dos handoffs com resumo estruturado.
- Zero diagnostico fechado ou prescricao automatica.
- 0 mensagens aceitas perdidas em falha controlada de worker.
- 0 approvals decididos duas vezes.
- 95% das mensagens com persistencia inicial em ate 2s no ambiente de piloto.
- 100% dos eventos sensiveis com actor, timestamp, correlation id e policy version.

## Criterios de sucesso

O MVP e bem-sucedido quando a Esmeralda V2 opera fluxos iniciais de atendimento com rastreabilidade, policy, approvals e handoff, mantendo autonomia limitada entre nivel 1 e nivel 2.

## Criterios de reprova

- Qualquer resposta com diagnostico fechado ou prescricao automatica.
- Qualquer acao sensivel executada sem policy decision registrada.
- Qualquer tool call sem trilha auditavel.
- Qualquer uso de dado real sem politica de retencao e acesso aprovada.
- Qualquer workflow de agenda confirmando acao sem regra operacional formal.
