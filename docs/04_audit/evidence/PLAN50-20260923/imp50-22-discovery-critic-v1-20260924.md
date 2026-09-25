# IMP50-22 — crítica fresh-context da Discovery v1

- Revisão: 2026-09-24
- Artefato revisado: Discovery 0025, SHA-256
  78464d636b44a17dbdcf74c2ffc8ab48728d72387a69b844197900bf79ce926a
- Modo: leitura somente; nenhum arquivo foi alterado e nenhum teste foi
  executado pelo crítico.
- Veredito: REVISE; DISCOVERY_READY não se justifica.

## Achados

1. **Autoridade de subfatia não resolvida.** A proposta precisava avaliar o
   registro IMP50 datado que 0341 identifica como disposição por item, e
   declarar se ele será consultado, excluído ou substituído como autoridade
   atual. O registro é uma fotografia que antecede decisões posteriores; não
   pode ser tratado silenciosamente como estado vivo. Sem isso, o checker não
   tem regra determinística para status de subfatia.
2. **Drift de próxima ação não comprovado.** QP-05 em 0571 documenta drift de
   status, mas não identifica fontes e valores divergentes de próxima ação.
   A Discovery deve limitar a afirmação ao status histórico comprovado ou
   fornecer um exemplo reproduzível. Nenhum mismatch corrente deve ser
   inferido.
3. **Fixtures mínimos ausentes.** A proposta precisa listar exemplos positivos
   e negativos de estado coerente, resumo divergente, snapshot de planejamento
   e subfatia sem fonte declarada para tornar escopo e alternativas verificáveis.

## Limites confirmados

O tratamento preserva AUD20-08 como COMPLETED; PASS_LOCAL não é elevado
ao status da task-mãe. O veredito é apenas sobre prontidão da Discovery e não
admite PRD, SPEC, checker, BUILD ou qualquer promoção de status.

## Fontes

- [Discovery 0025](../../../00_discovery/0025_aud20_08_imp50_22_semantic_consistency.md)
- [Backlog 0341](../../../03_build/0341_plan50_backlog_20260923.md)
- [Backlog 0343](../../../03_build/0343_post_query_backlog_20260923.md)
- [IMP50 status snapshot](imp50-status-20260923.md)
- [Revisão 0571](../../../04_audit/0571_implementation_state_review_2026-09-23.md)
