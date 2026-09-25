# AUD20-17 / IMP50-40 — crítica independente da reconciliação C06 v1 — 2026-09-24

## Identificação e veredito

- Artefato revisado: [reconciliação read-only](AUD20-17-manifest-baseline-reconciliation-20260924.md).
- SHA-256 revisado: `a7869131debf4f4c618672a1fbf27de38377ea002af3ba1b5d7ab3d3b3eb67c4`.
- Veredito: **PASS para precisão do relatório de reconciliação somente**.
- Revisão fresh-context somente leitura. Não aprova C06/C07, produto,
  Discovery, BUILD, PostgreSQL, mutation, staging ou produção.

## Conferência independente

Os escopos e cruzamentos do relatório estão corretamente separados:

- `currentIntegratedFiles`: 8/8 conferem na workspace atual.
- `v1CandidateCoreFiles`: 6/6 conferem no workspace isolado v1.
- `allExecutedTestSourceFiles`: 300/300 conferem no workspace isolado v1;
  não são apresentados como inventário do run integrado de 301 arquivos.
- `evidenceFiles`: 34/34 digests conferem com artefatos locais.
- O BUILD report cita manifesto `11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`;
  o manifesto disponível tem SHA-256
  `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`.
- O resumo coverage SHA-256
  `94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b` confere
  com o manifesto e a rota v4. Os logs suportam 301 arquivos, 2.256 PASS,
  192 skips e os valores reportados de coverage.
- Não há baseline pré-mudança candidate-bound; manter `NOT_RUN` para “sem
  redução” é correto e não calcula delta sem suporte.

## Disposição e limites

C06/C07 seguem `FAIL`; a aplicabilidade do piso crítico de branches continua
sem adjudicação. Discovery 0024 permanece vinculada ao hash atual
`db2493fde811e6b135360f38fcb6eaac10400660f2fb492ef04b2eae6ae8250d`, separado
da crítica NQP-01 que cobriu os bytes antigos `cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`. Os 141 vínculos IMP50-49 seguem sem
adjudicação, v1 é baseline e v2 suplemento. Nenhuma execução foi autorizada.
