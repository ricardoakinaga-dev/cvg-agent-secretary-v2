# AUD20-17-FU1 — crítica independente do BUILD query-parser v1

- escopo: leitura fresh-context do código e testes do slice query-parser;
- snapshot: hashes em
  [manifesto pré-crítica](AUD20-17-query-raw-20260923/candidate-before-critic.sha256);
- execução: somente leitura; a crítica não executou testes nem alterou arquivos;
- veredito: **CONDITIONAL**; nenhum defeito semântico foi encontrado.

## Achados

1. **Médio — envelope de erro incompletamente afirmado nos testes de rota.**
   As rotas verificavam status e campos de erro, mas não afirmavam de forma
   consistente `success: false` nem `data: null` nos erros de paginação,
   filtro e status. Exemplos: `audit-evidence.test.ts`,
   `orchestration-observability.test.ts`,
   `server-boundary-envelope.test.ts` e
   `platform-admin-routes-coverage.test.ts`. Isso deixava parte do AC03 sem
   guarda explícita.
2. **Baixo — alguns limites não tinham exemplos diretos.**
   `request-query.test.ts` não afirmava o limite inferior zero em
   `parseTraceLimit`/`parseOrchestrationGoalQuery` nem `limit` repetido no
   parser de goals.

A revisão confirmou que o módulo mantém defaults, coerção, strictness por
parser, classificação de duplicatas, seis tipos de evento, trim/tamanho/regex
dos filtros e códigos/mensagens exatos de `DomainError`. As assertions de
arquitetura cobrem imports, import type-only de persistence, ownership, uso de
ambiente, direção/ciclos, exports públicos e caps. Medição: `server.ts=4622`,
`request-context.ts=258`, `request-query.ts=138`, total `5018`.

## Resposta do BUILD v2

Os testes autorizados passaram a afirmar `success: false`, `data: null` e
`meta.correlationId` nas respostas de erro das cinco famílias de rota cobertas.
Os testes diretos agora incluem os limites inferiores de trace/goal e `limit`
repetido para goal. Os erros HTTP existentes continuam afirmando código e
mensagem exatos. Esses ajustes são somente de teste e permanecem na allowlist.

Esta crítica não aceita o candidato. Regressão/coverage e uma crítica final
fresh-context separada ainda são necessárias para fechar o AC05.
