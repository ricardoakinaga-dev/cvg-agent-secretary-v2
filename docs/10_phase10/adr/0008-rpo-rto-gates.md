# ADR 0008 — RPO/RTO como gate verificável

- Status: aceito (Phase 10)
- Contexto: metas de RPO/RTO existiam apenas como documento.
- Decisão: formalizar alvos (RPO ≤ 5 min, RTO ≤ 30 min), produzir verificação
  de snapshot/restore com digest e integridade, e exigir medição em
  infraestrutura real antes de declarar atingimento. Sem medição, a decisão
  máxima é `CONDITIONAL_GO`.
- Consequências: `certification/restore-report.json` registra o teste local;
  P10-B04 permanece bloqueador de produção; nenhuma declaração de RPO/RTO é
  feita sem execução real.
