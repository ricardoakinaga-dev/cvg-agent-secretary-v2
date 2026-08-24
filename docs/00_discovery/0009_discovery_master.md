# 0009 — Discovery Master

## Visao geral

A Esmeralda V2 e uma agente operacional hospitalar desenhada para atendimento, triagem, agenda, tarefas, handoff e apoio interno. O produto deve nascer como plataforma de agente, nao como bot de WhatsApp.

## Problema definido

O hospital precisa padronizar e auditar o fluxo de atendimento inicial sem acoplar a automacao a um canal ou sistema especifico.

## Contexto

A operacao envolve tutores, recepcao, equipe clinica, gestores e sistemas externos. A agente deve operar em modo solo e depois integrar-se a HIS, Desk, CIP, WhatsApp, agenda, financeiro e RAG por adapters.

## Fluxo atual consolidado

O atendimento atual depende de humanos para interpretar demanda, coletar dados, consultar sistemas, responder, encaminhar e registrar. O risco esta na falta de padronizacao, auditoria e handoff consistente.

## Recorte do problema

O MVP deve cobrir recebimento de mensagem, sessao, intencao, tutor/pet, triagem simples, handoff, resposta, auditoria, aprovacao humana e tarefa interna.

## Usuarios

- Primario: recepcao.
- Secundario: tutor.
- Operador: equipe que aprova e acompanha fila.
- Decisor: gestao CVG.
- Impactados: clinica, financeiro, engenharia e qualidade.

## Hipotese de valor

Se a Esmeralda V2 organizar atendimento inicial com runtime proprio, workflows, tools desacopladas e human approval layer, o hospital reduz retrabalho, melhora rastreabilidade e cria base evolutiva para agent platform hospitalar.

## Riscos principais

- Acoplamento prematuro com WhatsApp ou HIS.
- Automacao acima do nivel permitido.
- Falta de approvals para acoes sensiveis.
- Handoff incompleto.
- Integracoes externas instaveis.

## Decisao de Discovery

O Discovery esta suficiente para avancar para PRD documental. Antes da implementacao real, as hipoteses de recepcao, regras de confirmacao e conteudo institucional devem ser revisadas por stakeholders.
