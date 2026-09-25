# NQP-01 — crítica fresh-context da Discovery — 2026-09-24

## Resultado

- Veredito: `BLOCKED` para `DISCOVERY_READY`.
- Artefato revisado: [Discovery 0024](../../../00_discovery/0024_aud20_12_nqp01_functions_coverage.md)
  no SHA-256 `cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`.
- Escopo da decisão: somente prontidão para entrar em PRD; não decide BUILD,
  aceitação AUD20-17, Q2, release ou produção.
- Revisor: crítica fresh-context independente, read-only. Nenhum arquivo foi
  modificado e nenhum teste, PostgreSQL, coverage ou mutation foi executado
  durante a revisão.

## Finding bloqueante

**A medição observada não estabelece se NQP-01 continua sendo necessário no
denominador contratado.** O número 89,27% (2.107/2.360) veio de um run com
`TEST_DATABASE_URL=''` e 192 casos condicionais skipped. O mapa de coverage
crítico exige medição com PostgreSQL descartável disponível; a execução
PostgreSQL/zero required skip de NQP-02/AUD20-11 continua pendente. Executar os
casos existentes pode elevar coverage sem adicionar testes novos, mudando o
problema e o valor do NQP-01. A ausência de baseline válida é decisiva, não uma
condição não bloqueante para `DISCOVERY_READY`.

Evidência consultada:

- [Discovery 0024](../../../00_discovery/0024_aud20_12_nqp01_functions_coverage.md),
  especialmente o fluxo atual e a hipótese.
- [Contrato AAA §9.1](../../../02_spec/aaa_quality_contract.md#91-metas-numricas-congeladas-v2).
- [Mapa de coverage crítico](../../../03_build/tracking/aud19-critical-coverage.json),
  que especifica PostgreSQL descartável e zero required skips.
- [Relatório do unit run NQP-02](nqp02-unit-no-db-round1-20260924.md) e
  [inventário estático v2](nqp02-static-skip-inventory-v2-20260924.md):
  PostgreSQL ainda não foi executado.

## Finding de proveniência

O BUILD report AUD20-17 v2 cita o manifesto candidato como
`11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`. A
inspeção fresh-context encontrou o arquivo manifesto atual no SHA-256
`6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`. O resumo
de cobertura conferiu no SHA-256
`94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b`, igual ao
arquivo de evidência referenciado no manifesto corrente. Falta reconciliar qual
manifesto vincula o run, o resumo e as fontes ao mesmo candidato. A divergência
não muda o conteúdo observado do JSON, mas impede usar o digest reportado como
identidade atual do manifesto.

## Escopo e limites

A Discovery separa corretamente NQP-01 das demais falhas C06/C07 e explicita
que não há ganho medido. Ainda assim, o problema a levar ao PRD pode desaparecer
quando o conjunto PostgreSQL existente for executado sob o denominador
contratado. Sem essa medição e a reconciliação candidate-bound, não há base para
transição.

O resultado não autoriza PRD. Para reavaliar o gate, primeiro são necessários:

1. gate PostgreSQL NQP-02/AUD20-11 com ambiente descartável, zero required
   skips, teardown e medição do mesmo candidato/denominador;
2. reconciliação dos digests do manifesto e do pacote de cobertura contra os
   arquivos e fontes exatos;
3. reavaliação de NQP-01 usando o resultado: se a cobertura alcançar o piso
   pelos testes existentes, não se presume necessidade de novos testes; se
   continuar abaixo, o Discovery deve identificar os comportamentos ainda
   descobertos e seu escopo antes de pedir novo gate.

O finding não encerra a análise C06: request-context branches 92%/95%, mutation
selecionada e demais critérios permanecem separados. C06/C07 continuam
`FAIL`; AUD20-17 `IN_PROGRESS`; AUD20-10 segue enfileirada; staging e produção
`NO_GO`.
