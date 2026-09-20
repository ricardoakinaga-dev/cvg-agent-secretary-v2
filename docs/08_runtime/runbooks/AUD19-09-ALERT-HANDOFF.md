# AUD19-09-ALERT-HANDOFF — volume de handoffs acima do esperado

- Alerta: `AUD19-09-ALERT-HANDOFF`
- Domínio: `handoff` · Severidade: `P2`
- Regra: `sum(worker_outbox_handoffs_total) > 5` em janela de 15m
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

O worker está encaminhando eventos para atendimento humano em volume maior do
que o esperado para o run sintético. Handoff é um resultado legítimo, mas a
elevação pode indicar política restritiva demais, falha de capability ou
aumento de casos ambíguos.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-HANDOFF
npm run docs:check
npm run readiness
```

Nunca abra conteúdo do caso. Use apenas `correlationId`, `capability`, `risk`,
`status` e contadores.

## Triagem

1. Confirme o volume e a distribuição por `capability`/`risk` nos eventos de
   handoff.
2. Verifique se houve aumento de `policy_denied_total` ou
   `effect_scope_denied_total` no mesmo período: política restritiva explica o
   handoff legítimo.
3. Se o handoff vier de falha técnica, correlacione com
   `worker_outbox_errors_total` e abra o runbook
   `AUD19-09-ALERT-ERRORS.md`.
4. Não reduza threshold nem afrouxe política para silenciar o alerta sem
   decisão do owner.

## Recovery criteria / Critérios de recuperação

- `sum(worker_outbox_handoffs_total) <= 5` em uma janela completa de 15m.
- Causa raiz do aumento registrada (política, capability ou falha) com
  `correlationId` de exemplo.
- Nenhum handoff sem contexto suficiente para o operador decidir.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

Handoff não resolvido não é falha do runtime por si só, mas bloqueia a
conclusão do run. Este runbook não autoriza contato com paciente ou canal real.
