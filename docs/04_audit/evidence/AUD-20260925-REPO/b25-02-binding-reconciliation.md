# B25-02 — Reconciliação de binding (onda R1, 2026-09-25)

Veredito: **binding INCOMPLETO — métricas REPORT_ONLY mantidas**.

Diagnóstico read-only (sem modificação de código-fonte, teste, config ou threshold;
sem commit/push; sem rede; sem execução de suíte ou banco — apenas leitura de
relatórios já existentes e recomputo de hashes em disco com `sha256sum`/`python3`).

## 1. Identidade do manifesto

- Manifesto avaliado:
  `docs/04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-candidate-manifest-20260924.json`
- `sha256sum` medido nesta rodada:
  `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`
  (inicia com `6b86…`, conforme esperado).
- Digest citado no BUILD report
  `docs/04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md`:
  `11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`
  (inicia com `11f061…`).
- Conclusão: o manifesto disponível (`6b86…`) **não é byte-idêntico** ao digest
  citado no BUILD report (`11f061…`). A identidade reproduzível do manifesto
  efetivamente citado não foi provada.

## 2. Ocorrências do digest `11f061…`

Comando: `grep -r "11f061f4" docs/04_audit/evidence/AUD20/ | head`

O digest aparece **apenas como texto** em 6 arquivos `.md` (nenhum `.json` de
manifesto o contém como hash de arquivo):

| Arquivo | Contexto |
|---|---|
| `AUD20-17-request-context-v2-build-report-20260924.md` | Declara que o manifesto do candidato tem SHA-256 `11f061…` e vincula fontes/testes e recibos. |
| `AUD20-17-manifest-baseline-reconciliation-20260924.md` | Registra o mismatch: BUILD report `0ebebf1c…` declara `11f061…`, manifesto disponível é `6b86…`; nenhuma cópia dos bytes `11f061…` localizada. |
| `AUD20-17-manifest-baseline-reconciliation-critic-v1-20260924.md` | Repete que o BUILD report cita `11f061…`. |
| `AUD20-17-C06-gate-route-proposal-20260924.md` | Cita `11f061…` na discussão da rota C06. |
| `AUD20-17-C06-gate-route-critic-v4-20260924.md` | Cita `11f061…` ao contrastar com o manifesto disponível. |
| `AUD20-17-request-context-branch-floor-erratum-20260924.md` | Cita `11f061…` na errata de aplicabilidade do piso de branches. |

Verificação de existência de arquivo com esse hash:

- `ls docs/04_audit/evidence/AUD20/ | grep -i "11f061f4"` → sem resultado
  (`NO_FILE_WITH_HASH_IN_NAME`).
- `find docs/04_audit/evidence/AUD20 -type f -name "*11f061f4*"` → sem resultado.
- O próprio manifesto disponível tem SHA-256 `6b86…`, não `11f061…`.

Ou seja: `11f061…` é referência textual, sem artefato correspondente em disco.

## 3. Tabela de conferência (recomputo contra o worktree corrente)

Método: parse do manifesto JSON com `python3`; para cada entrada que referencia
caminho de arquivo, recalculado `sha256` em disco no worktree corrente
(`/home/ricardo/cvg-agent-secretary-v2`) e comparado ao `sha256` declarado.
Detalhe legível por máquina em `b25-02-recomputed-hashes.json` neste diretório.

| Escopo no manifesto | Entradas | Conferem (worktree corrente) | Observação |
|---|---:|---:|---|
| `candidate.currentIntegratedFiles` | 8 | 8 | Hashes integrados conferem (ex.: `server.ts=4584` `d1e86de7…`, `request-context.ts=328` `395733f6…`, `request-query.ts=138` `63d3f868…`). |
| `candidate.v1CandidateCoreFiles` | 6 | 3 | 3 divergem no worktree integrado atual (escopo v1-only; a reconciliação prévia registra 6/6 no workspace isolado `/tmp/aud20-17-context-v1-run-20260924`). |
| `candidate.allExecutedTestSourceFiles` | 300 | 294 | 6 divergem no worktree integrado atual (lista do run v1 de 300 arquivos; reconciliação prévia registra 300/300 no isolado). |
| `evidenceFiles` | 34 | 34 | Todos os digests de recibos/logs/resumos conferem, inclusive resumo e logs de coverage/teste integrado. |
| **Total** | **348** | **339** | **9 divergências, 0 ausentes no worktree** (ver lista abaixo). |

Divergências (9, limite de 20 — nenhuma ausente):

- `v1CandidateCoreFiles:apps/api/src/server.ts`
- `v1CandidateCoreFiles:tests/architecture.test.js`
- `v1CandidateCoreFiles:apps/api/src/__tests__/server-boundary-envelope.test.ts`
- `allExecutedTestSourceFiles:apps/api/src/__tests__/audit-evidence.test.ts`
- `allExecutedTestSourceFiles:apps/api/src/__tests__/conversation-list.test.ts`
- `allExecutedTestSourceFiles:apps/api/src/__tests__/orchestration-observability.test.ts`
- `allExecutedTestSourceFiles:apps/api/src/__tests__/platform-admin-routes-coverage.test.ts`
- `allExecutedTestSourceFiles:apps/api/src/__tests__/server-boundary-envelope.test.ts`
- `allExecutedTestSourceFiles:tests/architecture.test.js`

Leitura: as 9 divergências são esperadas por mistura de escopos — as entradas
v1-only descrevem a reconstrução isolada request-context-only (ex.:
`server.ts` v1 `62cafe09…` 4707 linhas vs. integrado `d1e86de7…` 4584 linhas;
`server-boundary-envelope.test.ts` v1 `6bd4a735…` 477 linhas vs. integrado
`82c860df…` 506 linhas). Elas **não** invalidam os 8/8 integrados nem os 34/34
recibos, mas confirmam que o manifesto disponível não carrega inventário
hash-bound do run integrado.

## 4. Status do inventário das fontes integradas

Trecho relevante do BUILD report
(`AUD20-17-request-context-v2-build-report-20260924.md`, seção
"Verificação integrada adicional no workspace — 2026-09-24"):

- `npm test`: **301 arquivos**: 289 passaram, 12 ignorados; **2.256 testes
  passaram, 192 ignorados, 0 falhas**
  ([log](../AUD20/AUD20-17-request-context-v2-integrated-full-test-round1-20260924.log)).
- `npm run test:coverage`: statements 90,84% (11.497/12.656); branches 87,00%
  (8.849/10.171); functions 89,27% (2.107/2.360); lines 91,43%
  (10.922/11.945).
- O próprio manifesto declara em `testReceipts.integratedRootFullTestCounts`
  os mesmos 301/289/12 e 2256/192/0, e em `testReceipts.fullTestCounts` o run
  v1 de 300 arquivos (288 passaram, 12 ignorados; 2.248 passaram, 192 ignorados).

Status: **inventário das 301 fontes INTEGRADO INCOMPLETO**.

- `candidate.allExecutedTestSourceFiles` enumera 300 fontes (o run v1), não as
  301 do run integrado posterior; não há lista separada de hashes que enumere
  todas as fontes de teste daquele run integrado (delta +1 arquivo, +8 testes).
- Sem essa lista hash-bound e sem os bytes `11f061…`, as métricas globais e de
  `request-context` permanecem **reportadas, sem atribuição candidate-bound
  para qualificação C06** — consistente com a reconciliação prévia
  (`PARTIAL_SOURCE_AND_RECEIPT_RECONCILIATION`, comparação "sem redução"
  `NOT_RUN`, C06/C07 `FAIL`).

## 5. Próximos passos

1. Manter C06/C07 em `FAIL` e métricas como `REPORT_ONLY` até que (a) os bytes
   `11f061…` sejam localizados ou declarados inexistentes com trilha, e
   (b) seja publicado inventário hash-bound das 301 fontes do run integrado.
2. Qualquer rota de aceite C06 exige gate/SPEC próprio (piso global de
   functions, piso crítico de branches do módulo, PostgreSQL, mutation) —
   sem ampliar o BUILD, sem PostgreSQL, sem commit/push/deploy, sem
   staging/produção (ambos `NO_GO`).
3. Não alterar denominador, threshold, registry ou escopo nesta lane; eventual
   re-baseline só após baseline válida e candidate-bound identificada.
4. Reexecutar este recomputo após qualquer movimentação do worktree ou
   localização de artefato `11f061…`.

## 6. Limites

- Somente leitura e recomputo de hashes; nenhuma suíte, typecheck, lint,
  PostgreSQL ou mutation foi executada nesta lane.
- Sem commit/push, sem alteração de código-fonte, teste, config ou threshold,
  sem rede, sem dados reais.
- Os números valem para o estado em disco no momento da coleta; qualquer
  movimentação posterior exige nova rodada.
