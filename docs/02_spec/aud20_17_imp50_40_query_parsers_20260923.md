# SPEC proposta AUD20-17-FU1 — parsers de query

## Estado

- task: `AUD20-17` / candidato `IMP50-40`;
- fase: `SPEC` proposta, `DRAFT_PENDING_HUMAN_REVIEW`;
- execução prevista: `CONTROLLED_LOCAL` após aprovação separada;
- BUILD: **não admitido nem autorizado por este documento**;
- produção e staging: `NO_GO`;
- revisão independente: v1 pediu correções; v2 não encontrou bloqueador de SPEC,
  mas exige assertions das mensagens HTTP exatas nos testes de BUILD.

A aprovação humana existente em
[AUD20-17-human-approval-20260923.md](../04_audit/evidence/AUD20/AUD20-17-human-approval-20260923.md)
cobre exclusivamente a primeira fatia `request-context` e seu hash de SPEC.
Ela não cobre este arquivo nem seus paths adicionais.

## Objetivo e fronteira

Mover os parsers de query existentes em `apps/api/src/server.ts` para o novo
módulo interno `apps/api/src/server/request-query.ts`, sem mudar resultado,
erros, status ou shape público. O módulo será dono somente de:

- `parsePagination`;
- `parseTraceLimit`;
- `OrchestrationGoalQuerySchema` e `parseOrchestrationGoalQuery`;
- `auditEventTypes`, `parseAuditEvidenceQuery` e
  `parseOptionalAuditFilter`.

O `server.ts` continua dono dos handlers e composição. Os parsers são chamados
em rotas de conversas, goals, evidência de auditoria e traces. Não mover
`PAGINATION_OFFSET_ERROR_MESSAGE` do handler que o usa fora do grupo extraído.

## Dependências permitidas

- `@cvg/shared`: `DomainError`;
- `@cvg/agent-runtime`: `GoalStatusSchema` e tipo `GoalStatus`;
- `@cvg/persistence`: somente tipos `AuditEventType`,
  `AuditEvidenceFilters` e `AuditEvidenceQuery`;
- `zod`;
- `../pagination-boundary.ts` e
  `../audit-filter-duplicate-boundary.ts`.

Proibidos: `server.ts`, Fastify, `pg`, stores/adapters, `process.env`,
orchestration/runtime implementation, effects e dependência reversa de caller.
Imports de tipos devem permanecer `import type`.

## Allowlist de arquivos

- adicionar `apps/api/src/server/request-query.ts`;
- adicionar `apps/api/src/__tests__/request-query.test.ts`;
- alterar `apps/api/src/server.ts` apenas para remover os sete parsers e
  importar/consumir o módulo, sem editar handlers ou contratos;
- ajustar, se a evidência focal exigir, somente estes testes de rota:
  `conversation-list.test.ts`, `audit-evidence.test.ts`,
  `orchestration-observability.test.ts`, `server-boundary-envelope.test.ts` e
  `platform-admin-routes-coverage.test.ts`;
- alterar `tests/architecture.test.js` para provar ownership, dependências,
  ausência de ciclo, caps e exports públicos congelados;
- atualizar task/evidência/documentação necessária.

Qualquer mudança fora da allowlist exige nova revisão e admissão. Não tocar em
rotas além dos imports necessários, `package.json`, lockfiles, schema, DB,
worker, web, `request-context.ts` ou arquivos de release.

## Contratos a preservar

- `parsePagination`: limit default 25, limites 1–100, offset default 0 e o
  classificador existente de offset; inválido retorna `null` como hoje.
- `parseTraceLimit`: schema estrito e erro `invalid_pagination` com mensagem
  atual.
- `parseOrchestrationGoalQuery`: limit default 25, máximo 50, status validado
  por `GoalStatusSchema` e mensagem/código atuais.
- `parseAuditEvidenceQuery`: mesmos defaults, filtros, enum de seis tipos,
  mensagem/código para paginação e tipo inválidos.
- `parseOptionalAuditFilter`: preservar classificador de query repetida,
  checagem de tipo, trim, limites e regex atuais.
- Nenhum método/path/status/header/schema/erro público muda. A superfície de
  exports de `server.ts` permanece congelada.

## Testes e negativos

Os parsers necessários serão exportados somente pelo módulo interno para teste
direto; `server.ts` e a superfície pública do pacote não reexportam esses
nomes. O novo teste deve cobrir valores válidos/defaults e coerção; preservar
strictness por parser (`parseTraceLimit` e `parseOrchestrationGoalQuery`
rejeitam chaves desconhecidas, enquanto `parsePagination` e
`parseAuditEvidenceQuery` as ignoram); limites de cada parser; limit/offset inválidos;
parâmetros `limit` e `offset` repetidos; filtros audit repetidos, vazios, não
string, acima de 120 caracteres ou fora da regex; cada um dos seis tipos de
evento aceitos; `type` desconhecido; e status de goal inválido. Asserir objetos
retornados e que `parsePagination` retorne `null` para parâmetros inválidos;
asserir `DomainError.code`/mensagem exatos nos demais parsers. A matriz de rota já existente
deve manter código, mensagem, status e envelope para conversas, audit evidence,
goals, trace limits e filters.

O teste arquitetural deve falhar se qualquer declaração permanecer duplicada
em `server.ts`, se surgir import reverso/ciclo, se o módulo usar ambiente
global, se o import de `@cvg/persistence` deixar de ser type-only, se os caps
forem excedidos ou se um export público de `server.ts` mudar.

## Critérios de tamanho e dependência

- preservar o cap C02 existente: `apps/api/src/server.ts <=4708` linhas;
- `request-context.ts <=450` linhas;
- novo `request-query.ts <=160` linhas;
- soma `server.ts + request-context.ts + request-query.ts <=5050` linhas;
- zero import cycles e zero parser duplicado em `server.ts`.

Estado de referência read-only: `server.ts=4745`,
`request-context.ts=258`, soma atual dos dois `=5003`; o bloco candidato ocupa
120 linhas (server.ts 4183–4302). Essas medidas não substituem a contagem exata
no candidato final. O limite total proposto mantém margem pequena sobre a soma
atual para imports/comentários do novo owner e evita que a decomposição aumente
sem controle o volume de código. Se qualquer limite falhar, registrar C02 como
falha e parar; não rebaixar caps para obter aprovação.

## BUILD incremental proposto

1. Registrar hash desta SPEC aprovada, task/admissão e baseline dos arquivos.
2. Adicionar primeiro testes diretos RED no arquivo novo.
3. Mover o bloco sem alterar lógica ou formatação semântica.
4. Migrar somente os call sites por imports e remover as declarações locais.
5. Rodar testes focais de parser/rota e arquitetura; medir os quatro caps.
6. Rodar `npm test`, coverage, typecheck, lint, format, `docs:check` e
   `git diff --check` com Node `22.23.2`.
7. Congelar os bytes, guardar logs/manifest/hash e solicitar crítica
   independente fresh-context. Qualquer edição posterior invalida a crítica.

## Rollback

Remover o novo módulo/imports/teste direto e restaurar o bloco original em
`server.ts`. Manter intactos os bytes da primeira fatia `request-context` e
todos os dados/evidências anteriores. Não há migration nem rollback de dados.

## Gate de aprovação

Este SPEC é uma proposta concreta, sem `SPEC_APPROVED_CONTROLLED_BUILD` e sem
autorização para escrever código. Para admissão, registrar aprovação humana
separada e hash-bound em `0190_spec_validation.md` e 0337, limitando a execução
ao escopo/allowlist acima. Sem isso, manter `IMP50-40` não aceito e aguardar a
decisão humana.

## Histórico de revisão

- crítica v1 pediu strictness por parser, repetição de limit/offset, filtros
  não string, código/mensagem HTTP em AC03 e dependência persistence type-only;
  tudo foi incorporado antes da revisão v2;
- crítica v2: [parecer independente](../04_audit/evidence/AUD20/AUD20-17-query-spec-critic-v2-20260923.md).
