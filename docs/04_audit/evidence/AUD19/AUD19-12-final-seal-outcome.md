# AUD19-12 — Selo candidate-bound final (rodada 2026-09-20, após fechamento do P1)

- Task: `AUD19-12`; programa `AUD19-REM`; status: `COMPLETED` (qualificação local controlada).
- Ambiente: local controlado, Node `22.23.2`, PostgreSQL descartável `16-alpine`
  (`127.0.0.1:5434/cvg_test`), `PHASE11_ALLOW_DISPOSABLE_POSTGRES=1`, efeitos
  reais desabilitados. Nenhum push/deploy/publicação.
- Candidato: `9988762d…@cc28bfb` (candidateId/treeHash no pacote corrente).

## 1. Resultado

- Decisão: `CONDITIONAL_GO` (gates externos/humanos pendentes); certificação
  `AAA_CANDIDATE`; perfil elegível `STAGING`; produção `NO_GO`.
- Evals: `56/56`, threshold `0,97`; negativo `53/56` falha em três camadas.
- Cobertura: global `95,95%` statements / `92,53%` branches / `95,48%` functions
  / `96,65%` lines; módulos críticos kernel `97,09%`, approval `98,72%`,
  policy `97,87%`, journal `98,15%`, canal `97,41%`, RLS `100%`, com gate
  mecânico em `docs/03_build/tracking/aud19-critical-coverage.json`.
- Skips: gate PostgreSQL `30` arquivos / `319` testes / `0` skips; unit
  `0` required (`172` opcionais condicionais justificados).
- E2E: `75/75` em Chromium/Firefox/WebKit; a11y `48/48`.
- Mutation sentinel `9/9`; chaos/load/recovery/redteam/self-test/histórico
  PASS; preflight de produção rejeitado (exit 1, sem side effect);
  promotion check inelegível.
- Crítico independente fresco: `PASS` (P0=0, P1=0), com P2 declarados.
- Verificadores `certification:verify`/`evidence:verify` no mesmo candidato.

## 2. P2 declarados (não bloqueiam o selo local)

1. Harness de eval roda o agente determinístico, não o runtime integrado com
   holdout por categoria (`Q-A16-01` parcial).
2. Acessibilidade automatizada (axe/teclado/reflow/forced-colors), sem leitor
   de tela real ou revisão humana; evidência Linux-only.
3. `vitest.config.mts` mantém pisos 80/80/80/80; o alinhamento ao §9.1 é
   aplicado pelo certificador (globais e críticos), não pela config do vitest.
4. Sincronização documental pós-selo (runtime state/log) foi deliberadamente
   adiada para preservar o vínculo byte a byte do pacote; o resultado canônico
   é `certification/current.json`.

## 3. Reprodução

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5434/cvg_test \
PHASE11_ALLOW_DISPOSABLE_POSTGRES=1 npm run certify:phase11
npm run certification:verify:phase11
npm run evidence:verify:phase11
node scripts/phase11-2-evidence-check.mjs --critic   # PASS
node scripts/phase11-2-evidence-check.mjs --reports  # PASS
npm run production:preflight                          # exit 1 (rejeitado)
npm run promotion:check                               # eligible=false
```

## 4. Limites de autoridade

Staging real, provider, canal, IdP, RAG institucional, RPO/RTO, piloto,
rollback e sign-off humano permanecem `BLOCKED_EXTERNAL` (dossiês AUD19-13..15).
Este selo é local/controlado e não autoriza deploy nem produção.
