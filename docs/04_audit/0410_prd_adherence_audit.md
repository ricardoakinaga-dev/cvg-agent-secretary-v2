# 0410 — PRD Adherence Audit

## Objetivo

Validar se a Esmeralda V2 faz o que o PRD prometeu.

## Fluxos reais vs esperados

Fluxos esperados:

- Receber mensagem e criar sessao.
- Identificar intencao.
- Identificar tutor e pet.
- Rodar triagem inicial.
- Sugerir agendamento.
- Solicitar aprovacao humana.
- Criar handoff.
- Criar tarefa.
- Responder duvida institucional.

## Regras de negocio a validar

- WhatsApp e canal, nao nucleo.
- Acoes sensiveis passam por policy.
- Handoff contem resumo estruturado.
- Diagnostico e prescricao sao bloqueados.
- Modo solo funciona sem HIS.

## Classificacao

```txt
STATUS ATUAL: NAO EXECUTADO
MOTIVO: sistema ainda nao construido
```

## Evidencias exigidas na auditoria real

- Logs de cada fluxo.
- Eventos de tool call.
- Approval requests.
- Safety events.
- Screenshots ou registros do painel.
