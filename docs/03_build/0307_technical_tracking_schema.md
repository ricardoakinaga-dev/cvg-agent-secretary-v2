# 0307 — Technical Tracking Schema

## Objetivo

Definir os arquivos JSON usados para acompanhar execucao tecnica. O executor deve atualizar estes arquivos ao concluir ou bloquear qualquer task.

## Arquivos de tracking

- `docs/03_build/tracking/build_tracking.json`: estado consolidado de phases, sprints, tasks, gates e bloqueios.
- `docs/03_build/phase_0/sprint_0_tracking.json`: acompanhamento detalhado da Sprint 0.
- Fases futuras devem criar `docs/03_build/phase_N/sprint_N_tracking.json` antes de iniciar execucao.

## Estados validos

- `NOT_STARTED`
- `IN_PROGRESS`
- `BLOCKED`
- `WAITING_HUMAN_APPROVAL`
- `DONE`
- `FAILED_VERIFICATION`

## Campos obrigatorios por task

```json
{
  "id": "P0-S1-T01",
  "status": "NOT_STARTED",
  "source_refs": [],
  "files_expected": [],
  "tests_expected": [],
  "validation_commands": [],
  "blockers": [],
  "evidence": {
    "commands_run": [],
    "files_created": [],
    "tests_added": []
  }
}
```

## Regras de atualizacao

- Antes de iniciar task: status `IN_PROGRESS`.
- Se faltar decisao humana: status `WAITING_HUMAN_APPROVAL`.
- Se faltar contrato, arquivo, permissao ou comando: status `BLOCKED`.
- Se comando falhar: status `FAILED_VERIFICATION`.
- Se todos os criterios passarem: status `DONE`.
- Nunca marcar sprint `DONE` se alguma task estiver diferente de `DONE`.
- Nunca marcar phase `DONE` se algum sprint estiver diferente de `DONE`.
