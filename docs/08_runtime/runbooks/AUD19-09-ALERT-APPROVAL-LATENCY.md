# AUD19-09-ALERT-APPROVAL-LATENCY — latência de aprovação acima do alvo

- Alerta: `AUD19-09-ALERT-APPROVAL-LATENCY`
- Domínio: `approval` · Severidade: `P1`
- Regra: `p95(approval_latency_ms) > 5000` em janela de 15m (mínimo de 5
  amostras)
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

O tempo entre solicitar e confirmar uma aprovação está alto. A latência é P1
porque o runtime pode expirar a aprovação e cair em `UNCERTAIN`/handoff.
`approval_latency_ms` está marcada como instrumentação proposta no catálogo de
SLIs; até a emissão real existir, o exercício injeta amostras sintéticas.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-APPROVAL-LATENCY
npm run docs:check
npm run test:evals
```

Nunca abra o conteúdo da solicitação de aprovação. Use apenas `approvalId`,
`correlationId`, `status` e a duração.

## Triagem

1. Confirme a distribuição por `status` da aprovação: aprovada, rejeitada,
   expirada ou ainda pendente.
2. Siga o `correlationId` no trace: spans `approval.requested` e
   `approval.confirmed` (ou o evento de auditoria equivalente) mostram onde o
   tempo foi gasto.
3. Verifique se há acúmulo de aprovações pendentes no console local e se o
   sweep está liberando expirações (`worker_sweep_approvals_released_total`).
4. Se a aprovação tiver expirado, abra também o runbook
   `AUD19-09-ALERT-UNCERTAIN.md`.

## Recovery criteria / Critérios de recuperação

- `p95(approval_latency_ms) <= 5000` em uma janela completa de 15m com pelo
  menos 5 amostras.
- Nenhuma aprovação pendente além do deadline configurado no run local.
- Nenhum novo incremento de `worker_sweep_approvals_uncertain_total`.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

Se a latência decorrer de dependência externa (canal, provider), pare o fluxo e
trate como bloqueio de ambiente, não como ajuste de threshold. Este runbook não
autoriza aprovar, confirmar ou reagendar consulta real.
