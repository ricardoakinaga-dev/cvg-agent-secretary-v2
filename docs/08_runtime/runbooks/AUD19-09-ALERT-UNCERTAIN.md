# AUD19-09-ALERT-UNCERTAIN — estados UNCERTAIN acumulados

- Alerta: `AUD19-09-ALERT-UNCERTAIN`
- Domínio: `uncertain` · Severidade: `P1`
- Regra: `sum` de `worker_sweep_approvals_uncertain_total` e
  `orchestrator_step_settle_total{outcome="uncertain"} > 0` em janela de 15m
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

O runtime não conseguiu concluir com certeza: a aprovação expirou, o step
estourou o timeout ou o resultado do efeito é desconhecido. `UNCERTAIN` nunca
pode ser continuado automaticamente; exige inspeção humana e um caminho
explícito de retomada.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-UNCERTAIN
npm run docs:check
npm run readiness
```

Nunca abra payload, objetivo ou anotação clínica. Use apenas IDs, estado e
motivo sanitizado.

## Triagem

1. Liste as aprovações e steps em `UNCERTAIN` no console local e colete
   `approvalId`, `goalId`, `stepId` e `correlationId`.
2. Para cada item, determine se o efeito foi aplicado: compare o effect journal
   com os spans `channel.effect.dispatched` do mesmo `eventId`.
3. Classifique: efeito confirmado (seguir para retomada), efeito ausente
   (replay seguro) ou efeito ambíguo (handoff humano).
4. Não execute retomada automática: a continuidade de `UNCERTAIN` exige
   aprovação explícita registrada.

## Recovery criteria / Critérios de recuperação

- Nenhum novo incremento das métricas da regra por uma janela completa de 15m.
- Todo item `UNCERTAIN` do run local tem decisão humana registrada
  (retomada, cancelamento ou handoff) com carimbo de tempo.
- Nenhuma duplicidade de efeito por `eventId`.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

`UNCERTAIN` não resolvido bloqueia o run. Este runbook não autoriza confirmar,
cancelar ou reagendar consulta real, nem executar ação clínica, financeira ou de
prontuário.
