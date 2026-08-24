# 0503 — Aprovacao Humana

## Quando solicitar aprovacao

Solicitar aprovacao humana para:

- decisao de negocio;
- mudanca de escopo;
- conflito entre PRD e SPEC;
- risco critico;
- acao irreversivel;
- inicio de implementacao real apos fase documental;
- confirmacao de regras sensiveis de agenda, financeiro ou prontuario.

## Estado esperado

```txt
status: WAITING_HUMAN_APPROVAL
human_decision_required: yes
decision_description: descrever decisao necessaria
```

## Regras

- Nao assumir regra de negocio silenciosamente.
- Nao transformar hipotese em requisito sem registro.
- Nao iniciar build real quando a decisao afetar seguranca, escopo ou dados sensiveis.
