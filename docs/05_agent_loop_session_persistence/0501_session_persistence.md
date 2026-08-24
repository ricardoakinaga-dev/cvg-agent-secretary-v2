# 0501 — Session Persistence

## Objetivo

Garantir continuidade de execucao entre rodadas de agente, interrupcoes e retomadas.

## Estado minimo persistido

- Projeto atual.
- Engine atual.
- Phase atual.
- Sprint atual.
- Task atual.
- Status.
- Ultima acao concluida.
- Proxima acao.
- Bloqueios.
- Decisao humana pendente.
- Timestamp.

## Regras para Esmeralda V2

- Enquanto o projeto estiver documental, a sessao operacional aponta para `current_engine: RUNTIME`.
- Antes de implementar codigo, o estado deve voltar para `BUILD`.
- Se uma regra humana estiver pendente, marcar `WAITING_HUMAN_APPROVAL`.
- Se um gate estiver ausente, marcar `BLOCKED`.

## Retomada

Ao reiniciar uma tarefa, o agente deve ler `99_runtime_state.md`, verificar o log e continuar da `next_action`, nao da memoria da conversa.
