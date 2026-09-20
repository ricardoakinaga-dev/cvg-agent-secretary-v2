# Runbooks AUD19-09 — alertas locais controlados

Cada alerta definido em `packages/observability/src/alerts.ts` tem exatamente um
runbook nesta pasta. Os runbooks cobrem apenas execução local controlada com
dados sintéticos: nenhum comando aqui autoriza produção, dado real, provider,
canal ou efeito externo.

Owner operacional ainda não foi designado; thresholds e objetivos permanecem
`PROPOSED_NOT_APPROVED` (ver `docs/04_audit/evidence/AUD19/AUD19-09-sli-slo.json`).

| Alerta                            | Domínio   | Severidade | Runbook                              |
| --------------------------------- | --------- | ---------- | ------------------------------------ |
| `AUD19-09-ALERT-QUEUE-LAG`        | queue     | P2         | `AUD19-09-ALERT-QUEUE-LAG.md`        |
| `AUD19-09-ALERT-LEASE-CLAIM`      | lease     | P1         | `AUD19-09-ALERT-LEASE-CLAIM.md`      |
| `AUD19-09-ALERT-APPROVAL-LATENCY` | approval  | P1         | `AUD19-09-ALERT-APPROVAL-LATENCY.md` |
| `AUD19-09-ALERT-UNCERTAIN`        | uncertain | P1         | `AUD19-09-ALERT-UNCERTAIN.md`        |
| `AUD19-09-ALERT-DLQ`              | dlq       | P1         | `AUD19-09-ALERT-DLQ.md`              |
| `AUD19-09-ALERT-HANDOFF`          | handoff   | P2         | `AUD19-09-ALERT-HANDOFF.md`          |
| `AUD19-09-ALERT-ERRORS`           | errors    | P1         | `AUD19-09-ALERT-ERRORS.md`           |
| `AUD19-09-ALERT-COST`             | cost      | P2         | `AUD19-09-ALERT-COST.md`             |

## Exercício local

O exercício sintético detecta a falha, correlaciona webhook → worker → efeito e
prova recuperação:

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run
npx tsx scripts/aud19-09-observability-exercise.ts --alert AUD19-09-ALERT-DLQ --json
```

O modo `--dry-run` imprime o resumo sem escrever evidência. Para regenerar o
artefato oficial:

```bash
npx tsx scripts/aud19-09-observability-exercise.ts
```

## Verificação documental

```bash
npm run docs:check
npm run readiness
```
