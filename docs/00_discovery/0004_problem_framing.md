# 0004 — Problem Framing

## Definicao clara do problema

O hospital precisa de uma agente operacional capaz de organizar atendimento, triagem, agenda, handoff, tarefas e registros sem nascer acoplada a um canal ou a um sistema interno especifico.

## Escopo do problema

O problema a resolver no MVP e a falta de um runtime operacional que:

- receba mensagens;
- crie sessoes;
- identifique intencoes;
- identifique tutor e pet;
- rode triagem simples;
- gere resumo de handoff;
- registre auditoria;
- peca aprovacao humana;
- crie tarefas internas.

## O que nao sera resolvido agora

- Diagnostico veterinario.
- Prescricao de tratamento.
- Automacao medica avancada.
- Alteracao definitiva de prontuario sem aprovacao.
- Cobranca sensivel.
- Confirmacao automatica de procedimento caro.
- Dependencia obrigatoria de HIS, Desk ou CIP.

## Limites da solucao

O MVP opera entre autonomia nivel 1 e nivel 2. A agente coleta dados e sugere acoes, mas a execucao sensivel passa por policy engine e human approval layer.

## Simplificacao do problema

Construir primeiro a base de runtime, memoria, workflows, tools e auditoria para fluxos de atendimento inicial. A integracao profunda com sistemas hospitalares fica atras de adapters.

## Criterio de mensurabilidade

O problema sera considerado bem recortado se o MVP conseguir rastrear cada atendimento do recebimento da mensagem ao handoff ou tarefa, com sessao, mensagens, tool calls, approvals e eventos de auditoria.
