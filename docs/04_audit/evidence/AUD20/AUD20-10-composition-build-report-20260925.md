# AUD20-10/IMP50-09 — BUILD local do collector conectado — 2026-09-25

Slice aprovado por [SPEC/hash](../../../02_spec/aud20_10_operational_observability_20260922.md) (`83130cdf…`), admissão em 0190/0337 e [recibo humano](AUD20-10-human-approval-20260923.md). Escopo: conectar API e worker ao mesmo contrato de collector e exercitar correlação sintética. `approval_latency_ms`, alertas, delivery ledger, owner e SLO permanecem em fatias posteriores.

## Mudanças (allowlist)

- `packages/observability/src/collector.ts`: buffer compartilhado ganhou limites opt-in (capacidade + lote) e `seal()`; nova factory de harness `createControlledLocalCollector` com perfil `CONTROLLED_LOCAL_SYNTHETIC`, nomes de arquivo constantes (`api.jsonl`/`worker.jsonl`), raiz temporária exclusiva canonicalizada, rejeição de produção/symlink/traversal/chaves extras (inclusive `filePath` do chamador), buffer 512 e lote 256, `close()` idempotente que drena até 2 lotes e contabiliza registros pós-fechamento; `resolveControlledLocalRoot` exportado para verificação.
- `apps/api/src/server.ts`: novo `runtimeCollector?: ObservabilityCollectorPort` em `BuildServerOptions`; `emitRuntimeLog` projeta somente `event`, `correlationId`, `operation` constante e `outcome`; hook `onClose` aguarda `flush()`/`close()` (inclusive na falha via `finally`). As adições foram compensadas por compactação de comentários para manter o cap congelado `server+context+query ≤ 5050` (soma final `5050`).
- `apps/worker/src/controlled-memory-runtime.ts` (novo): função import-safe que recebe o adapter compartilhado e o collector, drena com `createControlledWorker` real e handlers sem efeito externo, registra a correlação do evento no collector e fecha em `finally`.
- `apps/worker/src/main.ts`: o ramo `controlled-memory` passa a delegar à função nova com o mesmo comportamento default (sem collector; sem alteração de configuração de processo).
- `tests/aud20-10-composition.test.ts` (novo): contrato da factory/limites e negativos (perfil, produção, raiz fora de temp, traversal, symlink, chave extra, buffer/lote, erro de escrita, close) + exercício integrado API→outbox→worker com a mesma correlação e ausência de IDs pessoais/free text no export; falha do drain ainda faz flush/close.

## Gates

| Gate | Resultado |
|---|---|
| Focados (`aud20-10-composition`, `architecture`, `observability`, `collector`, `observability-exercise`) | PASS (5 arquivos / 33 testes) |
| `typecheck` / `lint` / Prettier / `git diff --check` | PASS |
| `docs:check` | PASS |
| Suíte completa + coverage | 305 arquivos passed / 12 skipped; **2.647 PASS** / 192 skips; statements 92,98%, branches 90,18%, functions 91,30%, lines 93,47% — [log final](AUD20-10-composition-coverage-final-20260925.log) `9c0f69d8…` |
| Mutation dirigida (6 mutantes novos + 16 da seleção) | **22/22 detected, 0 notDetected, 0 notApplicable** na árvore final — [JSON](AUD20-10-directed-mutation-20260925.json) `83fbe5cb…` |
| Cap de arquitetura AUD19-07/AUD20-17 | Reposto: `server.ts` 4584 + context 328 + query 138 = **5050/5050** |

## Remediação pós-crítica (v1 CONDITIONAL → v2)

- **F1** symlink de destino: `writeBatch` agora rejeita sink que seja symlink (`lstat` com `throwIfNoEntry`); negativo novo no teste.
- **F2** raiz igual a `tmpdir()`: contenção exige caminho estritamente dentro do temp; negativo novo.
- **F3** limites eleváveis: `maxBufferRecords`/`maxBatchRecords` são validados contra os caps do harness (≤512/≤256 e lote ≤ buffer); negativos para 513, 257 e para `lote > buffer` (4/5).
- **F4** negativos obrigatórios: adicionados raiz ausente, symlink de sink, ausência de transporte de rede (varredura do módulo), correlação divergente explícita (evento enfileirado com correlação distinta detectado), falha no `onClose` da API (rejeita e ainda fecha), canary no export integrado e assert de zero drops.
- **F5** mutantes 01/02 agora são de remoção (`if (false)`), isolando a direção fail-closed; reexecução 22/22.
- **F6** manifesto `AUD19-08-mutants.json` versionado para v2 com `lastExtendedAt`; o pin `MUTATION_MANIFEST_SHA256` em `scripts/lib/mutation-sentinel.mjs` segue obsoleto (`545ba85f…`) — **fora da allowlist desta fatia**, registrado para reconciliação no reseal aprovado.

## Limites

- Nenhum listener, socket, OTLP, PostgreSQL, timer, dado real, staging, produção, commit, push ou deploy.
- Owner/SLO e delivery ledger/alertas ficam fora desta fatia (C01–C07 de `AUD20-10` permanecem abertos até as demais fatias e decisões humanas).
- Os arquivos JSONL do exercício vivem em raiz temporária descartável e não entram no repositório.
- Seleção de mutation ampliada em `docs/04_audit/evidence/AUD19/AUD19-08-mutants.json` (batch `AUD20-10`, v2) sob a admissão de mutation vigente; sujeita à crítica.
- A rodada de coverage v2 (`AUD20-10-composition-coverage-v2-20260925.log`) falhou apenas em `docs-integrity` por um link relativo errado no relatório desta fatia (corrigido); nenhuma falha de produto.
- Crítica delta fresh-context: `PASS` para o slice; restam MINORs registrados (negativo `lote > buffer` adicionado depois; teste do symlink não prova o "inert"; relatório de mutation não byte-bound ao candidato — mitigado pela reexecução do sentinel na árvore final; pin canônico do manifesto obsoleto, fora da allowlist/reseal). Suíte final `npm test`: 305 arquivos/2.647 testes PASS ([log](AUD20-10-composition-final-test-20260925.log) `5b8f5b11…`).
