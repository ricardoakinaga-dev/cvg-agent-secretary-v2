# B25-01 — Relatório de selagem do candidato (onda R0, 2026-09-25)

Veredito: **NOT_SEALED_FOR_RELEASE** — worktree sujo no momento do inventário.
Nenhuma divergência foi ocultada: as contagens abaixo reproduzem
`git status --porcelain` na íntegra (77 modificados, 5 deletados, 274 untracked).

## 1. Identidade do candidato

| Campo | Valor |
|---|---|
| HEAD (completo) | `25434811334f5cec92ee0741079302271b82b7cb` |
| HEAD (curto) | `2543481` |
| Data do HEAD | `2026-09-20 23:04:20 -0300` |
| Assunto do HEAD | `docs(audit): open AUD20-03 after package review` |
| Node pinado (`.nvmrc` e `.node-version`) | `22.23.2` (os dois arquivos conferem) |
| `apps/api/src/server.ts` | sha256 `d1e86de7…3e6519`, 4584 linhas |
| `apps/api/src/server/request-context.ts` | sha256 `395733f6…34252d`, 328 linhas |
| `apps/api/src/server/request-query.ts` | sha256 `63d3f868ef1ab83efface68222a47f70c552b7047a970a7a0f2310a7a18162bc`, 138 linhas |
| `package.json` | sha256 `7ebd4586…5da254`, 89 linhas |
| Documentos `docs` (`*.md`) | 680 arquivos |
| Documentos `docs` (`*.json`) | 584 arquivos |
| Arquivos sob `docs/04_audit/evidence` | 2602 arquivos |
| Manifesto desta selagem | `b25-01-candidate-manifest.json` (neste diretório) |

Contexto de planejamento: `docs/03_build/0344_post_audit_roadmap_20260925.md`
(item B25-01, onda R0) e `docs/03_build/0345_post_audit_backlog_20260925.md`.

## 2. Divergências observadas (worktree sujo — fato esperado em R0)

Apuração por `git status --porcelain`:

- Modificados (M): **77** — distribuídos por `.gauntlet`, workflows em
  `.github/workflows`, testes e fontes em `apps/api`, `apps/worker`,
  `packages`, `scripts`, `tests` e documentos em `docs` (incluindo
  `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`,
  `docs/99_runtime_state.md`, `package.json`, entre outros).
- Deletados (D): **5** — lista exata:
  - `.gauntlet/legacy/PLAT-S48/manifest.json`
  - `.gauntlet/legacy/PLAT-S48/progress.md`
  - `.gauntlet/legacy/PLAT-S48/state.md`
  - `.gauntlet/phase11-20260915/README.md`
  - `.gauntlet/phase11-20260915/state.json`
- Untracked (??): **274** entradas — incluindo `.nvmrc`, `.node-version`,
  `apps/api/src/server/request-context.ts`,
  `apps/api/src/server/request-query.ts` e seus testes
  (`apps/api/src/__tests__/request-context.test.ts`,
  `apps/api/src/__tests__/request-query.test.ts`), documentos das séries
  `docs/00_discovery/0016`–`0025`, `docs/01_prd/0027`–`0033`,
  `docs/02_spec/aud20_*`, `docs/03_build/0335`–`0345`, trilhas em
  `docs/03_build/tracking`, auditorias `docs/04_audit/0568`–`0573`,
  evidências `docs/04_audit/evidence/AUD-20260923-REPO` e `AUD20/*`,
  migrações `packages/persistence/migrations/0027`–`0029`, scripts
  `scripts/aud20-*`, `scripts/lib/aud20-*` e testes `tests/aud20-*`.

Reprodução: `git status --porcelain` a partir da raiz do repositório.
Os hashes e contagens acima valem para o estado em disco no momento da
coleta; qualquer movimentação do worktree invalida a comparação ponto a
ponto e exige nova rodada de inventário.

## 3. Próximos passos (R1–R4 exigem worktree limpo)

1. Decidir o destino das divergências (commit, stash ou descarte) em lane
   com autoridade para escrita no controle de versão — esta lane não
   commita, não altera fonte do produto e não executa essa etapa.
2. Reexecutar o inventário B25-01 após a limpeza e conferir
   `modified=0, deleted=0, untracked=0` antes de qualquer selo de release.
3. Somente com worktree limpo as ondas R1–R4 (verificação, auditoria e
   liberação) podem prosseguir sobre o candidato selado.

## 5. Reemissão pós-crítica (v2)

A crítica independente fresh-context deu `FAIL` à v1 deste pacote por um
sha256 falso de 55 caracteres para `request-query.ts` (truncado; faltava o
trecho `0f2310a7a`). Esta v2 corrige o hash para os 64 caracteres medidos em
disco e atualiza as contagens do worktree/docs para o estado pós-lanes
(274 untracked, 680 md, 584 json, 2602 arquivos de evidência — deriva explicada
pelos próprios artefatos deste programa). Nenhum outro número mudou; o veredito
`NOT_SEALED_FOR_RELEASE` permanece.

## 6. Limites desta lane

- Nenhuma suíte de testes foi reexecutada nesta lane (sem `npm test`,
  sem typecheck, sem lint): apenas inventário, hash e registro.
- Sem acesso a rede, sem commit/push, sem modificação de código-fonte do
  produto e sem dados reais (todo o material tratado é sintético/local).
- Este relatório conclui `NOT_SEALED_FOR_RELEASE` por definição, dado o
  worktree sujo — selar release sobre divergências não registradas seria
  falsificação do estado do candidato.
