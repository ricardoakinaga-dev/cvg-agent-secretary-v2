# IMP50-49 — busca read-only de referências exatas — 2026-09-24T07:10Z

## Pergunta e limites

Follow-up da regra humana para os 141 vínculos: manter todos sem adjudicação
até evidência suficiente e exigir suporte por arquivo. A busca não abre payloads
raw, não muda o mapa/classificações e não substitui a v1 ou o suplemento v2.
Alvos: os 141 caminhos únicos do mapa v2, SHA-256
`03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`.

Foi feita busca literal `rg --json --only-matching --fixed-strings` pelos 141
caminhos nos arquivos de texto visíveis do repositório. Foram excluídos
diretórios `raw/`, `human-sessions/`, vendor/build, `.git`, `.gauntlet`, os
artefatos derivados `imp50-49-*` e o diretório do snapshot PLAN50 para não
contar o próprio inventário/mapa como suporte. Nenhum payload de evidência foi
aberto.

## Resultado

Foram encontradas 27 ocorrências literais para 13 dos 141 caminhos:

1. **12 caminhos** aparecem nas saídas Prettier de
   `AAA/AAA-21/checks/aaa21-format-bound.log` e
   `AAA/AAA-21/checks/full-cert/format.log`:
   - `docs/04_audit/evidence/PROD-20260913/m1-fresh-review-round3/fingerprint-before.json`
   - `docs/04_audit/evidence/PROD-20260913/m1-fresh-review-round3/fingerprint-final.json`
   - `docs/04_audit/evidence/PROD-20260913/m1-fresh-review-round3/probe-a2-timers.ts`
   - `docs/04_audit/evidence/PROD-20260913/m1-fresh-review-round3/probe-c-atomicity.ts`
   - `docs/04_audit/evidence/PROD-20260913/m1-fresh-review-round3/probe-d-preflight.ts`
   - `docs/04_audit/evidence/PROD-20260913/m1-fresh-review-round3/probe-e-http-spoof.ts`
   - `docs/04_audit/evidence/PROD-20260913/reaudit-round3/wave-review/ENVIRONMENT.md`
   - `docs/04_audit/evidence/PROD-20260913/reaudit-round3/wave-review/fingerprint-after.json`
   - `docs/04_audit/evidence/PROD-20260913/reaudit-round3/wave-review/fingerprint-before.json`
   - `docs/04_audit/evidence/PROD-20260913/reaudit-round3/wave-review/probe-identity.ts`
   - `docs/04_audit/evidence/PROD-20260913/reaudit-round3/wave-review/probe-regression.ts`
   - `docs/04_audit/evidence/PROD-20260913/reaudit-round3/wave3-01-fix/probes/probe-real-socket.ts`

   All 12 map rows currently say original `UNCLASSIFIED`, proposed
   `HISTORICAL`, support `basename_only`. The full-cert format log prints the
   exact paths at lines 222–227, 277–281 and 285; the earlier root-level log
   repeats them at lines 218–223, 273–277 and 281. The full-cert log SHA-256 is
   `d3cb23784cc406ae1c9c36575ef2632e89bd5f3c0d5b572e6cd685c24957cdc0`. Its header binds it to run
   `run-bf035ddfe187-mu0ldbpd` / candidate
   `bf035ddfe1874918cc01fdca99a7f199393894cbf7fa0e803063f3085c43f426`; the
   full-cert manifest records the format-log SHA-256
   `exitCode=1`. The companion candidate manifest has 895 files but contains no
   hashes for these 12 targets. `checks/README.md` identifies the full-cert
   copy as the manifest-referenced check and the root-level bound log as an
   earlier candidate retained for provenance. The logs therefore show exact
   path strings observed by a formatter run, but do not hash-bind the target
   file bytes or prove their membership in the original production-review run.

2. **One path** —
   `docs/04_audit/evidence/AUD19/AUD19-11-digests.json` — appears three times:
   `scripts/build-digests.mjs` lines 11 and 26 and `scripts/phase11-certify.mjs`
   line 1397. The references are present in `HEAD`, but are source-code path
   declarations/readers, not a run receipt or target-file binding. Its map row
   remains original `ORPHAN`, proposed `HISTORICAL`, support `basename_only`.

The other 128 target paths had no exact literal occurrence in this search
scope. The v1 inventory, v2 inventory and 141-row map hashes remain unchanged.
No path class or row disposition was altered. All 141 remain unadjudicated.

## Registro reproduzível

O [receipt JSON](imp50-49-exact-path-search-receipt-20260924.json) registra o
SHA-256 do mapa-alvo, a versão do ripgrep, os filtros do corpus e o digest da
lista ordenada de caminhos pesquisados (3.245 arquivos;
`e54c95ebd9f7c0fa54cabfbe61b06ab0b71daefcba64a43a5fe9a133fd6823df`). Foram
incluídos somente arquivos de texto com extensões documentadas no receipt;
raw, sessões humanas, vendor/build/dist/coverage, `.git`, `.gauntlet`, derivados
IMP50-49 e o diretório PLAN50 do próprio inventário foram excluídos. O comando
usou correspondência literal do caminho relativo completo com
`rg --json --only-matching --fixed-strings`; o receipt enumera cada ocorrência
por caminho-alvo, arquivo de origem e linha, sem copiar linhas ou payloads.

O digest do corpus vincula a enumeração de caminhos, não os bytes de cada fonte
pesquisada. As menções continuam candidatas; o resultado não muda a regra de
suporte autoritativo por arquivo nem adjudica qualquer linha.

## Disposição

These hits are candidate evidence for human/independent review, not an
adjudication. The format logs prove exact path text was emitted during a
formatter check, but they are not original execution manifests for the
referenced files; the source-code match is weaker. Continue to preserve v1 as
baseline and v2 as the immutable supplement. Discovery 0022 remains
`IN_PROGRESS`; no `DISCOVERY_READY`, PRD, SPEC, checker or BUILD follows from
this search. A fresh critic must review the updated Discovery and this report.
