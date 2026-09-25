# AUD20-17 / IMP50-40 — proposta de rota para C06

**Status:** o parecer independente v4 deu `PASS` somente para prontidão
documental dos bytes no SHA-256
`4d20e67ab6f4e93bda7405f85a8e7c4c5e953930228453bb1939a283041652f2`; esse
resultado não aprova Discovery, produto, C06/C07, BUILD ou execução. Esta
atualização corrige referências desatualizadas encontradas depois daquele
parecer e ainda precisa de crítica fresh-context própria. Continua sendo uma
proposta, não SPEC, admissão, BUILD ou aceite. Ver [v1](AUD20-17-C06-gate-route-critic-v1-20260924.md),
[v2](AUD20-17-C06-gate-route-critic-v2-20260924.md),
[v3](AUD20-17-C06-gate-route-critic-v3-20260924.md) e
[v4](AUD20-17-C06-gate-route-critic-v4-20260924.md).
**Escopo:** somente definir como reavaliar C06 sem transferir crédito entre
request-context e query-parser, alterar o contrato de qualidade ou tratar
evidência condicional como gate aprovado.

## Estado observado

A crítica independente da request-context v2 manteve C06/C07 em `FAIL`. O
BUILD report e a crítica **relatam** no run integrado statements 90,84%,
branches 87,00%, functions 89,27% (2.107/2.360) e lines 91,43%; a suíte
registrou 2.256 PASS, 192 skips e zero falhas. A coverage de
`request-context.ts` foi reportada como 92% branches (69/75). Como o vínculo do
manifesto está divergente, essas métricas permanecem reportadas, mas ainda não
provam identidade com o candidato executado. PostgreSQL e mutation selecionada
não foram executados; falta baseline candidate-bound para demonstrar “sem
redução”. A disposição registrada para C06/C07 continua `FAIL`;
independentemente da interpretação dos 92% locais, não há evidência suficiente
para promover o gate: functions globais são reportadas abaixo de 90%,
PostgreSQL e mutation não foram executados, e não há baseline válida
demonstrada. A métrica de functions também permanece sem vínculo comprovado ao
candidato até a reconciliação.

## Gaps de proveniência e critério

1. O BUILD report declara que o manifesto do candidato tem SHA-256
   `11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`; o
   arquivo presente tem SHA-256
   `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`.
   Ainda falta provar qual manifesto vincula as fontes, os resultados e o
   candidato executado. Até reconciliação, não tratar o digest do report como
   identidade atual.
2. A emenda SPEC v2 mantém os pisos AAA aplicáveis, inclusive branches de 95%
   para módulos críticos. O registro congelado
   `aud19-critical-coverage.json` não lista `request-context.ts`. Os resumos
   correntes em 0190 e 0337 registram 92% como valor reportado e deixam a
   aplicabilidade de 95% sem adjudicação; capturas anteriores descreviam os
   92% como abaixo do piso e foram qualificadas pela
   [errata](AUD20-17-request-context-branch-floor-erratum-20260924.md). Não
   alterar piso, denominador, escopo ou registro por inferência. Até decisão
   explícita, não usar os 92% para declarar esse critério local como aprovado
   ou reprovado. Isso não muda o `FAIL` registrado para C06: ainda não há
   suporte candidate-bound para aprová-lo; functions estão reportadas em
   89,27%, PostgreSQL e mutation não foram executados e falta baseline
   vinculada.
3. A Discovery 0024/NQP-01 já existe e está bloqueada para
   `DISCOVERY_READY`, porque os 192 casos condicionais
   ainda não foram medidos no gate PostgreSQL e a divergência do manifesto
   permanece. Os bytes atuais da Discovery têm SHA-256
   `db2493fde811e6b135360f38fcb6eaac10400660f2fb492ef04b2eae6ae8250d`; a
   crítica NQP-01 citada nela revisou `cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`.
   A própria Discovery registra normalização Markdown após aquela crítica; o
   parecer não aprova os bytes atuais. Preservar a Discovery existente sem
   duplicá-la. Se NQP-01 avançar, vincular a reavaliação ao hash atual e obter
   crítica independente fresh-context desses bytes antes de `DISCOVERY_READY`
   ou de PRD. O NQP-02 unit-only é `CONDITIONAL`, não prova comportamento
   PostgreSQL nem fecha essa lacuna.
4. O C06 original exige regressão/cobertura “sem redução”. Antes de uma nova
   medição, vincular a baseline ao candidato prévio exato, hashes das fontes,
   denominador e run. Não usar o run sem binding atual como baseline.

## Sequência proposta

1. Reconciliar de forma read-only o manifesto, o report, os hashes de fonte e o
   resumo de coverage. Emitir uma ligação candidata verificável ou preservar a
   evidência como não vinculada; não reescrever o relatório histórico. Até
   então, tratar as métricas apenas como valores relatados pelo report/crítica.
2. Registrar e resolver a aplicabilidade: o registro congelado não classifica
   `request-context.ts` como crítico, e os resumos atuais em 0190/0337 deixam
   a regra sem adjudicação. Textos anteriores que chamavam 92% de abaixo de
   95% permanecem somente em capturas históricas, qualificadas pela errata.
   Não mudar o registry ou presumir a aplicação do piso. C06 permanece `FAIL`
   por outros gaps demonstrados.
3. Resolver a elegibilidade do gate PostgreSQL. `AUD20-11` está `BLOCKED` por
   `AUD20-07/10/19`; `AUD20-10` segue enfileirada após `AUD20-17`, `AUD20-19`
   aguarda decisão humana e `AUD20-07` depende de `AUD20-05/06/18`. O recorte
   unitário NQP-02 não libera essa task. Se for necessário um gate estreito de
   teste, registrá-lo e admiti-lo explicitamente antes de iniciar serviço ou
   banco descartável. Essa admissão não libera mutation.
4. Antes de qualquer nova medição que sustente “sem redução”, vincular a
   baseline ao candidato pré-mudança exato, hashes de fontes, denominador
   congelado e run. Se a baseline existente não puder ser vinculada, registrar
   `NOT_RUN` para essa comparação; não usar o run atual não vinculado.
5. Somente após as admissões documentadas aplicáveis, executar o seletor
   PostgreSQL com banco sintético descartável, `TEST_DATABASE_URL` presente e
   verificado, reporter por arquivo, zero required skips e recibo de teardown.
   Medir coverage no denominador declarado, sem misturar runs/candidatos.
   Executar mutation selecionada somente após admissão separada, hash-bound,
   e exigir 100% de detecção; autorização PostgreSQL não implica autorização
   de mutation. Registrar floors e tratamento de cada teste executado/ignorado.
6. Após a reconciliação do manifesto e as medições elegíveis, reavaliar a
   Discovery 0024/NQP-01 existente, identificada hoje pelo SHA-256
   `db2493fde811e6b135360f38fcb6eaac10400660f2fb492ef04b2eae6ae8250d`. A
   crítica existente (`25513893261b71f73d1b290bbe5ef3a4741355836509c79b59159c56508978e0`)
   cobre bytes anteriores (`cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`),
   não os atuais; não reutilizar seu veredito como aprovação da versão atual.
   Se o gap persistir, obter crítica independente fresh-context da Discovery
   atual e seguir seus gates Discovery/PRD/SPEC antes de acrescentar testes;
   criar Discovery nova somente para um problema de escopo distinto. Não
   excluir código nem reduzir o denominador para produzir PASS.
7. Solicitar crítica independente fresh-context dos bytes e evidências finais.
   C07 só pode passar se C06 e os demais critérios aplicáveis passarem no
   candidato vinculado.

## Limites

Esta proposta não desbloqueia `AUD20-11`, não autoriza BUILD, PostgreSQL,
mutation, novo teste, alteração de código, staging ou produção. A aprovação de
um gate PostgreSQL não autoriza mutation, que requer admissão separada. C06/C07 e
`AUD20-17` permanecem abertos; a próxima decisão de execução depende dos gates
oficiais e de admissões hash-bound próprias.

### Evidências consultadas

- [Crítica request-context v2](AUD20-17-request-context-v2-independent-critic-20260924.md)
- [BUILD report request-context v2](AUD20-17-request-context-v2-build-report-20260924.md)
- [Contrato AAA §9.1](../../../02_spec/aaa_quality_contract.md)
- [Registro de módulos críticos](../../../03_build/tracking/aud19-critical-coverage.json)
- [Crítica Discovery NQP-01](../PLAN50-20260923/nqp01-discovery-critic-20260924.md)
- [Inventário e limite do unit run NQP-02](../PLAN50-20260923/nqp02-unit-no-db-critic-v1-20260924.md)
- [Gate oficial AUD20-11](../../../03_build/0337_aud20260921_backlog.md)
- [Crítica independente da proposta v1](AUD20-17-C06-gate-route-critic-v1-20260924.md)
- [Crítica independente da rota v3](AUD20-17-C06-gate-route-critic-v3-20260924.md)
- [Crítica NQP-01 da Discovery 0024](../PLAN50-20260923/nqp01-discovery-critic-20260924.md)
- [Aprovação humana request-context v2](AUD20-17-request-context-spec-amendment-human-approval-v2-20260924.md)
- [Discovery existente NQP-01](../../../00_discovery/0024_aud20_12_nqp01_functions_coverage.md)
