# AUD20-17 / IMP50-40 — errata de aplicabilidade do piso de branches — 2026-09-24T08:24Z

## Disposição

O valor de **92% de branches** em `request-context.ts` permanece um resultado
reportado. A documentação anterior o descreveu como abaixo do piso crítico de
95%, mas essa comparação não está adjudicada: o registry congelado
`docs/03_build/tracking/aud19-critical-coverage.json` define os módulos aos
quais o piso se aplica e não enumera `apps/api/src/server/request-context.ts`.
Não inferir aplicabilidade, alterar registry/threshold/denominador ou contar
92% como falha autônoma até decisão humana.

O valor integrado de 92% também é somente `REPORT_ONLY`: o BUILD report cita o
manifesto SHA-256 `11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`,
mas o manifesto disponível tem SHA-256
`6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`. A lista
de 300 fontes de teste confere no workspace isolado da reconstrução v1; o run
integrado tem 301 arquivos e não possui inventário hash-bound completo de suas
fontes. Não atribuir ao integrado a lista da reconstrução v1.

## Efeito sobre C06/C07

Request-context **continua sem aceite**. C06 permanece `FAIL`/não satisfeito
porque não há prova íntegra candidate-bound dos gates obrigatórios; a baseline
“sem redução” está `NOT_RUN`, o gate PostgreSQL com zero required skips e a
detecção de mutation selecionada estão `NOT_RUN`, e 192 skips não contam como
aprovados. Functions globais em 89,27% é o valor numérico reportado contra o
piso global de 90%, mas continua `REPORT_ONLY` enquanto o binding permanecer
incompleto. O estado de C06 não depende de afirmar que o piso de 95% se aplica
ao módulo. C07 permanece `FAIL` porque a revisão independente não aceita a
candidata enquanto C06 não passar.

## Correções documentais aplicadas

Esta errata corrige os resumos correntes em 0190, 0300–0302, 0337, 0342,
0343 e `docs/CURRENT.md`, qualifica a entrada 04:42Z do
`docs/20_master_execution_log.md`, identifica como históricos checkpoints
anteriores e acrescenta a atualização atual ao registro NQP-03. Após os
achados intermediários I3, checkpoints antigos do `docs/30_backlog_master.md`
foram rotulados como históricos; a preregistração de 09-23 em 0337 e a seção
Q1 04:42Z em 0342 também foram identificadas como históricas, com referência à
rota C06 v4 corrente. A crítica I4 encontrou snapshots ainda sem marcador
histórico em runtime state 04:01Z, execution log 00:24Z e decisões 20:44Z em
0337; foram explicitamente marcados e o snapshot 04:01Z agora remete a esta
errata. O parecer I4 deu `REJECT` em DOC-03, sem falha nos outros quatro
critérios documentais. Os relatórios originais BUILD e crítica permanecem
preservados; esta errata os qualifica sem reescrever recibos históricos. Ver
[I2](AUD20-17-nqp03-disposition-critic-v2-20260924.md), [achados I3](AUD20-17-nqp03-disposition-critic-v3-interim-20260924.md)
e [parecer I4](AUD20-17-nqp03-disposition-critic-v4-20260924.md).

A crítica fresh-context I5 rejeitou DOC-02 porque a proposta de rota C06 e a
reconciliação read-only ainda apresentavam como atuais interpretações antigas
de 0190/0337 e não distinguiam os hashes examinados pelos pareceres anteriores.
As referências agora qualificam o PASS da rota v4 ao hash anterior
`4d20e67ab6f4e93bda7405f85a8e7c4c5e953930228453bb1939a283041652f2` e o PASS da
reconciliação ao hash anterior
`a7869131debf4f4c618672a1fbf27de38377ea002af3ba1b5d7ab3d3b3eb67c4`. Os novos
bytes editoriais da rota e da reconciliação foram revisados pela I6, que deu
`PASS` em DOC-01–DOC-05 para a disposição documental. Isso não muda gates nem a
próxima decisão humana. Ver [I5](AUD20-17-nqp03-disposition-critic-v5-20260924.md)
e [I6](AUD20-17-nqp03-disposition-critic-v6-20260924.md).

## Evidência e próximo gate

- Registry: `docs/03_build/tracking/aud19-critical-coverage.json`, SHA-256
  `c16dbffdf9ecc7d058e6d073e81d7215be4b634f1af2ad5061f4fd447138b24b`.
- Contrato AAA v2 §9.1: `docs/02_spec/aaa_quality_contract.md`, SHA-256
  `aec324018513c43a3e949663e41769f2d59180c6812d7430bd5980fb4a357097`.
- BUILD report preservado: SHA-256
  `0ebebf1c12032597a7733d935c7a08bc19aba4687c420223496499a58ae742a9`.
- Crítica original preservada: SHA-256
  `293a02f1411c35ff811d67dd2b4bac25bd14581b26887ea285de259514fe165d`.
- Reconciliação independente: [relatório](AUD20-17-manifest-baseline-reconciliation-20260924.md),
  SHA-256 `a7869131debf4f4c618672a1fbf27de38377ea002af3ba1b5d7ab3d3b3eb67c4`.
- Revisão fresh-context desta rodada: [parecer](AUD20-17-nqp03-disposition-critic-v1-20260924.md).

A próxima decisão humana é estritamente sobre a aplicabilidade do piso de 95%
a `request-context.ts`. Essa resposta não aceita C06/C07 nem libera
`AUD20-10`, PostgreSQL, mutation ou qualquer execução adicional. Q2 continua
enfileirada; staging e produção permanecem `NO_GO`.
