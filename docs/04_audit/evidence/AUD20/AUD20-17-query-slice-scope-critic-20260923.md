# AUD20-17-FU1 — crítica independente do boundary de parsers de query

- executada em: `2026-09-23T14:03:03Z`;
- escopo: leitura fresh-context da proposta de extração dos parsers de query,
  das chamadas/testes existentes, da SPEC original de `AUD20-17` e das
  assertions de arquitetura;
- resultado: **CONDICIONALMENTE COESA E PROVAVELMENTE SUFICIENTE PARA C02**;
- limites: sem edição de arquivos, execução de testes ou autorização de BUILD.

O revisor confirmou que o bloco candidato mede 120 linhas e forma uma fronteira
coesa de normalização/validação de query: `parsePagination`, `parseTraceLimit`,
`parseOrchestrationGoalQuery`, `parseAuditEvidenceQuery` e
`parseOptionalAuditFilter`, junto do schema/lista associados. A projeção
`server.ts` 4.745 → aproximadamente 4.625 é plausível se a lógica for movida
sem duplicação; o resultado exato deve ser medido no BUILD.

Dependências a preservar: `DomainError`, Zod, `GoalStatusSchema`/`GoalStatus`,
tipos de audit query e os classificadores existentes de paginação e filtros
repetidos. `PAGINATION_OFFSET_ERROR_MESSAGE` também permanece usado em um
handler de `server.ts`. Cobertura de rota existente abrange conversas,
plataforma, orquestração, evidência de auditoria e envelopes de erro.

O revisor destacou como negativos diretos: defaults/limites/coerção, chaves
desconhecidas, valores repetidos, trimming/tamanho/charset de filtros, os seis
tipos de audit aceitos e erros com código/mensagem exatos. Também pediu cap do
módulo, ownership sem duplicata, header de responsabilidade, direção sem ciclo
e regra explícita para a soma dos módulos. A proposta atual incorpora caps
separados e total agregado.

O primeiro BUILD tem allowlist exclusiva request-context. Portanto, este
segundo boundary precisa de SPEC humana hash-bound e admissão própria; a
aprovação anterior não se aplica. A crítica não recomenda aceitação do primeiro
BUILD nem autoriza código.
