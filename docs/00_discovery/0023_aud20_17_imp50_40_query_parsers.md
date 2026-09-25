# Discovery proposta AUD20-17-FU1 — extração de parsers de query

## Estado

- task-mãe: `AUD20-17`, atualmente `IN_PROGRESS` após a primeira fatia
  `request-context` de `IMP50-40`;
- candidato: segunda fatia proposta de `IMP50-40`, sem admissão de BUILD;
- fase: proposta de Discovery para seguir à revisão PRD/SPEC;
- limites: somente repositório local e dados sintéticos; sem API/schema,
  persistência, web, dados reais, commit, push, deploy, staging ou produção.

## Gatilho e problema

A primeira fatia aprovada reduziu `apps/api/src/server.ts` de 4.958 para 4.745
linhas, mas não atingiu o C02 registrado (`server.ts <=4708`). O resultado está
documentado em
[AUD20-17 BUILD v1](../04_audit/evidence/AUD20/AUD20-17-v1-build-report-20260923.md)
e na [crítica independente v1](../04_audit/evidence/AUD20/AUD20-17-independent-critic-v1-20260923.md).
Esta proposta preserva o limite e avalia uma fronteira adicional, em vez de
alterar retroativamente o critério ou estender a allowlist da fatia aprovada.

## Evidência observada

- O bloco contínuo nas linhas 4.183–4.302 de `server.ts` tem 120 linhas e
  contém `parsePagination`, `parseTraceLimit`, `parseOrchestrationGoalQuery`,
  `OrchestrationGoalQuerySchema`, `auditEventTypes`,
  `parseAuditEvidenceQuery` e `parseOptionalAuditFilter`.
- Os parsers são chamados por rotas de conversas, goals de orquestração,
  evidência de auditoria e traces. Eles dependem de `DomainError`, dos tipos de
  consulta de auditoria, de `GoalStatusSchema`, `zod` e dos classificadores
  locais de paginação/filtro duplicado.
- Há cobertura de rota para paginação, filtros inválidos e status inválido em
  `conversation-list.test.ts`, `audit-evidence.test.ts`,
  `orchestration-observability.test.ts`, `server-boundary-envelope.test.ts` e
  `platform-admin-routes-coverage.test.ts`. Não existe ainda um teste direto
  dos parsers como módulo.
- `PAGINATION_OFFSET_ERROR_MESSAGE` também é usado diretamente em um handler de
  `server.ts`; a extração não pode remover nem alterar esse contrato no caller.
- A strictness não é uniforme: `parseTraceLimit` e
  `parseOrchestrationGoalQuery` rejeitam chaves desconhecidas; `parsePagination`
  e `parseAuditEvidenceQuery` ignoram chaves que não consomem. A nova SPEC deve
  preservar esta diferença, além de coerção e erros atuais.

## Hipótese de fatia

Mover somente os sete parsers/schema/lista de tipos para
`apps/api/src/server/request-query.ts`. `server.ts` fica como consumidor e
mantém handlers e rotas. O bloco atual mede 120 linhas; sua remoção deve deixar
o servidor com margem para o cap de 4.708, mas o número final somente pode ser
confirmado no BUILD e não é presumido nesta Discovery.

A nova unidade não pode importar `server.ts`, Fastify, `pg`, stores, adapters ou
`process.env`. Imports de contratos devem permanecer tipos quando possível; os
classificadores de duplicata/paginação continuam nos módulos locais existentes.
Nenhuma função será compartilhada com `request-context.ts` apenas para reduzir
linhas.

## Opções e riscos

1. Manter v1 não aceita até redesenhar a decomposição: mantém o boundary atual,
   mas deixa C02 aberto.
2. Elevar o cap de `server.ts` para 4.745: rejeitada para esta proposta porque
   converteria o resultado observado no novo critério.
3. Estender a fatia request-context já aprovada: não permitida pela aprovação
   hash-bound e misturaria responsabilidades distintas.
4. Revisar uma segunda extração coesa de parsers de query: recomendada para
   revisão, desde que preserve todos os limites por medição e tenha aprovação
   humana própria antes de qualquer código.

Riscos principais: alteração de mensagens/status de `DomainError`, perda da
rejeição de query repetida, deriva dos tipos de auditoria, ciclo arquitetural e
crescimento agregado dos módulos. A proposta de SPEC deve congelar negativos,
arquivos permitidos e limites separados para `server.ts`, `request-context.ts`,
`request-query.ts` e sua soma.

## Resultado desta etapa

Esta é uma análise candidata, sem PRD aprovado, SPEC aprovada ou autorização de
BUILD. A aprovação anterior cobre somente `request-context`; nenhum código ou
teste foi alterado ou executado para esta proposta. A revisão independente do
boundary está registrada abaixo; qualquer SPEC resultante permanece sujeita a
revisão humana separada.

## Revisão independente de escopo

A crítica fresh-context considerou a fronteira **condicionalmente coesa e
provavelmente suficiente para C02**, sujeita a preservar coerção, strictness,
tratamento de query repetida e erros HTTP. A projeção de tamanho é plausível,
mas não substitui medição no BUILD. O parecer pede negativos diretos, caps do
módulo e da soma agregada, e aprovação/admissão separadas. Ver
[crítica independente](../04_audit/evidence/AUD20/AUD20-17-query-slice-scope-critic-20260923.md).

A crítica de boundary fechou o desconhecido para continuar o pipeline. A
crítica v2 da SPEC confirmou que as correções de strictness, erros e import
type-only resolveram as lacunas de revisão; durante o BUILD será necessário
adicionar assertions das mensagens HTTP exatas. Ver
[crítica SPEC v1](../04_audit/evidence/AUD20/AUD20-17-query-spec-critic-v1-20260923.md)
e [v2](../04_audit/evidence/AUD20/AUD20-17-query-spec-critic-v2-20260923.md).
O gate incremental `DISCOVERY_READY` para PRD/SPEC está em
[0090](0090_discovery_validation.md); isso não autoriza implementação.
