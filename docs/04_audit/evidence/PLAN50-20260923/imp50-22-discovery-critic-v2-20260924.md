# IMP50-22 — crítica fresh-context da Discovery v2

- Revisão: 2026-09-24
- Artefato revisado: Discovery 0025, SHA-256
  `50173bb3e9112e76984bf7043db1fef8348ebda66d1c5e76f4cf9f73d539bb9d`
- Modo: leitura somente; nenhum arquivo foi alterado e nenhum teste foi
  executado pelo crítico.
- Veredito: `BLOCKED`; não registrar `DISCOVERY_READY` nem iniciar PRD.
- A crítica v1 revisou SHA-256
  `78464d636b44a17dbdcf74c2ffc8ab48728d72387a69b844197900bf79ce926a` da
  Discovery e seu parecer tem SHA-256
  `9704305a2a8113cd6850131ed778b9d1457b6d2cd27bd91938f437f71513c7f7`.

## Rechecagem dos bytes formatados

Após formatação documental, a crítica fresh-context revisou novamente a
Discovery no SHA-256 `50173bb3e9112e76984bf7043db1fef8348ebda66d1c5e76f4cf9f73d539bb9d`.
Veredito `BLOCKED` permanece: A/B segue sem decisão, e não deve ser registrado
`DISCOVERY_READY`. Nenhum arquivo foi editado e nenhum teste foi executado.

## Achados

1. **Autoridade e frescor:** a Discovery v2 identifica o registro IMP50 de
   2026-09-23 como fotografia, não autoridade viva, e exclui 0341 e esse
   snapshot do estado corrente de subfatias. Isso atende ao achado v1. Porém,
   a escolha material segue aberta: (A) excluir status de subfatia do checker
   ou (B) criar registro versionado e autorizado. Discovery 0017 e PRD 0028
   definem autoridade da task corrente, mas não autorizam uma fonte de estado
   de subfatia; a lacuna bloqueia o gate.
2. **Próxima ação:** 0571 QP-05 prova drift histórico de status, não uma
   divergência reproduzível de próxima ação. A Discovery v2 limita a afirmação
   e trata essa fixture como prevenção prospectiva. O achado v1 foi atendido.
3. **Fixtures:** os sete cenários incluem estado coerente, divergências de
   status/próxima ação, snapshot datado, preservação do status da task-mãe,
   `PASS_LOCAL`, histórico e ausência de fonte de subfatia. O último depende da
   decisão A/B. O achado v1 foi atendido.
4. **Completude e limite:** a proposta descreve problema, atores, fluxo,
   baseline limitada a um caso, resultado, incertezas, alternativas e
   falsificação. Não reivindica mismatch corrente. O checker atual valida
   projeções da task e matriz; não interpreta semanticamente 0337 nem define
   autoridade para subfatias. Isso sustenta a lacuna proposta, mas não decide
   quem autoriza uma fonte futura.

A Discovery recomenda continuar a etapa e não concede gate. Não há base para
PRD antes de resolver A/B e a autoridade correspondente. Revisão somente de
leitura; nenhum teste executado.

## Fontes

- [Discovery 0025](../../../00_discovery/0025_aud20_08_imp50_22_semantic_consistency.md)
- [Crítica v1](imp50-22-discovery-critic-v1-20260924.md)
- [Backlog 0341](../../../03_build/0341_plan50_backlog_20260923.md)
- [Backlog 0343](../../../03_build/0343_post_query_backlog_20260923.md)
- [IMP50 status snapshot](imp50-status-20260923.md)
- [Revisão 0571](../../../04_audit/0571_implementation_state_review_2026-09-23.md)
