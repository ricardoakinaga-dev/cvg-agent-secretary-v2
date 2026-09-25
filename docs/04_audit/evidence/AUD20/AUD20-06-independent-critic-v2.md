# AUD20-06 — crítica independente v2

- modo: read-only
- veredito: `FAIL`
- candidato revisado: `e4820c5c8ee54d56d0abcc3ca73801b86912a425d6e48671ebd905aa97203957`
- fingerprint antes/depois: `6a44cf56ea92f7f511c9b0fd3b83b363c186937e050f4992c9f80d1cd27e69ea`
- arquivos alterados pelo crítico: nenhum

## Resultado

Os quatro bloqueios da v1 foram corrigidos. A revisão v2 encontrou um novo P1:
`verifyMutationReport` ainda aceitava `exitCode: 1` autodeclarado sem relatório
de testes nem vínculo do raw report ao log do subprocesso. Também registrou que
o pacote Phase 11 histórico continua stale e que `candidate_clean` não pode
qualificar um worktree sem commit.

## Correção aplicada

O CLI agora emite o SHA-256 dos bytes exatos do raw report. Certifier e verifier
exigem igualdade desse digest no log manifestado, exit zero do gate e evidência
estruturada dos testes (`total/passed/failed/pending`) ou timeout. Exit code
autodeclarado, sozinho, não comprova detecção. O probe forjado virou negativo e
o sentinel integral voltou a passar `9/9`.

Este documento preserva o `FAIL`; somente uma revisão posterior pode aprovar o
candidato corrigido.
