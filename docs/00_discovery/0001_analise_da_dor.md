# 0001 — Analise da Dor

## Quem sofre a dor

- Recepcao, que precisa responder, classificar e encaminhar conversas rapidamente.
- Tutores, que precisam de respostas claras e encaminhamento correto.
- Equipe clinica, que recebe contexto incompleto quando ocorre handoff.
- Gestao, que precisa de rastreabilidade, qualidade e previsibilidade operacional.

## Quando ocorre

A dor ocorre em interacoes de atendimento, triagem, agendamento, duvidas institucionais, confirmacao de agenda, retorno pos-atendimento e escalonamento humano.

## Frequencia

Recorrente. O blueprint descreve fluxos iniciais de atendimento e operacao que tendem a ocorrer diariamente no hospital.

## Impacto

- Tempo: recepcao gasta tempo repetindo coleta de dados e resumindo casos.
- Erro: risco de contexto incompleto, handoff fraco ou acao sensivel sem validacao.
- Experiencia: tutores podem receber atendimento lento ou inconsistente.
- Operacao: falta de auditoria dificulta entender o que aconteceu em uma conversa.

## Consequencia de nao resolver

O hospital continua dependente de processos manuais, com baixa rastreabilidade, pouca automacao segura e risco de construir apenas um bot acoplado ao canal.

## Evidencias observadas no blueprint

- Necessidade explicita de registrar conversas, sessoes, tool calls, approvals, handoffs, tasks e safety events.
- Necessidade de approval layer para acoes sensiveis.
- Necessidade de operar em modo solo e integrado.
- Necessidade de comecar por fluxos simples, evitando diagnostico e automacao medica avancada.

## Perguntas respondidas

- Isso acontece sempre ou pontualmente? Recorrente nos fluxos de atendimento e operacao.
- Isso impacta operacao ou so percepcao? Impacta operacao, qualidade de handoff, tempo e auditoria.
- Isso gera prejuizo real? Sim, na forma de retrabalho, demora, risco operacional e baixa rastreabilidade.
