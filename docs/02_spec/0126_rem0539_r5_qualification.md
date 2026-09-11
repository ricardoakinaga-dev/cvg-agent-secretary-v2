# 0126 — SPEC R5: execução da qualificação

Data: 2026-09-05. Programa: `REM-0539`. Onda: R5. Estado: `SPEC_APPROVED_CONTROLLED_BUILD`.

`runControlledQualification` recebe métricas e gates explicitamente nomeados, valida p95 contra metas registradas, exige zero perdas/duplicidades no ensaio e devolve `QUALIFIED_CONTROLLED` ou `NO_GO`. A função não altera estado de produção e não transforma mock em integração. Evidências são hashes de logs e artefatos; dados são sintéticos. Playwright e testes unitários registram apenas o escopo de teclado/foco exercitado, sem declarar certificação integral.
