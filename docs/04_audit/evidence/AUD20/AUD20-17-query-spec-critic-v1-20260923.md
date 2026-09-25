# AUD20-17-FU1 — crítica independente da proposta de SPEC v1

- rodada: `2026-09-23`, revisão fresh-context;
- escopo: PRD/SPEC propostos para a segunda fatia request-query;
- veredito da versão revisada: **REVISION_REQUIRED**;
- execução: somente leitura; nenhum código ou teste foi executado.

O revisor considerou a fronteira clara e os caps de tamanho plausíveis. Com a
remoção do bloco de 120 linhas, `server.ts` iria de 4.745 para aproximadamente
4.625 antes dos imports; com `request-context.ts=258` e `request-query.ts<=160`,
a soma proposta `<=5050` é atingível, mas oferece somente cerca de sete linhas
de margem quando o módulo novo chega ao cap. A contagem real continua sendo
gate de aceitação.

O revisor identificou quatro correções necessárias antes de revisão de
aprovação:

1. O draft inicialmente dizia rejeitar todas as chaves desconhecidas; o código
   atual é estrito somente em `parseTraceLimit` e
   `parseOrchestrationGoalQuery`, enquanto `parsePagination` e
   `parseAuditEvidenceQuery` as ignoram.
2. Os testes diretos precisavam nomear parâmetros repetidos de `limit`/`offset`
   e filtros audit não string.
3. O PRD exigia preservar mensagens, mas seu aceite AC03 citava apenas status e
   envelope; devia exigir também código e mensagem exatos nos testes de rota.
4. A assertion arquitetural precisava exigir que os imports de
   `@cvg/persistence` fossem somente `import type`.

Esses pontos foram incorporados ao draft corrente; requerem confirmação numa
crítica de seguimento antes da revisão humana do SPEC. A aprovação humana da
primeira fatia `request-context` não cobre esta proposta.
