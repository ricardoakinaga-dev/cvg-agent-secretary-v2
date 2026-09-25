# AUD20-17 / IMP50-40 — reconciliação read-only de manifesto e baseline — 2026-09-24

> **Nota interpretativa posterior:** este relatório registrava que 0190/0337
> classificavam 92% como abaixo do piso. Essa descrição correspondia aos textos
> correntes antes da errata de aplicabilidade; os resumos ativos foram corrigidos
> para tratar 92% como reportado e manter a aplicabilidade de 95% sem
> adjudicação. A formulação abaixo é um snapshot histórico, não a descrição do
> estado documental atual. Ver a
> [errata](AUD20-17-request-context-branch-floor-erratum-20260924.md). O parecer
> de precisão v1 revisou a versão anterior deste relatório, SHA-256
> `a7869131debf4f4c618672a1fbf27de38377ea002af3ba1b5d7ab3d3b3eb67c`; este
> acréscimo editorial ainda aguarda crítica independente.

## Resultado

**Disposição:** `PARTIAL_SOURCE_AND_RECEIPT_RECONCILIATION`; o binding integral
do candidato integrado não foi provado e a comparação C06 “sem redução” fica
`NOT_RUN` por falta de baseline candidate-bound. Métricas continuam
`REPORT_ONLY`; C06/C07 permanecem `FAIL`.

Esta revisão comparou somente hashes e documentos locais. Não alterou
manifestos, relatórios, fontes, cobertura ou resultados históricos; não rodou
testes, BUILD, PostgreSQL ou mutation.

## Identidade dos artefatos

| Artefato                                                                                              | SHA-256                                                            | Observação                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BUILD report request-context v2](AUD20-17-request-context-v2-build-report-20260924.md)               | `0ebebf1c12032597a7733d935c7a08bc19aba4687c420223496499a58ae742a9` | Declara que o manifesto usado tem digest `11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`.                                                            |
| [Manifesto disponível](AUD20-17-request-context-v2-build-candidate-manifest-20260924.json)            | `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba` | Digest diferente do citado no BUILD report. Não foi localizada cópia preservada dos bytes `11f061…` nas localizações de evidência e workspaces temporários consultadas. |
| [Resumo de coverage integrado](AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json) | `94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b` | Confere com o digest registrado no manifesto disponível e com o valor citado pelo crítico v4.                                                                           |
| [Log da suíte integrada](AUD20-17-request-context-v2-integrated-full-test-round1-20260924.log)        | `6ef5d73e663fceb88a95b2f3ce9acad7c427cc1a569b410be56aac6fb0b66e98` | Reporta 301 arquivos, 2.256 PASS, 192 skips e zero falhas.                                                                                                              |
| [Log de coverage integrado](AUD20-17-request-context-v2-integrated-coverage-round1-20260924.log)      | `6ab8cc63ff5162a7cfb29c08f81ba4ba113ecc96873b0d10ef4efd61897f666f` | O resumo associado reporta functions 89,27% (2.107/2.360), abaixo do piso global 90%.                                                                                   |

## Cruzamentos de hashes

O manifesto disponível foi interpretado por escopo, sem misturar o candidato
request-context-only reconstruído com o candidato integrado:

- `candidate.currentIntegratedFiles`: **8/8** hashes conferem com os arquivos
  atuais da workspace. O manifesto declara que esses mesmos hashes foram
  verificados antes das duas execuções integradas.
- `candidate.v1CandidateCoreFiles`: **6/6** hashes conferem no workspace
  isolado `/tmp/aud20-17-context-v1-run-20260924`, correspondente ao recorte
  request-context-only reconstruído.
- `candidate.allExecutedTestSourceFiles`: **300/300** hashes conferem nesse
  workspace isolado. Essa lista e o recibo pareado cobrem o run v1 de 300
  arquivos, não a suíte integrada posterior de 301 arquivos; não há uma lista
  separada de hashes que enumere todas as fontes de teste daquele run integrado.
- `evidenceFiles`: **34/34** digests conferem com os recibos e artefatos locais
  apontados pelo manifesto, inclusive resumo e logs de coverage/teste.

Esses cruzamentos mostram consistência entre o manifesto disponível e os
artefatos enumerados em seus respectivos escopos. Eles não demonstram que o
arquivo cujo digest o BUILD report registra como `11f061…` seja idêntico ao
manifesto atual (`6b86…`), nem completam o mapa de fontes do run integrado de
301 arquivos. O workspace também está marcado como candidato de working tree;
`gitHead` isolado não resume todos os bytes alterados da árvore.

**Conclusão de binding:** as fontes-chave e recibos enumerados no manifesto
disponível têm suporte parcial de hash, mas falta identidade reproduzível do
manifesto efetivamente citado pelo BUILD report e inventário hash-bound das 301
fontes de teste da suíte integrada. Assim, as métricas globais e de
request-context permanecem reportadas, sem atribuição candidate-bound para
qualificação C06.

## Baseline “sem redução”

O manifesto disponível não contém campo nem artefato identificado como
baseline de coverage pré-mudança. Nos registros C06 consultados também não foi
identificado conjunto completo com candidato prévio exato, hashes das fontes,
denominador congelado e run. A medição integrada atual não pode ser reutilizada
como sua própria baseline.

**Conclusão:** comparação “sem redução” `NOT_RUN`; nenhuma variação foi
calculada nem aprovada. Só pode ser reavaliada depois de identificar uma
baseline válida e candidate-bound ou de registrar que ela não existe para esta
comparação.

## Efeito nos gates

- C06 e C07 continuam `FAIL`; request-context não está aceita.
- O piso de branches 95% para request-context continua sem adjudicação: o
  registry congelado não lista o módulo. No momento desta reconciliação, versões
  anteriores de 0190/0337 descreviam 92% como abaixo do piso; os resumos atuais
  foram corrigidos pela errata acima. Nenhum threshold, escopo ou registry foi
  alterado.
- PostgreSQL/NQP-02/AUD20-11 continua bloqueado pelos gates próprios. Mutation
  não foi executada e exige admissão separada.
- A Discovery 0024 permanece a existente e bloqueada para `DISCOVERY_READY`; o
  hash atual e o mismatch com sua crítica permanecem registrados na [rota C06](AUD20-17-C06-gate-route-proposal-20260924.md).
- IMP50-49 permanece inalterado: os 141 vínculos sem suporte suficiente ficam
  sem adjudicação, v1 segue baseline e v2 suplemento.

## Fontes consultadas

- [Rota C06](AUD20-17-C06-gate-route-proposal-20260924.md), SHA-256
  `4d20e67ab6f4e93bda7405f85a8e7c4c5e953930228453bb1939a283041652f2`.
- [Validação de SPEC 0190](../../../02_spec/0190_spec_validation.md), nota de
  aplicabilidade e C06.
- [Crítica independente request-context v2](AUD20-17-request-context-v2-independent-critic-20260924.md).
- [Crítica fresh-context da rota v4](AUD20-17-C06-gate-route-critic-v4-20260924.md).
