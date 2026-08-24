# AGENTS.md — cvg-agent-secretary-v2

Este repositorio opera pelo pipeline CVG documentado em `docs/07_agents/AGENTS.md`.

Antes de qualquer alteracao, o agente deve ler:

- `docs/07_agents/AGENTS.md`
- `docs/99_runtime_state.md`
- `docs/20_master_execution_log.md`
- `docs/30_backlog_master.md`

Regras principais:

- Seguir `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`.
- Nao iniciar codigo sem gate aprovado e task registrada.
- Nao usar dados reais.
- Nao liberar producao irrestrita.
- Nao confirmar, cancelar ou reagendar consulta real automaticamente.
- Nao responder RAG sem fonte institucional aprovada.
- Nao executar acao clinica, financeira ou prontuario definitivo.
- Toda acao sensivel exige approval ou handoff.
- Ao final de qualquer rodada, atualizar runtime state, execution log, backlog quando aplicavel e evidencias.

Fonte operacional completa: `docs/07_agents/AGENTS.md`.
