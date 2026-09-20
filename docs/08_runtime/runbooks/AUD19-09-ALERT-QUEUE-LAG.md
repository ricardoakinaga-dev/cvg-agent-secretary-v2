# AUD19-09-ALERT-QUEUE-LAG — backlog do outbox acima do limiar

- Alerta: `AUD19-09-ALERT-QUEUE-LAG`
- Domínio: `queue` · Severidade: `P2`
- Regra: `max(worker_outbox_lag) > 100` em janela de 5m
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

O outbox não está drenando no ritmo esperado. Pode ser worker parado, claim
bloqueado por lease, erro repetido ou aumento real de volume. O lag é um gauge:
o valor observado é o máximo da janela.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-QUEUE-LAG
npm run docs:check
npm run readiness
```

Nunca abra payloads, objetivos ou conteúdo de mensagem. Trabalhe apenas com
IDs (`correlationId`, `eventId`, `workerId`) e contadores.

## Triagem

1. Confirme o valor de `worker_outbox_lag` e o `workerId` mais recente nos logs
   estruturados `worker.outbox.summary` (campos `lag`, `claimed`, `processed`).
2. Localize o `correlationId` da primeira mensagem pendente e siga o trace
   API → outbox → worker no coletor local (spans `outbox.enqueue` e
   `worker.outbox.claim`).
3. Verifique se há `worker_outbox_claim_failures_total` ou
   `worker_outbox_lease_lost_total` no mesmo período; se houver, abra também o
   runbook `AUD19-09-ALERT-LEASE-CLAIM.md`.
4. Confirme que o processo worker local está ativo e que a fila usada é a de
   testes (`npm run readiness` valida o runtime controlado).

## Recovery criteria / Critérios de recuperação

- `worker_outbox_lag` de volta a `0` (ou abaixo de `100`) por uma janela
  completa de 5m.
- Nenhum incremento novo de `worker_outbox_claim_failures_total` ou
  `worker_outbox_lease_lost_total` na janela.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

Se o lag persistir sem erros visíveis, pare o run local, preserve os IDs e
registre o achado no loop de remediação. Este runbook não autoriza reinício de
produção, limpeza de fila real ou consumo de mensagens reais.
