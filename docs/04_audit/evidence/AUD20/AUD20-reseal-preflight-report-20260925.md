# Preflight read-only do reseal (R4) no candidato selado — 2026-09-25

Comandos read-only executados sob Node `22.23.2` sobre o worktree consolidado. Nenhuma escrita de produto/certificação; apenas logs em `docs/04_audit/evidence/AUD20/`.

## Resultados

| Comando | Exit | Veredito | Evidência |
|---|---:|---|---|
| `npm run certification:verify:phase11` | 1 | **FAIL** com 25 falhas (pacote stale `fbca3d2b…@fa78f92` vs candidato atual) | [log](AUD20-reseal-preflight-certification-20260925.log) `401da0b2…` |
| `npm run promotion:check` | 1 | `eligible: false`; `reason: current_certification_invalid`; `noProductionEffect: true` | [log](AUD20-reseal-preflight-promotion-20260925.log) `1e494abf…` |

## Delta observado (amostra das 25 falhas)

- `independent_critic_invalid`: candidato do crítico `fbca3d2b…` ≠ atual `05150f34e0bd5e4613a2718d74b74867c779b9de5c2ca9a2c729740000e3d5ba`; commit `fa78f92e` ≠ `3ed938df`; tree `69389ada` ≠ `3ebdab3e`.
- `mutation_report_missing_or_invalid`, `artifact_invalid:required_package_missing:certification/phase11/critic-report.json` e `manifest_candidate_mismatch`: o pacote corrente não contém os relatórios/artefatos exigidos.
- `candidate_scope_drift` (exemplos): `.github/workflows/*`, `.nvmrc`/`.node-version` adicionados, `apps/api/src/__tests__/audit-evidence.test.ts` alterado — o candidato evoluiu legitimamente desde o selo antigo.
- `required_gate_missing:mutation_sentinel` no contexto do pacote Phase 11 (o manifesto de mutantes mudou; pin canônico `545ba85f…` segue obsoleto — reconciliar no reseal).
- `promotion:check`: 8 bloqueios externos/humanos pendentes (provider, canal, identidade externa, RAG institucional, RPO/RTO, piloto, rollback, sign-off).

## Leitura

O fail-closed está correto: o selo antigo não qualifica o candidato atual e o pacote precisa ser regenerado (critic/mutation incluídos) para um candidato congelado. O preflight identificou o candidato atual: `candidateId 05150f34…`, commit `3ed938df…`, tree `3ebdab3e…`.

## Limites

- Somente leitura: nenhum `certify:*` foi executado; nenhum artefato de certificação foi escrito ou sobrescrito.
- Regenerar o pacote (reseal) exige candidato congelado e **admissão própria** (o aceite dos fluxos não autoriza execução), além dos pré-requisitos R2/R3/H e `AUD20-07/11/12` do roadmap 0344.
- Staging/produção `NO_GO`; nenhum push/deploy.
