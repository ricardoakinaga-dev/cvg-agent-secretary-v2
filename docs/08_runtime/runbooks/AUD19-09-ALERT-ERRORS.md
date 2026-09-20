# AUD19-09-ALERT-ERRORS — erros e falhas de worker acumulados

- Alerta: `AUD19-09-ALERT-ERRORS`
- Domínio: `errors` · Severidade: `P1`
- Regra: `sum` de `worker_outbox_errors_total`,
  `worker_outbox_failed_total`, `worker_sweep_failures_total` e
  `worker_outbox_claim_failures_total > 3` em janela de 5m
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

O processamento está degradado mesmo antes de gerar DLQ explícita. Pode ser
efeito de dependência local ausente, erro de serialização, store indisponível
ou sweep falhando. O limiar foi calibrado para o run sintético e não é um SLO
aprovado.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-ERRORS
npm run docs:check
npm run typecheck
```

Nunca imprima a mensagem de erro bruta se ela puder conter conteúdo; use o
`errorCode` sanitizado, `eventId`, `workerId` e `correlationId`.

## Triagem

1. Classifique as falhas por `errorCode` e por `operation` nos logs
   estruturados do worker.
2. Verifique se o erro é de infraestrutura local (por exemplo store de teste
   indisponível) ou de lógica; replicar com `npm run readiness` separa os dois.
3. Siga o `correlationId` da primeira falha no trace e identifique a tentativa
   (`attempt`) em que o erro ocorreu.
4. Se a origem for o sweep, inspecione
   `worker_sweep_goal_recovery_failures_total` e o runbook de lease.

## Recovery criteria / Critérios de recuperação

- `sum` das métricas da regra `<= 3` em uma janela completa de 5m.
- Nenhuma falha nova com o mesmo `errorCode` após a correção.
- `worker_outbox_processed_total` volta a crescer e a DLQ permanece estável.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

Erro repetido com efeito pendente é incidente P1: pare o run e preserve a
evidência. Este runbook não autoriza reprocessar fila real nem alterar produção.
