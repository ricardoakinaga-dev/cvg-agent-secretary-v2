# AUD20-17-FU1 — fechamento dos achados da crítica de evidência v2

- escopo: verificar se os achados da crítica de implementação v1 foram
  endereçados e se os recibos necessários para a revisão final estavam
  registrados;
- veredito intermediário: **CONDITIONAL**;
- limite: revisão local de evidências, sem alteração do candidato.

## Achados e resposta

1. As verificações estáticas precisavam de recibos salvos para permitir
   auditoria reproduzível. Foram guardados os logs de typecheck, lint,
   format:check e docs:check no diretório
   [recibos brutos](AUD20-17-query-raw-20260923/).
2. Rollback precisava de ensaio registrado. Foi executado somente em uma cópia
   temporária isolada; o relatório
   [rollback rehearsal](AUD20-17-query-rollback-rehearsal-20260923.json)
   registra `PASS_ISOLATED`, restauração simulada dos sete owners e bytes
   inalterados de request-context e seu teste.

A crítica final fresh-context revalidou o manifesto de hashes antes e depois,
inspecionou os artefatos e recibos e concluiu `PASS` para a fatia query-parser.
O ensaio isolado não equivale a rollback aplicado ao worktree corrente.

