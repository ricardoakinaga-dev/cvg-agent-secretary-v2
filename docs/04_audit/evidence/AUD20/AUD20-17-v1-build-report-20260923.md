# AUD20-17 / IMP50-40 — relatório do BUILD local v1

- atualizado em: `2026-09-23T12:33:38Z`;
- escopo: somente a primeira fatia request-context aprovada, segundo
  [registro humano](AUD20-17-human-approval-20260923.md) e SPEC SHA-256
  `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37`;
- status: BUILD local controlado executado; `AUD20-17` permanece
  `IN_PROGRESS`; `IMP50-40` não aceito porque C02 não atende ao limite.

## Mudança

`apps/api/src/server/request-context.ts` agora é dono dos dez helpers nomeados
no adendo. `createRequestContext` recebe `nodeEnv` e `controlledTenantId` da
composition root, sem leitura de `process.env` ou import reverso. `server.ts`
consome a factory e mantém o export público de `InboundTenantResolver`.
`apps/api/src/__tests__/request-context.test.ts` cobre os contratos diretos e
`tests/architecture.test.js` verifica o owner, dependências permitidas,
ausência de duplicatas e o cap de linhas. Nenhuma rota, schema, persistência,
orquestração, web ou adapter foi incluído na mudança desta fatia.

## Medição e critérios

| Medida | Resultado | Decisão |
| --- | ---: | --- |
| `server.ts` antes | 4.958 linhas | baseline registrado antes do BUILD |
| `server.ts` depois | 4.745 linhas | redução de 213; C02 falha por 37 linhas contra `<=4708` |
| `request-context.ts` | 258 linhas | dentro do cap `<=450` |
| C01 — ownership/direção | `PASS`: owner único, dependências/injeção e ausência de ciclo verificadas | não equivale ao aceite da fatia |
| C02 — redução/caps | `FAIL` | manter o critério; requer nova decisão SPEC antes de mudança de escopo |
| C03 — tenant/identidade | `PASS` na matriz focal e testes diretos | não equivale ao aceite da fatia |
| C04 — HTTP/exports | `PASS` na matriz focal/global e verificação do reexport | não equivale ao aceite da fatia |
| C05 — negativos/arquitetura | `PASS` nas assertions precedentes ao cap e nos testes negativos | cap C02 detecta a violação como esperado |
| C06 — regressão/cobertura | `FAIL` como gate de aceite | regressão e coverage terminam com a falha C02; não há resultado coverage aprovado |
| C07 — crítica independente | `FAIL` | crítica final não aprova IMP50-40 enquanto C02 falhar |

O resultado C02 foi medido sem alargar a allowlist ou rebaixar o cap. A soma
dos dois módulos é 5.003 linhas; esta extração reduziu `server.ts`, mas o novo
módulo e o wiring não atingiram a redução mínima preregistrada.

## RED/GREEN e verificações

- RED inicial: os testes arquiteturais falharam porque o novo owner ainda não
  existia; o teste direto não resolvia a importação do módulo. Esse resultado
  confirmou a falta da fronteira antes da integração.
- Matriz focal Node `22.23.2`: 12 arquivos passaram; 103 testes passaram e 9
  foram ignorados. Incluiu os oito testes diretos request-context e a matriz
  nomeada de identidade, tenant, inbound, scope e compatibilidade HTTP.
- `npm test` final (após fortalecer a assertion arquitetural): 300 arquivos;
  287 passaram, 12 foram ignorados e um falhou.
  Foram 2.243 testes aprovados, 192 ignorados e uma falha exclusivamente no
  assertion arquitetural C02 (`4745 <= 4708`).
- `npm run test:coverage` foi executado com o mesmo código de produção, antes
  da última ampliação das assertions arquiteturais; repetiu a falha C02 e não
  produziu resultado de coverage aprovado.
- A execução focada final, posterior à suíte global, passou em 13 testes e
  falhou em um somente na assertion de C02. Depois da primeira suíte global,
  as assertions arquiteturais foram fortalecidas para impor também
  `request-context.ts <=450`, checar bindings `function` e `const/let/var`, e
  deixar o cap C02 por último. Todas as assertions anteriores ao cap passaram,
  incluindo ownership, imports, env, reexport, ausência de duplicata e cap do
  módulo.
- `npm run typecheck`, `npm run lint`, `npm run format:check` e
  `git diff --check`: `PASS` em Node `22.23.2`.
- `npm run docs:check`: `PASS` após atualizar os ponteiros desta rodada;
  validou 1.003 links, 613 JSONs, estado semântico e Node `22.23.2`.
- crítica independente final: [parecer v1](AUD20-17-independent-critic-v1-20260923.md);
  C07 falha porque o C02 excede o limite aprovado.

## Disposição

O resultado é parcial, não um aceite de IMP50-40. O código local fica dentro
da allowlist aprovada e sem commit, push, deploy, staging, produção, dados
reais ou efeitos externos. A próxima decisão deve revisar a SPEC para escolher
uma resposta explícita ao C02; até então, manter o cap e a allowlist congelados.

O worktree já estava amplamente alterado antes deste BUILD. Em particular,
`assertProductionReplayConfiguration` e suas chamadas em `server.ts` são
preexistentes e não foram introduzidas por IMP50-40; foram preservadas sem
atribuição a esta fatia. Os bytes da extração permanecem no escopo aprovado.
