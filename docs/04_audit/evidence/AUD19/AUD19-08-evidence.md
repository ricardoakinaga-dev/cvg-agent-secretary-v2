# AUD19-08 — QA adversarial comportamental e cobertura crítica

**Status:** `EXECUTADO_LOCAL` — 2026-09-20. Não é certificação: staging real e
produção permanecem `NO_GO`. Nenhum commit/push/deploy/egress foi executado.
**Ambiente:** Node `22.23.2`; PostgreSQL descartável em `127.0.0.1:5434/cvg_test`;
dados sintéticos; efeitos externos desabilitados.

## 1. Inventário executável de skips

- Script: `scripts/skip-inventory.mjs` (sem dependências novas). Roda
  `npx vitest run --reporter=json` ou parseia um relatório JSON (`--report=`), e
  publica `AUD19-08-skip-inventory.json` + `.md`.
- Manifesto congelado: `AUD19-08-required-skips.json` (`defaultClassification:
  required`, `justificationCannotWaive: true`).
- Enforcement: `scripts/lib/certification-rules.mjs` — `verifyGateEvidence`
  lê o inventário JSON do gate (`certification/logs/unit-report.json`,
  `certification/logs/postgres-report.json`), confere a contagem contra o
  sumário textual e classifica cada skip; um `skipJustification` de texto jamais
  rebaixa um skip `required`. O certifier (`phase10-certify.mjs`) passou a
  produzir esses relatórios e a registrar `database=present|absent` no cabeçalho
  do log.
- Contagens desta rodada:

| Contexto | DB | Skips | Required | Optional | Arquivos | Resultado |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `unit` (suite padrão) | ausente | 131 | **2** | 129 | 27 | `REQUIRED_SKIPS_FOUND` |
| `postgres` (27 arquivos de `scripts.test:postgres`) | presente | **0** | 0 | 0 | 0 | `PASS` |

- O `unit` sai de `265 passed | 12 skipped (277 files)` /
  `1879 passed | 131 skipped (2010 tests)`.
- Decisões de classificação:
  - skips condicionais em arquivos selecionados por `scripts.test:postgres`
    (26 arquivos) → `optional` com a justificativa congelada
    `OPT-DATABASE-CONDITIONAL-UNIT`, porque o gate PostgreSQL os executa e lá
    qualquer skip é required (`REQ-POSTGRES-GATE-ANY`); resultado executado:
    **zero skips** no gate PostgreSQL.
  - `apps/worker/src/__tests__/continuous-worker-entrypoint.integration.test.ts`
    (2 skips) → **required**: o arquivo depende de `TEST_DATABASE_URL` mas não
    está na lista de `scripts.test:postgres`; com banco vivo ele não é executado
    por nenhum gate. Gap explícito, não rebaixado.
  - qualquer skip não coberto por regra → `required` (fail-closed).
  - a contagem do auditor era 117 no revision `843c927`; o candidato corrente
    tem 131 skips condicionais. O script é a fonte executável a partir de agora.
- Negativo: `tests/aud19-certification-guards.test.js` monta uma fixture de log
  + inventário JSON com skip required e `skipJustification` presente e exige
  `required_skip:unit:...` da `verifyGateEvidence`; também reprova inventário
  que esconde skips do sumário.

## 2. Evidência/critic comportamental

- `scripts/lib/critic-evidence.mjs`: schema executável
  (`phase11-critic-report` v1), binding a `candidateId`/`commit`/`treeHash`,
  fingerprint antes/depois (`sha256-candidate-v1`), critérios de independência
  declarados, ausência de justificativa/conclusão do builder (chaves proibidas),
  digests de todos os artefatos citados e coerência do veredito com os checks.
- `scripts/phase11-2-evidence-check.mjs --critic`: substitui a varredura
  textual do Markdown por essa verificação; saída ausente = `NOT_RUN` (exit 2),
  relatório incoerente = `FAIL` (exit 1). O gate permanece fail-closed.
- `--reports`: substitui o scan de status por um manifesto de digests
  (`docs/phase11/reports-manifest.json`, schema `phase11-evidence-reports`).
  Sem manifesto → `FAIL` (comportamento intencional; a evidência Markdown sem
  digest não é aceita).
- Insumo do crítico ainda **não existe** nesta rodada:
  - `node scripts/phase11-2-evidence-check.mjs --critic` → `NOT_RUN`, exit 2
    (registro: `AUD19-08-critic-check-not-run.json`);
  - `--reports` → `FAIL` fail-closed (registro:
    `AUD19-08-reports-check-fail-closed.json`);
  - formato de entrada do crítico: `AUD19-08-critic-report.example.json`.
- Known-bad rejeitados (`tests/critic-evidence.test.js`): sem binding, binding
  para outro candidato, conclusão do builder reutilizada, hash de artefato
  divergente, relatório adulterado (digest gravado), crítico que escreveu no
  worktree (fingerprint antes ≠ depois), worktree alterado após o relatório,
  veredito PASS sem suporte dos checks. Known-good aceito.
- Nota honesta: o fingerprint e os digests detectam alteração posterior; a
  independência de identidade é declarada + verificada por ausência de conteúdo
  do builder, não por assinatura criptográfica (limite registrado no pacote).

## 3. Mutantes críticos executáveis

- Harness: `scripts/mutation-sentinel.mjs` + `scripts/lib/mutation-sentinel.mjs`.
  Copia o repositório para sandbox temporário (nunca escreve no worktree),
  aplica uma mutação textual por vez, roda o teste focado e exige falha.
- Manifesto: `AUD19-08-mutants.json` (9 mutantes pré-selecionados).
- Resultado: **9/9 detectados**, 0 não detectados, 0 não aplicáveis
  (`AUD19-08-mutation-sentinel-report.json`).

| ID | Categoria | Guarda mutada | Teste focado que detectou |
| --- | --- | --- | --- |
| MUT-AUTH-01 | authority | mismatch de tenant do recurso (policy) | `capability-scope.test.ts` |
| MUT-AUTH-02 | authority | teto de papel do operador | `policy-engine.test.ts` |
| MUT-TENANT-01 | tenant | escopo de tenant da identidade confiável (API) | `identity-trusted-resolver.test.ts` |
| MUT-FENCE-01 | fencing | token de reserva/execução | `approval-coverage-closure.test.ts` |
| MUT-APPROVAL-01 | approvals | auto-aprovação | `approval-engine.test.ts` |
| MUT-JOURNAL-01 | journal | reuso de idempotency key | `effect-journal.test.ts` |
| MUT-EVAL-01 | eval-threshold | `0.97` → `0.85` | `phase11-eval-contract.test.js` |
| MUT-CERT-01 | certification | enforcement de skip required | `aud19-certification-guards.test.js` |
| MUT-CERT-02 | certification | P1 bloqueia NO_GO | `aud19-certification-guards.test.js` |

- `tests/mutation-sentinel.test.js` roda o harness reduzido (MUT-EVAL-01) e
  prova que o worktree não muda; segundo caso prova que alvo defasado é
  reportado como gap (`not_applicable`), nunca como detecção.

## 4. Modelo de cobertura

- Documento: `AUD19-08-coverage-model.md`.
- Escopo primário (thresholds 80/80/80/80): 194 arquivos; 89,45% statements,
  82,76% branches, 88,68% functions, 89,99% lines
  (`coverage/coverage-summary.json`). Pisos ainda abaixo do contrato §9.1;
  alinhamento em `AUD19-12` (não reduzido aqui).
- Escopo auxiliar **report-only** (`vitest.coverage-all.config.mts`, sem
  thresholds): inclui frontend e adapters PostgreSQL; execução de verificação
  gerou 224 arquivos no relatório, 13 de `apps/web/src/**` e 9 de
  PostgreSQL/adapters (`coverage/full/coverage-summary.json`).
- Gap novo documentado: o teste de entrypoint do worker não está selecionado
  pelo gate PostgreSQL (gera os 2 skips required do inventário).

## 5. Suítes e gates afetados

- `scripts/phase10-verify.mjs --self-test`: 38 checks PASS (N1-N9 + C0-C27).
  No baseline `HEAD` os 29 checks C falhavam porque a fixture não copiava
  `scripts/lib/eval-contract.mjs` (introduzido em AUD19-01) e usava threshold
  `0.85`; o conserto está no próprio self-test (cópia de
  `eval-contract.mjs`/`skip-policy.mjs` + threshold `0.97`).
- `scripts/phase10-certify.mjs`: gates `unit` e `postgres` passam a gravar
  relatório JSON de testes, exigido pela matriz de evidência.
- `scripts/phase10-verify.mjs`: carrega o manifesto required-skips e o contexto
  PostgreSQL no modo candidato corrente.

## 6. Comandos executados

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
TEST_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5434/cvg_test" \
  npx vitest run tests/phase11-2-certification.test.js \
    tests/aud19-certification-guards.test.js \
    tests/critic-evidence.test.js \
    tests/mutation-sentinel.test.js --no-file-parallelism --maxWorkers=2
# 4 arquivos / 25 testes PASS

npx vitest run --no-file-parallelism --maxWorkers=2 \
  --reporter=default --reporter=json --outputFile=/tmp/.../vitest-final.json
# 265 passed | 12 skipped (277 files); 1879 passed | 131 skipped (2010 tests); 0 failed

node scripts/skip-inventory.mjs --gate=unit --report=<final>.json --merge
node scripts/skip-inventory.mjs --gate=postgres --files=<27 arquivos>   # 0 skips
node scripts/mutation-sentinel.mjs   # 9/9 detectados
node scripts/phase11-2-evidence-check.mjs --critic   # NOT_RUN (insumo ausente)
node scripts/phase10-verify.mjs --self-test          # PASS (38 checks)
npx tsc -p tsconfig.typecheck.json --noEmit          # PASS
npx eslint <arquivos alterados>                      # PASS
npx prettier --check <arquivos alterados>            # PASS
```

## 7. Riscos e limitações

- `AUD19-12` continua dono de: alinhar pisos ao contrato, denominador de
  frontend/PostgreSQL e cobertura de branches por módulo crítico.
- O gate `independent_critic` permanece sem insumo comportamental; por desenho
  ele agora falha fechado até o crítico publicar o relatório JSON.
- A classificação de skips depende do JSON do runner; o cross-check com o
  sumário textual protege contra inventário parcial, mas um runner que não
  emita `assertionResults` de skips seria detectado como `skip_inventory_mismatch`.
- O sentinel cobre 9 guardas; não é mutação exaustiva do repositório.
- Outra lane (`AUD19-07`/`AUD19-10`) edita o mesmo worktree em paralelo
  (`server.ts`, `postgres.ts`, `vitest.config.mts`, `package.json`, web); os
  resultados acima refletem o worktree no momento da execução e podem sofrer
  drift alheio até o congelamento do candidato.
- `scripts/phase10-verify.mjs --historical` reporta drift de candidato/commit e
  hashes de artefatos gerados no worktree compartilhado sujo (pré-existente,
  agravado pelas lanes paralelas). O modo `--self-test`, que revalida os
  controles negativos deste repositório, está verde (38 checks).
- Nenhuma autorização de staging/produção é emitida ou sugerida.

## 8. Caminhos de teste para o lead registrar

- `tests/aud19-certification-guards.test.js` — skip required bloqueia; skip
  declarado coberto pelo gate PostgreSQL passa; inventário divergente reprova;
  decisão P0/P1 → `NO_GO`.
- `tests/critic-evidence.test.js` — known-bad de critic/evidência rejeitados e
  known-good aceito.
- `tests/mutation-sentinel.test.js` — harness detecta mutante crítico e
  reporta alvo defasado como gap.
- `tests/phase11-2-certification.test.js` — regressão do pacote de certificação.
- Evidências: `AUD19-08-skip-inventory.{json,md}`,
  `AUD19-08-required-skips.json`, `AUD19-08-mutants.json`,
  `AUD19-08-mutation-sentinel-report.json`, `AUD19-08-coverage-model.md`,
  `AUD19-08-critic-check-not-run.json`,
  `AUD19-08-reports-check-fail-closed.json`,
  `AUD19-08-critic-report.example.json`.
