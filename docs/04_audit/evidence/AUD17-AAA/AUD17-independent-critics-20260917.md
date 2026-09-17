# AUD17-AAA — críticos independentes frescos — 2026-09-17

## Chandrasekhar — UX, visual e read model

Escopo lido em modo somente leitura: commit `e873ba3` antes dos dois últimos
commits de correção; o código de UI não mudou depois desse ponto.

- PASS: tenant scope no cliente/API, estados populados, detalhe selecionável,
  console read-only, snapshots 375/768/1440 e ausência de overflow aparente;
- contraprova P2 corrigida: `successCriteria` expunha `eventType`,
  `resourceType`, `field` e `key` sem redaction; `7c5075d` passou a aplicar
  redaction e adicionou teste negativo `4/4`;
- residual baixo/médio: não existe E2E dedicado para Tab/Enter/Space e foco
  automático/scroll do detalhe em viewport estreito; detalhes populados de
  aprovação/handoff/budget/failure/replanning não são validados
  individualmente no fixture visual. Isso não concede PASS de acessibilidade
  integral.

## Copernicus — runtime, segurança e certificação

Escopo auditado: snapshot detached do commit `479081a`, antes do commit
documental e dos dois commits finais de redaction. O parecer encontrou o pacote
histórico apontando para candidato obsoleto e score inconsistente; isso foi
reproduzido como risco stale e resolvido pelo selo final:

`certification:verify:phase11` e `evidence:verify:phase11` agora passam para o
candidato `15c3c3c3…`, commit `5b4ed96…`, tree hash
`910bfbc0…`, com `candidate_clean=PASS` e `INV-015=PASS`.

Pontos ainda limitados pelo ambiente: CAS/RLS/fencing/restore/approval replay
PostgreSQL não foram executados sem `TEST_DATABASE_URL`; a prova de canal real
e de takeover externo permanece indisponível. A sanitização de campos `name`,
`fullName` e `cns` foi endurecida em `3876b72`, com teste `10/10` PASS. O
residual de foco/detalhe da crítica visual e os skips PostgreSQL ficam
registrados como lacunas, não como aprovação implícita.

## Veredito dos críticos

Os críticos não encontraram P0 de efeito real ou bypass que exigisse interromper
a rodada. O veredito acima é o registro da crítica anterior ao fechamento
PostgreSQL e permanece histórico.

## Resposta e re-selo local

- os bloqueios de persistência foram corrigidos no commit `c24c712`, com a
  migration aditiva `0024` validando constraints históricas `NOT VALID` em modo
  fail-closed;
- a suíte `npm run test:postgres` passou com 23 arquivos e 202 testes, e os
  invariantes `INV-007..010` passaram no `PHASE11_FORMAL_CLOSURE`;
- o selo corrente em `certification/current.json` é `CONDITIONAL_GO` para
  `STAGING` controlado e mantém produção `NO_GO` enquanto provider, canal,
  identidade, RAG institucional, RPO/RTO físico, piloto, rollback e sign-off
  humano não tiverem evidência autorizada.

Os resíduos de foco/detalhe visual continuam como melhoria de qualidade; não
foram convertidos em autorização de release.
