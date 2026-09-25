# Reseal Phase 11 — execução local controlada — 2026-09-25

Admissão no [recibo nº 3](AUD20-20250925-human-decisions-3-20260925.md). Candidato congelado `98a9636db6d5` / `candidateId 06e1477ebe76` (pin de mutation corrigido em `f66a022`). Log integral: [certify](AUD20-reseal-certify-20260925.log).

## Resultado

`certificationId phase11-06e1477ebe76b2f5-muh112ux`; **`decision=NO_GO`, `certification=NO_GO`** — fail-closed correto. O ponteiro `certification/current.json` passou a apontar para o pacote novo (não mais stale).

### Gates não-PASS e causa raiz

| Gate | Status | Causa raiz | Remediação |
|---|---|---|---|
| `coverage` | FAIL | `critical_branch_coverage:kernel:89.37` e `approval:77.64` — medidos **sem PostgreSQL**, com os 192 skips condicionais derrubando ramos de módulos críticos (com DB o histórico registra kernel 95,10% e approval ~98%) | Rodar o certify com PostgreSQL descartável autorizado (`TEST_DATABASE_URL` + `PHASE11_ALLOW_DISPOSABLE_POSTGRES=1`) |
| `postgres` | NOT_EXECUTED | `TEST_DATABASE_URL_not_authorized_or_configured` | Mesma da anterior (admissão própria + contêiner descartável) |
| `e2e` | FAIL | 3 falhas de `tests/e2e/aud20-19-human-session-harness.spec.ts` (chromium/firefox/webkit) no suite padrão — o harness FU1 exige o profile/config dedicado `aud20-19-human-session` | Excluir do config padrão ou gatear por profile/env dedicado (fatia própria) |
| `independent_critic` | FAIL | O pacote carrega critic report **stale** (`fbca3d2b…`, digests de artefatos divergentes) | Gerar critic report fresh-context no formato Phase 11 para o candidato congelado |
| `PHASE11_FORMAL_CLOSURE` | FAIL | Consequência: gates obrigatórios/invariantes (INV-007..014 `NOT_RUN`/`FAIL`) e findings `AUD-11-05/07 PARTIAL` | Fechar os gates acima e reexecutar |

### Pós-reseal (read-only)

- `certification:verify:phase11`: **FAIL** (6 falhas) — critic stale, `critic-report.json`/`mutation-*-report.json` ainda **não rastreados** no git e recálculo de decisão/scores divergente. Ver [log](AUD20-reseal-verify-post-20260925.log).
- `promotion:check`: `eligible:false`, `verifier:FAIL`, `reason:current_certification_invalid`, `noProductionEffect:true`, 8 bloqueios externos. Ver [log](AUD20-reseal-promotion-post-20260925.log).

## Leitura

O reseal cumpriu o objetivo de **substituir o pacote stale por um pacote do candidato atual**, com resultado honesto `NO_GO` e lista de remediação acionável. Nenhum gate foi afrouxado; nenhuma promoção, deploy, staging ou produção.

## Próximos passos recomendados (cada um exige admissão própria)

1. **Gatear o harness AUD20-19 fora do e2e padrão** (corrige `e2e`).
2. **Critic report Phase 11 fresh-context** para o candidato congelado (corrige `independent_critic`).
3. **Reexecutar o certify com PostgreSQL descartável autorizado** (corrige `postgres` + pisos críticos de `coverage`), seguido de commit dos artefatos para limpar `required_package_not_tracked`.

Com os três, a closure local pode avançar; a promoção seguirá limitada pelos 8 gates externos e pela sessão humana adiada.
