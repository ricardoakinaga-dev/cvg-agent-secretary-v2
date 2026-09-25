# IMP50-41 — revisão independente do mapeamento — 2026-09-23T07:37:38Z

## Parecer

**Aceitar IMP50-41 em escopo limitado**, por reutilização do aceite existente de
AUD20-08 AC05/C05/C06. Não é necessário alterar código, ponteiros de
certificação ou registros de evidência. O pai `AUD20-08` permanece
`COMPLETED`; este parecer não reabre a task nem autoriza outro BUILD.

## Evidência examinada

- O PRD AC05 e a SPEC seção 4 preservam `certification/findings.json` como
  evidência histórica Phase 10 e impedem que ela qualifique o estado corrente.
- `current_state.json` aponta Phase 11 e classifica `certification/findings.json`
  como histórico. `certification/current.json` aponta Phase 11 e declara
  `historicalPhase10.doesNotQualifyCurrent=true`.
- O checker rejeita findings históricos selecionados como namespace corrente;
  o teste focal passou esperando `historical_findings_selected_as_current`.
- C05/C06 da matriz aprovada e o build report de AUD20-08 cobrem a proteção e
  o negativo. A execução focal atual reforça a evidência do comportamento; os
  oito hashes registrados antes/depois confirmam que seus bytes não foram
  alterados pelo teste.
- SHA-256 `5be5b7ea915da5e39748843b4bbe2c77e751e888818f037f9c5a9b00b48fbcf8`
  de `certification/findings.json` confere com a entrada do manifesto
  `certification/logs/historical/2026-09-11-phase10/manifest.json` (2.384
  bytes) e com os manifests raiz de certificação examinados.

## Limite de frescor

O build report e a crítica v3 revisaram o candidato histórico
`3e419a17701f82d3cbcd19804ac9139df1db3e017cfc209411d00ac7aa57ed79`. Esse
digest não é candidato de produto corrente. A aceitação aqui se limita ao
critério documental e ao negativo focal reexecutado; não qualifica o workspace
ou qualquer release. Nenhum candidato de produto está congelado, e staging e
produção continuam `NO_GO`.

## Independência e escopo

Revisão read-only independente da reconciliação FU4. Não houve edição de código,
teste, índice ou artefato de certificação durante a revisão. A política ampla
de linhagem/inventário de evidências de IMP50-49 continua separada e pendente de
revisão humana.
