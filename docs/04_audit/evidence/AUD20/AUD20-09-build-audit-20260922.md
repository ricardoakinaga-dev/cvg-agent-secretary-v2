# AUD20-09 — BUILD/AUDIT local integrado

- status: `COMPLETED`
- execução: `CONTROLLED_LOCAL_SYNTHETIC`
- candidato auditado: `226f5909ac649012e51585665f76b5239c10ac12a172030a2062efe9aabdef27`
- staging/produção: `NO_GO`

O holdout separado contém 19 cenários sintéticos e 18 categorias, com seed,
versão e SHA-256 congelados. O adapter atravessa
`@cvg/agent-core/evaluateInboundTurn`; a semântica fica no núcleo do produto e
não importa nem chama o classificador do baseline determinístico.

O relatório passou com task success global e por categoria de 100%,
policy/unsafe/schema failure em zero, adversarial pass de 100%, nenhum efeito
observado e `releaseEligible=false`.

- evals: 3 arquivos / 30 testes PASS;
- regressão Node 22: 286 arquivos / 2.230 testes PASS / 192 skips;
- cobertura: 90,78% statements, 86,89% branches, 89,24% functions e 91,38% lines;
- mutation focused: 7/7; catálogo completo: 16/16, sem gaps;
- docs-check Node 22: 801 links e 596 JSONs, PASS;
- crítica independente final: C01–C07 PASS, nenhum P0/P1.

A primeira regressão herdou Node 24 e falhou somente no guard de versão; a
repetição no runtime qualificado 22.23.2 passou. Residual P2: a ausência de
leakage continua sendo attestation interna, não prova externa.

Nenhum dado real, efeito externo, commit, push, deploy, staging ou produção foi
executado.
