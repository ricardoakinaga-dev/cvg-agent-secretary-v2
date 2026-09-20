# AUD19-09-ALERT-LEASE-CLAIM — perda de lease ou falha de claim

- Alerta: `AUD19-09-ALERT-LEASE-CLAIM`
- Domínio: `lease` · Severidade: `P1`
- Regra: `sum` de `worker_outbox_lease_lost_total`,
  `worker_outbox_claim_failures_total` e
  `orchestrator_step_claim_total{outcome="conflict"} > 0` em janela de 5m
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

Duas instâncias podem estar disputando o mesmo evento, o lease expirou durante o
processamento, ou o store de claims recusou a operação. Qualquer ocorrência é
P1 porque a propriedade do efeito fica ambígua: um efeito pode ser aplicado duas
vezes ou nenhuma.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-LEASE-CLAIM
npm run docs:check
npm run typecheck
```

Nunca abra payloads. Use apenas `eventId`, `workerId`, `leaseId`, `attempt`,
`correlationId` e códigos de erro sanitizados.

## Triagem

1. Procure o log `worker.lease_lost` ou `worker.claim_failed` e colete
   `eventId`, `workerId`, `attempt` e o código de erro sanitizado.
2. Compare o `traceId`/`correlationId` do claim perdido com o span
   `worker.outbox.claim` correspondente no coletor; verifique se um segundo
   worker emitiu `worker_outbox_processed_total` para o mesmo `eventId`.
3. Cheque a configuração de `leaseMs`/`heartbeatIntervalMs` do run local; um
   lease curto com efeito lento produz perda espúria.
4. Se houver conflito de claim no orquestrador, inspecione
   `orchestrator_step_claim_total{outcome="conflict"}` e o estado do Goal em
   modo somente leitura.

## Recovery criteria / Critérios de recuperação

- Nenhum novo incremento das métricas da regra por uma janela completa de 5m.
- Nenhum evento processado duas vezes: contagem de efeitos por `eventId`
  permanece `1`.
- O step/goal afetado converge para um estado terminal válido (`SUCCEEDED`,
  `FAILED` ou `CANCELLED`) sem fencing vencido.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

Perda de lease com efeito aplicado é incidente de duplicidade: pare o run,
preserve a evidência de correlação e não reinicie o worker até entender a
causa. Este runbook não autoriza intervenção em fila real nem em produção.
