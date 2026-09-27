# Re-certificação Phase 11 pós-owner/SLO com PostgreSQL descartável — 2026-09-26

Execução da metade executável da `next_action` canônica ("re-certificar o novo candidato pós-owner/SLO antes do sign-off (8)"). A outra metade (insumos do item B) segue aguardando o usuário.

## Ambiente e admissão

- Node `22.23.2`; perfil `STAGING` solicitado / `CONTROLLED_LOCAL` de implantação.
- PostgreSQL descartável próprio: contêiner `cvg-aud20-recert-pg-20260926` (`postgres:16-alpine`), loopback `127.0.0.1:55441`, banco `cvg_recert`, credencial throwaway; destruído ao final da rodada. Nenhum outro banco, dado real, staging ou produção tocado.
- `TEST_DATABASE_URL` + `PHASE11_ALLOW_DISPOSABLE_POSTGRES=1` apenas durante o run.
- Nenhum push, deploy, publicação ou egress.

## Comando

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
TEST_DATABASE_URL='postgres://cvg:...@127.0.0.1:55441/cvg_recert' \
PHASE11_ALLOW_DISPOSABLE_POSTGRES=1 npm run certify:phase11
```

Log integral: [`AUD20-recert-pg-20260926.log`](AUD20-recert-pg-20260926.log).

## Candidato e crítico

- Candidato selado: `candidateId fa05bd7ebd77b19e…`, `treeHash 20089fd5a8da8aea…`, `commit 8a8c5a6c17f6`, `branch main`, `dirty=false`, 1208 arquivos, worktree limpo.
- Relatório de crítico fresh-context regravado para este candidato: [`AUD19-08-critic-report.json`](../AUD19/AUD19-08-critic-report.json), identidade `opencode-independent-critic-phase11-r3-20260926`, `P0=0`, `P1=0`, `P2=5`, `verdict=PASS`; validado por `node scripts/phase11-2-evidence-check.mjs --critic` → `PASS` (10/10 checagens, 7 digests de artefato conferidos).

## Resultado

| Item | Valor |
|---|---|
| `certificationId` | `phase11-fa05bd7ebd77b19e-muj6fvqf` |
| `decision` | `CONDITIONAL_GO` |
| `certification` | `AAA_CANDIDATE` |
| Gates | **35/35 PASS** |
| Invariantes | **16/16 PASS** (16 críticos) |
| `coverage` | 318 arquivos / **2851 testes PASS / 0 skip** (medido com banco) |
| Cobertura crítica | `kernel`, `approval`, `policy`, `journal`, `canal`, `rls` **sem bloqueio** (`critical_branch_coverage` 0 ocorrências) |
| `postgres` | PASS (`databaseConfigured=true`) |
| `independent_critic` | PASS |
| Pós-run `certification:verify:phase11` | **PASS**, `failures: []` |
| Pós-run `promotion:check --requested PRODUCTION` | `eligible:false`, `reason: production_assurance_incomplete`, `noProductionEffect:true`, **apenas os 8 `external_gate_pending`** |

Os 8 gates externos permanecem `NOT_VALIDATED`/`PENDING` (`modelProvider`, `channel`, `externalIdentity`, `institutionalRag`, `rpoRto`, `pilot`, `rollback`, `humanSignoff`). Nenhum foi inferido, contornado ou afrouxado.

## Limitação de ordem (candidato × persistência documental)

Os arquivos `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`, `docs/CURRENT.md` e `docs/03_build/tracking/current_state.json` fazem parte do candidato. Registrá-los reabre `candidateId`/`treeHash` e invalidaria o selo acima. Por isso a rodada executa a certificação em duas passagens: a de cima (registro do resultado) e a de selo final, executada **depois** da persistência documental, com o mesmo candidato de trabalho já congelado. O identificador vigente é sempre o de `certification/current.json`.

## Segunda passagem — selo final

Após os commits `794354e` (pacote da passagem 1) e `30712ed` (persistência documental: `99`, `20`, `30`, `CURRENT.md`, `current_state.json`), o candidato mudou para `candidateId 71a259aced6dd1ee…`, `treeHash 78419d2f2a535ffc…`. O relatório do crítico foi regenerado e revalidado para esse candidato (`PASS`, 10/10 checagens) antes da segunda passagem.

| Item | Valor |
|---|---|
| `certificationId` (selo vigente) | **`phase11-71a259aced6dd1ee-muj7zllj`** |
| Candidato selado | `71a259aced6dd1ee` / `78419d2f2a535ffc` / `commit c3a381c` (mesmos bytes do `HEAD` pós-persistência) |
| `decision` / `certification` | `CONDITIONAL_GO` / `AAA_CANDIDATE` |
| Gates / invariantes | **35/35 PASS** / **16/16 PASS** |
| `coverage` | 318 arquivos / **2851 testes PASS / 0 skip**, `critical_branch_coverage` 0 ocorrências |
| `certification:verify:phase11` | **PASS**, `failures: []` |
| `promotion:check --requested PRODUCTION` | `eligible:false`, `reason: production_assurance_incomplete`, `blockingInvariants: []`, **apenas os 8 `external_gate_pending`**, `noProductionEffect:true` |

Log da segunda passagem: [`AUD20-recert-seal-20260926.log`](AUD20-recert-seal-20260926.log).

Estado final: selo `CONDITIONAL_GO`/`AAA_CANDIDATE` **corrente ao candidato do `HEAD`**, `certification:verify:phase11` PASS e promoção inelegível exclusivamente pelos 8 gates externos/humanos. Nenhum gate foi inferido ou afrouxado; staging/produção `NO_GO`.
