# 0003 — Fluxo Atual

## Sequencia atual do problema

1. Tutor inicia contato por canal de mensagem.
2. Recepcao interpreta a demanda.
3. Recepcao solicita dados de tutor e pet.
4. Recepcao decide se e duvida simples, triagem, agendamento, retorno ou handoff.
5. Quando necessario, recepcao consulta agenda, HIS ou outro sistema.
6. Recepcao responde ou encaminha para humano.
7. Parte do contexto pode ficar dispersa no canal, no sistema interno ou na memoria da equipe.

## Decisoes

- A demanda pode ser respondida automaticamente?
- E necessario coletar mais dados?
- Ha risco operacional ou clinico?
- A acao exige aprovacao humana?
- O caso deve gerar tarefa interna?

## Handoffs

- Tutor para recepcao.
- Recepcao para equipe clinica.
- Agente para humano.
- Agente para sistema externo via adapter.

## Gargalos

- Identificacao repetitiva de tutor e pet.
- Falta de resumo padronizado de handoff.
- Dependencia de canal especifico.
- Falta de trilha de auditoria consistente.

## Falhas

- Contexto incompleto no encaminhamento.
- Respostas inconsistentes.
- Risco de acao sensivel sem regra formal.
- Dificuldade de investigar conversas antigas.

## Retrabalho

- Recoleta de dados.
- Reexplicacao do caso para outro humano.
- Registro manual em sistemas separados.
- Checagem manual de tarefas e pendencias.

## Excecoes conhecidas

- Emergencia ou risco clinico deve escalar.
- Diagnostico e prescricao sao proibidos.
- Confirmacoes sensiveis exigem regra ou aprovacao.
- Integracao externa indisponivel deve cair para modo solo ou fila humana.
