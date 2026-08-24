# 0000 — Trigger

## Origem da ideia

A necessidade nasce da visao de criar a Esmeralda V2 como agente operacional hospitalar para comunicacao, triagem, agenda, tarefas e apoio interno do hospital veterinario.

## Tipo de gatilho

- Dor operacional: atendimento e triagem dependem de humanos e sistemas fragmentados.
- Oportunidade: construir uma plataforma de agente hospitalar reutilizavel.
- Insight arquitetural: evitar o erro de nascer como bot de WhatsApp acoplado ao HIS.

## Contexto inicial

O hospital precisa atender mensagens, identificar tutor e pet, classificar demandas, coletar dados, sugerir ou executar acoes controladas, registrar historico e escalar para humano quando necessario.

## Percepcao livre

A Esmeralda V2 deve operar como runtime de agente hospitalar. WhatsApp, HIS, Desk e CIP sao sistemas externos ou canais, nao o nucleo do produto.

## Quem identificou

CVG, a partir do blueprint `BRIEFING/Blueprint — cvg-agent-secretary-v2`.
