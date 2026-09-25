# Decisão humana Q1 — piso de branches críticos — AUD20-17 — 2026-09-24

- Registrada em: `2026-09-24T12:13Z`.
- Autoridade: usuário, resposta explícita nesta conversa.
- Question ID: `call_hWZ9QrH6yEvO7FUbZPuX6oQl`.
- Resposta exata: `Aplicar o piso de 95%`.
- Disposição: o piso crítico de branches de 95% se aplica a
  `apps/api/src/server/request-context.ts`.
- Esta resposta resolve somente a aplicabilidade. Ela não altera o threshold,
  registry congelado, denominador ou escopo; não converte métricas
  `REPORT_ONLY` em evidência de gate; e não autoriza novo BUILD de
  AUD20-17/IMP50-40, PostgreSQL, mutation ou liberação de AUD20-10.
- O módulo apresentou 92% de branches em resultado reportado, sem binding
  integral candidate-bound. Portanto, a regra aplicável é 95%, mas o valor
  observado continua `REPORT_ONLY` e não prova por si só um resultado C06
  candidate-bound. C06/C07 permanecem `FAIL`; request-context não está aceita.
- Esta resposta mais recente prevalece para a aplicabilidade sobre as opções
  anteriores de manter a classificação sem adjudicação. Ela não libera Q2 nem
  staging/produção, que continuam `NO_GO`.
- Evidência relacionada: [reconciliação read-only](AUD20-17-manifest-baseline-reconciliation-20260924.md),
  [errata de interpretação](AUD20-17-request-context-branch-floor-erratum-20260924.md)
  e [rota C06](AUD20-17-C06-gate-route-proposal-20260924.md).
