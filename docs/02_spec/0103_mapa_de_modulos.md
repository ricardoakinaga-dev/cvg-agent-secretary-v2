# 0103 — Mapa de Modulos

## `apps/api`

- Responsabilidade: expor endpoints para canais, painel e comandos operacionais.
- Entradas: webhooks, requests do painel, callbacks de integracoes.
- Saidas: comandos para application layer, respostas HTTP.
- Dependencias permitidas: `shared`, casos de uso de `agent-core`, adapters via interface.
- Dependencias proibidas: acesso direto a banco por fora dos repositorios.

## `apps/worker`

- Responsabilidade: executar workflows, processar filas, retries e tarefas assincronas.
- Entradas: jobs, eventos internos, retries.
- Saidas: eventos, tool calls, mensagens e atualizacoes de estado.
- Dependencias permitidas: `agent-core`, `workflows`, `tools`, `policy`, `memory`.
- Dependencias proibidas: regra de UI.

## `apps/web`

- Responsabilidade: painel minimo.
- Entradas: operador humano.
- Saidas: comandos de approval, assuncao e acompanhamento.
- Dependencias permitidas: API e tipos compartilhados.
- Dependencias proibidas: executar tool diretamente.

## `packages/agent-core`

- Responsabilidade: runtime, sessoes, estado, orchestrator, tool registry e audit hooks.
- Entradas: mensagens normalizadas e comandos.
- Saidas: agent runs, tool calls, eventos e decisoes de proximo passo.

## `packages/workflows`

- Responsabilidade: grafos LangGraph dos fluxos iniciais.
- Entradas: estado da sessao e intencao.
- Saidas: comandos de tool, mensagens propostas e handoff.

## `packages/tools`

- Responsabilidade: contratos e implementacoes de tools.
- Entradas: comandos validados.
- Saidas: resultados tipados e erros de dominio.

## `packages/adapters`

- Responsabilidade: conectar sistemas externos e canais.
- Entradas: requests de tools ou webhooks.
- Saidas: dados normalizados e eventos de integracao.

## `packages/memory`

- Responsabilidade: memoria de fatos e contexto util.
- Entradas: eventos auditaveis e fatos aprovados.
- Saidas: contexto para workflows.

## `packages/policy`

- Responsabilidade: autonomia, approvals, safety e bloqueios.
- Entradas: acao proposta, contexto e nivel de autonomia.
- Saidas: permitido, bloqueado, requer aprovacao ou handoff.

## `packages/rag`

- Responsabilidade: consulta institucional autorizada.
- Entradas: pergunta e contexto.
- Saidas: resposta com fonte ou falha segura.

## `packages/shared`

- Responsabilidade: tipos, schemas, erros, envelopes e constantes compartilhadas.

## Ordem sugerida de construcao

1. `shared`
2. `agent-core`
3. `policy`
4. `tools`
5. `workflows`
6. `memory`
7. `adapters`
8. `api`
9. `worker`
10. `web`
