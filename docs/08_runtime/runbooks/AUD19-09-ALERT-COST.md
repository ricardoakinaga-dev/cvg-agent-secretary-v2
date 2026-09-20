# AUD19-09-ALERT-COST — custo de modelo acima do orçamento proposto

- Alerta: `AUD19-09-ALERT-COST`
- Domínio: `cost` · Severidade: `P2`
- Regra: `sum(model_cost_usd) > 25` em janela de 1h
- Owner: não designado (`PROPOSED_NOT_APPROVED`)
- Escopo: execução local controlada, dados sintéticos. Nenhuma ação de produção.

## O que significa

O custo acumulado de chamadas de modelo passou do orçamento proposto para o run
sintético. O threshold é um placeholder até o owner operacional aprovar um
objetivo; ele não é um SLO. O provider real permanece desabilitado no modo
controlado.

## Inspeção segura (dry-run)

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run --alert AUD19-09-ALERT-COST
npm run docs:check
npm run test:evals
```

Nunca abra prompts, objetivos ou respostas de modelo. Use apenas `model`,
`provider`, `agentProfile`, `correlationId` e valores agregados.

## Triagem

1. Confirme a soma de `model_cost_usd` e a distribuição por `model`/`provider`.
2. Verifique se houve aumento de `model_calls_total` sem aumento de
   `agent_runs_total`: pode ser retry excessivo ou replanejamento em loop.
3. Correlacione com `orchestrator_goal_recovery_total` e com o custo por Goal
   para identificar concentração anormal.
4. Se o custo vier de retry por falha, abra também o runbook
   `AUD19-09-ALERT-ERRORS.md`; não desative tracing nem redaction para
   economizar.

## Recovery criteria / Critérios de recuperação

- `sum(model_cost_usd) <= 25` em uma janela completa de 1h.
- Nenhum run sintético acima do orçamento declarado no exercício.
- Custo por Goal de volta ao intervalo esperado, com causa raiz registrada.
- A avaliação sustentada do exercício não reporta nenhuma regra em `firing`.

## Escalonamento e limites

Custo é métrica de negócio: qualquer mudança de teto exige decisão do owner
operacional. Este runbook não autoriza contratação, provider real ou gasto
externo.
