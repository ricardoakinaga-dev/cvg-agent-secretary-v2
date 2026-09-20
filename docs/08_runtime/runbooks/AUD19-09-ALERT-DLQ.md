# AUD19-09-ALERT-DLQ — evento na dead-letter queue

- Alerta: `AUD19-09-ALERT-DLQ`
- Domínio: `dlq` · Severidade: `P1`
- Regra: `sum(worker_outbox_dead_lettered_total) > 0` em janela de 15m
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

Um evento esgotou as tentativas e foi para a DLQ: o efeito correspondente pode
não ter sido aplicado. É a falha central do exercício sintético e o caminho de
detecção → correlação → recuperação.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-DLQ
npm run docs:check
npm run readiness
```

Nunca abra o payload do evento. Use apenas `eventId`, `workerId`, `attempt`,
`errorCode` sanitizado e `correlationId`.

## Triagem

1. Localize o log `worker.outbox.dead_letter` e colete `eventId`, `workerId`,
   `attempt` e `errorCode`.
2. Siga o `correlationId` no trace até o span `worker.outbox.claim` e verifique
   em qual tentativa a falha ocorreu; compare com
   `worker_outbox_failed_total`.
3. Confirme no effect journal se o efeito foi aplicado. Se não foi, planeje um
   replay controlado do evento; se foi, trate como duplicidade e não repita.
4. Replay local deve manter o mesmo `correlationId` e registrar quem autorizou.

## Recovery criteria / Critérios de recuperação

- O evento reprocessado atinge `channel.effect.dispatched` com o mesmo
  `correlationId` e efeito aplicado exatamente uma vez.
- Nenhum incremento novo de `worker_outbox_dead_lettered_total` por uma janela
  completa de 15m.
- `worker_outbox_lag` de volta a `0` e nenhum novo erro de worker na janela.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

Se o replay falhar de novo, pare o run e preserve a evidência (IDs, spans,
métricas) antes de qualquer nova tentativa. Este runbook não autoriza consumir
DLQ de produção nem reenviar efeito real.
