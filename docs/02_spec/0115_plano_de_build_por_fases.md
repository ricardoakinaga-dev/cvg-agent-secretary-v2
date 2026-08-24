# 0115 — Plano de Build por Fases

## Fase 0 — Fundacao

- Objetivo: criar monorepo, shared, configuracao, validacao e base de runtime.
- Pre-requisitos: SPEC aprovada.
- Modulos: `shared`, estrutura `apps` e `packages`.
- Entregaveis: skeleton, schemas, erros, envelope, configuracao.
- Riscos: estrutura excessiva sem fluxo.
- Criterio de pronto: build e testes base rodando.

## Fase 1 — Dominio base

- Objetivo: implementar entidades, repositorios e estados.
- Modulos: `agent-core`, persistencia, audit base.
- Entregaveis: conversas, sessoes, mensagens, agent runs e tool calls.
- Riscos: modelagem fraca de auditoria.
- Criterio de pronto: receber mensagem e persistir timeline.

## Fase 2 — Fluxos principais

- Objetivo: implementar workflows iniciais.
- Modulos: `workflows`, `policy`, `tools`.
- Entregaveis: identificacao, triagem, handoff, task e duvida institucional.
- Riscos: workflow assumir regra clinica.
- Criterio de pronto: fluxos executam com policy.

## Fase 3 — Integracoes

- Objetivo: conectar canais e adapters iniciais.
- Modulos: `adapters`, `api`, `worker`.
- Entregaveis: webhook de mensagem, adapter WhatsApp ou mock, integração local.
- Riscos: canal virar nucleo.
- Criterio de pronto: adapter substituivel e auditado.

## Fase 4 — Frontend operacional

- Objetivo: painel minimo.
- Modulos: `web`, API de painel.
- Entregaveis: conversas, timeline, approvals e tasks.
- Riscos: UI executar regra indevida.
- Criterio de pronto: operador consegue aprovar e investigar.

## Fase 5 — Hardening

- Objetivo: confiabilidade, observabilidade, seguranca e idempotencia.
- Modulos: todos.
- Entregaveis: logs, metricas, retries, DLQ conceitual, testes de falha.
- Riscos: gaps escondidos.
- Criterio de pronto: auditoria pre-runtime aprovada.

## Fase 6 — Rollout controlado

- Objetivo: liberar uso assistido.
- Modulos: runtime, web, canal e audit.
- Entregaveis: operacao piloto, relatorio, ajustes.
- Riscos: regras incompletas de agenda.
- Criterio de pronto: fluxo real validado com humanos.
