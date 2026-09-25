# Pedido de re-selo Phase 11 — candidato final local (B25-08/R4) — 2026-09-25

Status deste documento: **PEDIDO**, não certificação e não admissão. Nenhum selo é emitido por este arquivo; o flujo só existe após candidato selado, pré-requisitos concluídos e admissão própria.

## 1. Por que re-selar

O ponteiro corrente (`certification/current.json` → `phase11-fbca3d2b66326053-mua77vjl`, candidato `fbca3d2b…`, commit `fa78f92e…`) está stale: o HEAD é `2543481…` e o worktree contém 77 modificados, 5 deletados e 274 untracked (ver [selagem B25-01](../AUD-20260925-REPO/b25-01-seal-report.md)). `certification:verify:phase11` e `promotion:check` rejeitam o pacote — comportamento seguro do gate, não qualificação.

## 2. Pré-requisitos (todos pendentes)

R0 worktree limpo com manifesto hash-bound; R1 binding candidate-bound + functions ≥90%; R2 PostgreSQL zero-skip + mutation admitida/executada; R3 collector AUD20-10 executado; H sessão humana + R2 de FU1; `AUD20-18/07/11/12` admitidas e concluídas.

## 3. Fluxo proposto (somente após pré-requisitos + admissão)

1. Congelar candidato (commit identificado, árvore limpa, `candidateId`/`treeHash` registrados).
2. Reconstruir sobre os mesmos bytes: `npm run sbom`, `npm run licenses:check`, build web, composição de serviços — geradores serializados, sem rede exceto `audit:security` via registry.
3. `npm run certify:phase11` → pacote em `certification/phase11/` (logs, manifestos, pointer).
4. `npm run certification:verify:phase11` (verificação independente dos bytes) e `npm run promotion:check --requested PRODUCTION` (elegibilidade evidence-only, `noProductionEffect=true`).
5. Atualizar `certification/current.json` somente com o pacote verificado do candidato selado.

## 4. O que este pedido NÃO autoriza

Emitir selo sobre worktree sujo, reaproveitar o pacote `fbca3d2b…` como corrente, declarar elegibilidade de promoção, fazer deploy, apontar `BASE_URL` remoto, usar dados reais, ou dispensar qualquer gate externo/humano (objeto do [pedido B25-09](AUD20-external-gates-decision-request-20260925.md)). Produção segue `NO_GO` até sign-off e deploy separado.
