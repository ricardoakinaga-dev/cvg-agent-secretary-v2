# AUD19-01 — contrato e certificação de evals

**Programa:** `AUD19-REM`
**Task:** `AUD19-01`
**Gate:** `G0 — verdade contratual`
**Status inicial:** `READY_FOR_NEXT_STEP`
**Escopo:** runner de evals, regras de certificação Phase 11, relatório de eval e testes; dados sintéticos apenas.

## Objetivo observável

Restabelecer uma única verdade para o gate de task success: `>=97%`, conforme
[`aaa_quality_contract.md`](aaa_quality_contract.md) §3 (`A16`) e §9. O runner,
as regras de certificação, o verificador de evidência e o contrato devem
concordar; o resultado histórico `53/56 = 94,64%` deve produzir `FAIL/NO_GO`; e
os três cenários hoje falhos (`EV-016`, `EV-021`, `EV-031`) devem ser corrigidos
sem alterar expectativas do dataset.

## Contratos preservados

- `docs/02_spec/aaa_quality_contract.md` permanece a barra soberana; nenhum
  critério, tolerância ou rótulo é relaxado por esta task.
- `AAA_CANDIDATE`/`CONDITIONAL_GO` só podem existir com todos os required gates
  `PASS`; gate de eval abaixo de `97%` bloqueia o selo, sem compensação por
  média.
- Dataset `phase10-core-v1` (56 cenários) permanece a base sintética; as
  expectativas dos cenários não mudam.
- Produção e staging reais continuam `NO_GO`; esta task é local/controlada.
- Evidência histórica em `docs/04_audit/0566_...` não é reescrita.

## Baseline reproduzido (antes do BUILD)

Sob Node `22.23.2`, `npx tsx scripts/phase10-eval-report.ts`:

- `verdict=PASS`, `taskSuccessRate=0.9464285714285714`,
  `thresholds.taskSuccessRate=0.85`, `failures=[EV-016, EV-021, EV-031]`.
- O baseline acima é o negativo conhecido: um contrato de `>=97%` deve
  transformá-lo em `FAIL`.

## Critérios de aceite congelados

1. `>=97%` é definido em uma fonte única operacional
   (`scripts/lib/eval-contract.mjs`) usada por `phase11-rules.mjs` e
   `certification-rules.mjs`; o runner TS referencia a mesma meta e um teste de
   concordância compara os dois valores.
2. `DEFAULT_EVAL_THRESHOLDS.taskSuccessRate` é `0.97` e o runner retorna
   `FAIL` para uma suíte com 53/56 sucessos.
3. `computeCertificationDecision` emite bloqueio de contrato de eval quando o
   relatório tem `metrics.taskSuccessRate < 0.97` ou
   `thresholds.taskSuccessRate < 0.97`, mesmo que o gate esteja `PASS`.
4. `verifyGateEvidence` rejeita o mesmo relatório com
   `eval_threshold_below_contract` / `eval_task_success_below_contract`.
5. Os 56 cenários passam com o agente determinístico; nenhuma expectativa do
   dataset é alterada.
6. Testes de regressão falham se o threshold for reduzido em qualquer das três
   camadas (runner TS, decisão Phase 11, verificador de evidência).
7. Documento de contrato, runner, regras, relatório e pacote concordam sobre
   `>=97%` e a certificação `AAA_CANDIDATE` não é emitida com o gate falho.

## Negativo capaz de derrotar a implementação

- `N1`: stub determinístico com 53/56 sucessos + threshold contratual →
  `verdict=FAIL`.
- `N2`: relatório fabricado com `metrics.taskSuccessRate=0.99` e
  `thresholds.taskSuccessRate=0.85` → bloqueio de contrato (threshold
  reduzido).
- `N3`: relatório fabricado com `metrics.taskSuccessRate=0.9464` e
  `thresholds.taskSuccessRate=0.97` → bloqueio de contrato mesmo com gate
  `PASS`.
- `N4`: teste de concordância falha se a constante do runner divergir de
  `scripts/lib/eval-contract.mjs`.

## Arquivos permitidos

- `packages/agent-evals/src/runner.ts`, `packages/agent-evals/src/agent.ts`,
  `packages/agent-evals/src/__tests__/**`
- `scripts/lib/eval-contract.mjs` (novo), `scripts/lib/phase11-rules.mjs`,
  `scripts/lib/certification-rules.mjs`
- `tests/**` (regressões), `certification/agent-eval-report.json` (regenerado)
- `docs/02_spec/aud19_01_...`, `docs/03_build/0332_...`, execution log,
  backlog master e runtime state (controles).

## Rollback / roll-forward

- Rollback: reverter apenas os arquivos desta task; o relatório anterior
  permanece preservado no log da auditoria 0566.
- Roll-forward: qualquer mudança posterior no threshold ou nos cenários
  invalida as evidências desta task e reabre `AUD19-01`.

## Saída e transição

Saídas: este contrato, código e testes das três camadas, relatório de eval
regenerado (56/56) e evidência de execução. `AUD19-01` só avança para
`COMPLETED` com os testes focados, regressão da área e negativos acima
executados. A próxima task é `AUD19-02`.
