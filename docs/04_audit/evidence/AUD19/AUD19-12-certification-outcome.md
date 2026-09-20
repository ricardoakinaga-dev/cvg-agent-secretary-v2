# AUD19-12 — Resultado do selo candidate-bound (rodada 2026-09-20)

- Task: `AUD19-12`; programa `AUD19-REM`; status: `BLOCKED`.
- Ambiente: local controlado, Node `22.23.2`, PostgreSQL descartável `16-alpine`
  (`127.0.0.1:5434/cvg_test`), `PHASE11_ALLOW_DISPOSABLE_POSTGRES=1`, efeitos
  reais desabilitados. Nenhum push/deploy/publicação.
- Candidato selado: `commit c0f46b9`, `treeHash 3e68ae44…`,
  `candidateId 4374a9ef…`, `certificationId phase11-4374a9ef6566485b-mu9hm7h7`.

## 1. Resultado

- Decisão mecânica: `NO_GO` / `NO_GO`; perfil elegível `CONTROLLED_LOCAL`.
- Gates: `32 PASS / 34`; falhas: `independent_critic` e, por cascata,
  `PHASE11_FORMAL_CLOSURE`. Nenhum invariante crítico falhou.
- `PASS` no mesmo candidato: verify (format/typecheck/lint/build/unidade),
  unit com inventário de skips, coverage com PostgreSQL (`93%` statements,
  `87,2%` branches, `93,7%` functions, `93,7%` lines), security, supply_chain,
  worker_startup, postgres (28 arquivos / 226 testes / 0 skips), e2e (75/75 em
  Chromium/Firefox/WebKit), evals (`56/56`, threshold `0,97`), chaos, load
  (`10.000` eventos sem perda), recovery, bypass_audit, self-test, verificação
  histórica, production_preflight negativo, evidence_reports.
- Gate `FAIL` raiz: `independent_critic`. O relatório machine-readable
  ([`AUD19-08-critic-report.json`](AUD19-08-critic-report.json)) é `FAIL` por um
  P1 de contrato: piso §9.1 de branches de módulos críticos `>=95%` não
  satisfeito — kernel `81,08%` (`orchestration.ts` `68,38%`),
  `kernel-composition.ts` `63,60%`, RLS `78,13%` (medição auxiliar). approval
  `99,72%`, policy `97,84%`, journal `97,65%` e canal `96,24%` passam.
- Consequência: nenhuma elegibilidade de staging é emitida; produção `NO_GO`.

## 2. P2 registrados pelo crítico

1. O harness de eval qualificado roda o agente determinístico, não o runtime
   integrado (`Q-A16-01` exige harness no runtime integrado e holdout).
2. Acessibilidade sem leitor de tela real/auditoria humana independente e
   limitada a Linux.

## 3. Reprodução

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5434/cvg_test \
PHASE11_ALLOW_DISPOSABLE_POSTGRES=1 npm run certify:phase11
node scripts/phase11-2-evidence-check.mjs --critic   # FAIL (CRITIC:verdict)
node scripts/phase11-2-evidence-check.mjs --reports  # PASS
npm run certification:verify:phase11                 # PASS (pacote coerente)
npm run evidence:verify:phase11                      # PASS (hashes coerentes)
npm run production:preflight                         # exit 1, 32 bloqueios
npm run promotion:check                              # eligible=false
```

## 4. Trabalho concluído e limite

`AUD19-01..11` passam com evidência executável; o único P1 local é a cobertura
de branches dos módulos críticos (e a medição de RLS no denominador acordado).
Não é permitido baixar o piso para fabricar PASS. Enquanto o P1 existir,
`AUD19-12` permanece `BLOCKED` e a saída honesta é `NO_GO` local.

## 5. Próxima ação única

Fechar o P1 de cobertura de branches dos módulos críticos (kernel
`orchestration.ts`/`runtime.ts`, `kernel-composition.ts` e RLS) com testes de
comportamento no denominador acordado — ou registrar decisão técnica com
autoridade sem reduzir o piso — e então reexecutar `AUD19-12` com crítico
fresco. Staging real e produção permanecem `NO_GO`.
