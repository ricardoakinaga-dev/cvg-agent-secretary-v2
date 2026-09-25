# AUD20-17 / IMP50-40 — crítica NQP-03 da disposição C01–C07 — 2026-09-24T07:36Z

## Resultado

**`REJECT` da documentação corrente antes das correções.** O crítico fresh
context I1 confirmou C01–C05 e rejeitou aceite por C06/C07. Encontrou dois
problemas documentais: resumos tratavam os 92% como violação confirmada do piso
de 95% apesar da omissão do módulo no registry; e a seção NQP-03 de 0190 ainda
dizia que a aprovação e o BUILD v2 aguardavam decisão humana.

A crítica foi somente leitura, em fork não herdado (`fork_turns=none`); não
alterou arquivos, não executou testes ou BUILD e não criou descendentes. O
fingerprint `repository+state` pré/pós foi verificado pelo coordenador e
permaneceu igual: `6fb8c4528744f93c3616ebbc9720c52006548ad0250f8222e0df135a57d09052`.

## Disposição por critério

| Critério | Estado | Base |
| --- | --- | --- |
| C01 | `PASS` | Owner único e boundary acíclico com injeção explícita. |
| C02 | `PASS` | Reconstrução v1 `server.ts=4.707/4.708`; integrado `4.584 + 328 + 138 = 5.050/5.050`; o parser não satisfaz o cap da reconstrução. |
| C03 | `PASS` | Evidência local de identidade, tenant, default deny e inbound; casos PostgreSQL continuam sem execução. |
| C04 | `PASS` | Evidência local de envelopes/mensagens HTTP, JSON malformado, raw body e exports. |
| C05 | `PASS` | Evidência local de negativos e arquitetura. |
| C06 | `FAIL` | Métricas integradas são `REPORT_ONLY`; baseline “sem redução”, gate PostgreSQL e mutation estão `NOT_RUN`; 192 skips não satisfazem gates requeridos. O valor 92% de branches é observado, mas a aplicabilidade do piso 95% não foi decidida. |
| C07 | `FAIL` | O crítico independente não aceita uma candidata sem C06 aprovado. |

Os 300 hashes de testes no manifesto correspondem ao run v1 isolado e
conferem em seu workspace; não substituem uma lista hash-bound das 301 fontes
do run integrado. O BUILD report cita o manifesto `11f061…`, enquanto o
arquivo disponível é `6b86…`. Assim, os valores globais `89,27% functions` e
`92% branches` são report-only, e a baseline “sem redução” continua `NOT_RUN`.

## Artefatos examinados

Os principais hashes eram: SPEC aprovada `1cb72b0e…c237c`, recibo de aprovação
`a474bd23…c89ec9`, BUILD report `0ebebf1c…e742a9`, manifesto disponível
`6b86eb90…47fdba`, crítica BUILD `293a02f1…e165d`, reconciliação de binding
`a7869131…b67c4`, registry `c16dbffd…138b24b` e contrato AAA
`aec32401…a357097`. As correções e a nova interpretação estão no [erratum](AUD20-17-request-context-branch-floor-erratum-20260924.md).

O próximo gate é uma decisão humana sobre a aplicabilidade do piso de 95%.
Essa decisão isolada não aprova request-context nem libera Q2; C06 continua
pendente dos gates e da evidência candidate-bound.

