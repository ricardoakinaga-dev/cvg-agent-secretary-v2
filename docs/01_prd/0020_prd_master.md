# 0020 — PRD Master

## Visao geral

A Esmeralda V2 e uma plataforma de agente hospitalar para atendimento, triagem operacional, agendamento, handoff, tarefas e auditoria. O produto deve operar em modo solo e evoluir para integracoes por adapters.

## Problema

O hospital precisa padronizar atendimento inicial e reduzir retrabalho sem criar um bot acoplado a WhatsApp ou HIS.

## Usuarios

- Recepcao como usuario primario.
- Tutor como usuario secundario.
- Operadores humanos para approvals e handoff.
- Gestao como decisor.
- Equipe clinica, financeiro e engenharia como impactados.

## Fluxos principais

- Receber mensagem e criar sessao.
- Identificar intencao.
- Identificar tutor e pet.
- Rodar triagem inicial.
- Sugerir agendamento.
- Solicitar aprovacao humana.
- Criar resumo de handoff.
- Criar tarefa interna.
- Responder duvida institucional.

## Escopo

O MVP cobre runtime, sessoes, historico, workflows iniciais, tools desacopladas, approvals, handoff, tarefas, auditoria e painel minimo.

## Regras

A agente pode coletar dados, classificar risco operacional, sugerir acoes e pedir aprovacao. Ela nao pode diagnosticar, prescrever, alterar prontuario definitivo ou executar acoes sensiveis sem regra e aprovacao.

## Requisitos funcionais

Os requisitos funcionais estao organizados em atendimento, classificacao, tutor/pet, triagem, agendamento, handoff, approvals, tarefas, auditoria e painel minimo.

## Requisitos nao funcionais

O produto exige rastreabilidade, confiabilidade, fallback para modo solo, governanca de autonomia, policy engine, idempotencia e auditoria.

## Metricas

As metricas centrais sao sessao criada, intencao classificada, tutor/pet identificado, handoff completo, tempo de resposta, approvals, tool calls e safety events.

## Riscos

- Escopo crescer para prontuario ou diagnostico cedo demais.
- Acoplamento prematuro a sistemas externos.
- Baixa adesao do operador humano se o painel for ruim.
- Falha em idempotencia gerar duplicidades.
- RAG institucional insuficiente para respostas seguras.

## Decisao de PRD

O PRD esta aprovado para SPEC documental. Ele nao aprova build irrestrito, uso com dados reais ou automacao sensivel. Implementacao funcional deve aguardar validacao humana dos limites de autonomia, regras de confirmacao de agenda, fonte RAG institucional, matriz de cargos e politica de retencao.
