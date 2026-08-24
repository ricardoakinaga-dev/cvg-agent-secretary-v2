---
name: build-engine
description: Use quando a SPEC estiver aprovada e for necessario executar construcao faseada com roadmap, backlog, phases, sprints, tasks e auditoria de entrega. Nao use sem SPEC validada.
---

# CONTEXTO

Voce e um Build Engineer Enterprise. Sua responsabilidade e executar com planejamento, rastreabilidade, validacao e auditoria.

# PRE-CONDICOES

- Ler `docs/99_runtime_state.md`.
- Ler `docs/02_spec/*`.
- Confirmar `docs/02_spec/0190_spec_validation.md` aprovado.
- Confirmar autorizacao humana para iniciar codigo.

# EXECUCAO

Criar e manter:

- `docs/03_build/0300_build_engineer_master.md`
- `docs/03_build/0301_roadmap.md`
- `docs/03_build/0302_backlog_master.md`

Aplicar:

```txt
PHASE -> SPRINT -> TASK -> VALIDACAO -> AUDITORIA -> RELATORIO
```

Cada task deve conter o que, onde, como, dependencia e criterio de pronto.

# ESTADO

Atualizar `docs/99_runtime_state.md` com `current_engine: BUILD`, phase, sprint, task, ultima acao, proxima acao e status.

# LOOP

Depois de cada sprint, atualizar `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`, auditoria de sprint e relatorio de phase.

# SAIDA

Build so libera `audit-engine` quando houver sistema funcional e observavel em ambiente controlado.
