# AUD17-11 — operação, observabilidade e reconciliação

**Status:** VERIFIED_LOCAL_WITH_RUNBOOK
**Escopo:** operação controlada local; nenhuma ação clínica, financeira ou mutação externa.

## Runbook de falha

1. Confirmar `tenant`, `goalId`, `correlationId`, `stepId`, `attemptId`, `worker/lease` e o último estado observado; não copiar payload sensível.
2. `UNCERTAIN`, `HUMAN_HANDOFF`, `WAITING_APPROVAL` e `BUDGET_EXHAUSTED` são estados de pausa: não reexecutar, confirmar, cancelar ou reagendar automaticamente.
3. Para lease expirado, preservar o snapshot de token/versão e executar apenas a reconciliação autorizada. Token/versão divergente é no-op/CAS perdido.
4. Para dead letter, verificar erro redigido, tentativas, correlação e tenant; corrigir a causa antes de qualquer requeue controlado.
5. Para bootstrap de produção rejeitado, corrigir a dependência real (DB/RLS/migrations/secrets/identity/HTTPS/attestation); não trocar a falha por ENV `true`.
6. Anexar log, digest, comando, versão Node e limitação ao dossiê; atualizar runtime state, execution log e backlog antes de fechar a rodada.

## Provas

`npm run test:worker:startup`, `npm run test:e2e`, `npm run production:preflight -- --profile=PRODUCTION --expect=REJECT` e os testes de recovery/redaction passaram no escopo sintético. O console mantém a ação de reconciliação somente leitura e expõe a automação suspensa.

## Limitações

Alertas/telemetria hosted, SLO, RPO/RTO físico, plantão, rollback ensaiado e signoff humano são gates externos `BLOCKED_EXTERNAL`.
