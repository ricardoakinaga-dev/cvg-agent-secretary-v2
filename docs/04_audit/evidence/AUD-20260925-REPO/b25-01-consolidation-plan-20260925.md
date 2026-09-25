# Plano de consolidação do worktree (R0) — 2026-09-25

Objetivo: levar `git status --porcelain` a vazio (fora de ignorados) em commits coerentes, habilitando a re-selagem do candidato (B25-01) e o reseal (B25-08). Nenhum conteúdo é reescrito; nenhum arquivo é removido além das deleções já existentes no worktree.

## Inventário (pré-consolidação)

| Métrica | Valor |
|---|---|
| Entradas totais | 411 (79 modificados, 5 deletados, 327 não rastreados) |
| Ignorados | `coverage/`, `test-results/`, `playwright-results.xml`, `.opencode/`, `.env*` |
| Segredos detectados | 0 (varredura por nome; `.env` ignorado) |
| Arquivos >512 KB | `.gauntlet/state.json` (6,0 MB, rastreado), `AUD20-17-request-context-v1-coverage-test-results-20260924.json` (4,3 MB), `AUD20-17-request-context-v1-full-test-results-20260924.json` (0,9 MB) — evidência/estado, mantidos |

## Lotes de commit (ordem)

| Lote | Escopo | Entradas | Mensagem proposta |
|---|---|---:|---|
| B1 | `apps/`, `packages/` (produto + testes das fatias AUD20-17/10) | 64 | `feat(aud20): local controlled builds for hotspots, replay and observability` |
| B2 | `scripts/`, `tests/`, `package.json`, `.nvmrc`, `.node-version`, configs `vite./playwright.aud20-19-*` | 38 | `test(gates): coverage, mutation, docs and composition gates` |
| B3 | `docs/` (auditoria, evidência, aceites, estado) | 296+ | `docs(audit): AUD20 audit trail, acceptances and evidence` |
| B4 | `.gauntlet/` (10), `.github/workflows` (2), `certification/load-report.json` (1) + **5 deleções** | 13 | `chore(governance): gauntlet state, CI workflows and certification report` |

## Pontos de decisão

1. **Deleções em `.gauntlet/`** (`legacy/PLAT-S48/*` e `phase11-20260915/*`): recomenda-se **commitar as deleções** (removidas por rodadas admitidas anteriores; B25-01 as lista). Alternativa: restaurar antes de commitar.
2. **`.gauntlet/state.json` (6 MB)**: já rastreado; o commit registra a transição de estado do run concluído. Não há reescrita manual de `.gauntlet`.
3. **Evidência grande em `docs/`** (4,3 MB + 0,9 MB): mantida por serem recibos do run AUD20-17; o repo já carrega evidência de porte similar.

## Verificação pós-commits

1. `git status --porcelain` vazio (salvo ignorados).
2. `docs:check` (Node `22.23.2`), Prettier, `git diff --check`.
3. `typecheck`, `lint` e testes focados das fatias aceitas (`aud20-10-composition`, `architecture`).
4. Reexecutar a selagem B25-01 → veredito esperado `SEALED` com novo HEAD; registrar manifesto.
5. Nenhum push/deploy; staging/produção `NO_GO`.

## Riscos e reversão

- Cada lote é reversível individualmente por `git revert`; nenhum rebase/amend.
- Se um gate falhar após o commit, a correção entra como commit novo (sem reescrever histórico).
- Exige autorização explícita do usuário para executar os commits; sem ela, o plano permanece apenas como proposta.
