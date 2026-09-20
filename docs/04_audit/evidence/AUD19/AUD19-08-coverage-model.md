# AUD19-08 — modelo de cobertura

**Status:** REVISADO_LOCAL (AUD19-08, 2026-09-20)
**Escopo:** definir quais superfícies entram no relatório de cobertura, como
frontend e adapters PostgreSQL são medidos, e quais gaps permanecem explícitos.
Nenhum piso foi reduzido. O alinhamento dos pisos ao contrato
(`docs/02_spec/aaa_quality_contract.md` §9.1) permanece em `AUD19-12`.

## 1. Escopo primário (gate de threshold)

Fonte: `vitest.config.mts` (`npm run test:coverage`).

- **Incluído:** `packages/**/*.ts`, `apps/**/*.ts`, `apps/**/*.tsx`.
- **Excluído do denominador:** arquivos de teste, `main.ts`/`main.tsx`
  (bootstrap exercitado por smoke de processo), `apps/web/src/**` e os adapters
  PostgreSQL (`packages/persistence/src/postgres.ts`,
  `packages/persistence/src/postgres/**` — módulos extraídos em `AUD19-07`,
  `packages/persistence/src/*postgres*.ts`,
  `platform-control-plane-repository.ts`, `platform-approval-repository.ts`,
  `tenant-scoped-capability-approval-repository.ts`).
- **Pisos correntes:** 80/80/80/80. Isso está **abaixo** da barra do contrato
  (≥90 statements/lines/functions, ≥85 branches, ≥95 branches em módulos
  críticos) e é débito registrado para `AUD19-12`; este trabalho não altera os
  pisos.
- **Medição selada disponível no host:** 194 arquivos; 89,45% statements,
  82,76% branches, 88,68% functions, 89,99% lines
  (`coverage/coverage-summary.json`). Números do escopo primário apenas.

## 2. Módulos críticos (baseline do contrato §9.1)

| Domínio crítico | Local principal | Cobertura por branch ≥95? |
| --- | --- | --- |
| kernel / runtime | `packages/agent-runtime/src/**` | não medida por módulo hoje |
| approval | `packages/approval-engine/src/**` | não medida por módulo hoje |
| policy / authority | `packages/policy-engine/src/**` | não medida por módulo hoje |
| journal de efeitos | `packages/agent-runtime/src/effect-journal.ts` (+ variantes PostgreSQL) | não medida por módulo hoje |
| canal | `packages/channel-gateway/src/**` | não medida por módulo hoje |
| RLS / tenant | `packages/persistence/src/tenant-scoped-postgres.ts` e migrations | fora do denominador unitário |
| certificação | `scripts/lib/certification-rules.mjs`, `scripts/lib/eval-contract.mjs` | testes negativos executáveis adicionados nesta task |

O `coverage-summary.json` publica totais e por-arquivo, então a extração
“branches por módulo crítico” é um pós-processamento determinístico que pode
ser ligado em `AUD19-12` sem instrumentação nova. O relatório atual não a
substitui; a ausência fica registrada como gap.

## 3. Frontend no modelo

- **Jornada:** Playwright (`npm run test:e2e`, specs em `tests/e2e/`), incluindo
  shell visual, acessibilidade e fluxos críticos. Hoje é Chromium-only
  (P2-UX-01), portanto a evidência de cobertura de UI é de um único motor.
- **Unitário:** `apps/web/src/**` está fora do denominador de threshold. Para
  torná-lo visível sem inflar o gate, foi adicionado o escopo auxiliar
  **report-only** `vitest.coverage-all.config.mts`:
  - comando: `npx vitest run --coverage --config vitest.coverage-all.config.mts`;
  - saída: `coverage/full/coverage-summary.json`;
  - **sem thresholds** (`thresholds: {}`), explicitamente para não substituir
    nem reduzir os pisos do escopo primário;
  - medição de inclusão executada nesta task: 224 arquivos no relatório, dos
    quais 13 são `apps/web/src/**` (ex.: `App.tsx`, `api/client.ts`,
    `features/approvals/index.tsx`). Os percentuais de uma execução parcial não
    são evidência de cobertura; servem apenas para provar que a superfície entra
    no relatório.

## 4. Adapters PostgreSQL no modelo

- **Gate dedicado:** `npm run test:postgres` seleciona 27 arquivos
  (`package.json` → `scripts.test:postgres`) e é modelado como gate de ambiente
  `postgres` com `skipPolicy: 'none'` (qualquer skip com banco vivo bloqueia).
- **Denominador unitário:** os adapters PostgreSQL ficam fora do escopo de
  threshold do Vitest porque exigem banco descartável; a cobertura deles é
  funcional (testes de integração) e não percentual.
- **Escopo auxiliar:** o mesmo `vitest.coverage-all.config.mts` inclui os 9
  arquivos de adapter/uso PostgreSQL (ex.: `postgres.ts`,
  `orchestrator-postgres.ts`, `effect-journal-postgres.ts`,
  `channel-effect-journal-postgres.ts`, `journeys-postgres.ts`,
  `postgres-role-preflight.ts`) no relatório bruto. Nenhum piso é aplicado a
  eles até `AUD19-12` decidir o denominador acordado (§9.1: “web, bootstrap e
  PostgreSQL reportados separadamente, sem exclusão para inflar”).
- **Gap de seleção fechado na integração de AUD19-12:**
  `apps/worker/src/__tests__/continuous-worker-entrypoint.integration.test.ts`
  foi adicionado a `scripts.test:postgres`; o gate PostgreSQL agora seleciona
  **28 arquivos / 226 testes com 0 skips**, e o inventário classifica os skips
  condicionais do unit como opcionais com justificativa congelada. Evidência:
  `AUD19-08-skip-inventory.json` (contexto `postgres`, `databaseAvailable:
  true`).

## 5. Gaps explícitos (sem inflar)

1. Pisos 80/80/80/80 vs contrato 90/90/90/85 (+95 críticos): débito de
   `AUD19-12`; nenhum ajuste cosmético foi feito.
2. Cobertura de branches por módulo crítico não é calculada no relatório atual.
3. E2E Chromium-only foi resolvido em `AUD19-10` (3 projetos/browsers).
4. `continuous-worker-entrypoint.integration.test.ts` foi incluído no gate
   PostgreSQL (28 arquivos / 226 testes / 0 skips).
5. Medição de qualificação com PostgreSQL descartável (suite completa):
   statements `93%`, branches `87,2%`, functions `93,7%`, lines `93,7%`,
   acima dos pisos globais de §9.1; branches de módulos críticos (>=95%) ainda
   não são calculados por módulo — débito explícito de `AUD19-12`.
6. Percentuais do escopo auxiliar (frontend/PostgreSQL via
   `vitest.coverage-all.config.mts`) são report-only e não substituem os pisos.

## 6. Evidência

- Relatório bruto do escopo primário: `coverage/coverage-summary.json`.
- Relatório bruto do escopo auxiliar (report-only): `coverage/full/coverage-summary.json`.
- Configuração do escopo auxiliar: `vitest.coverage-all.config.mts`.
- Inventário executável de skips: `AUD19-08-skip-inventory.json`/`.md`.
