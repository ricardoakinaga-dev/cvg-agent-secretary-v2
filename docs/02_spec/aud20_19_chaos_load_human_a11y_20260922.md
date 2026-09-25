# SPEC AUD20-19 — perfis de chaos/load e dossiê humano

## Estado

- task: `AUD20-19`
- fase: `BUILD -> AUDIT`
- status: `WAITING_HUMAN_APPROVAL`
- execução proposta: `CONTROLLED_LOCAL_SYNTHETIC`
- staging/produção: `NO_GO`

## Desenho técnico

Adicionar manifesto versionado com perfis `memory_smoke`, `postgres_durable` e
`human_a11y`. Um runner gera fingerprint do ambiente, executa somente comandos
allowlisted, captura inventário de testes/skips e falha fechado para profile,
candidato ou pré-requisito divergente.

O workload `postgres_durable` sobe composição local descartável existente,
semeia somente fixtures sintéticas, aquece separadamente, executa carga bounded
e coleta throughput, p50/p95/p99, erro, retry, lag e recuperação. Nenhum número
é SLO ou previsão de produção.

Criar roteiro e schema de evidence para sessão humana. O verifier exige campos
de participante/consentimento, tecnologia assistiva, passos, observações,
issues e timestamps, mas jamais preenche esses dados automaticamente. Sem
sessão, F28 permanece `WAITING_HUMAN_APPROVAL`.

## Negativos, segurança e rollback

- required/unknown/oculto skip; PostgreSQL indisponível; perfil trocado;
- candidate/fingerprint ausente; duração/concurrency não bounded;
- relatório memory alegando durable/production; métricas incompletas;
- evidence humana sem consentimento, participante, passos ou timestamps;
- regressão de tenant/replay/lease/approval sob falha.

Rollback remove runner/manifest/schema novos; não toca banco persistente,
produto ou evidência histórica. Fixtures têm cleanup obrigatório.

## Critérios C01–C07

- C01: perfis e prerequisitos explícitos;
- C02: skips fail-closed e vinculados;
- C03: workload PostgreSQL sintético mensurado;
- C04: invariantes de segurança sob carga/falha;
- C05: dossiê humano verificável sem resultado fabricado;
- C06: gates/regressão e cleanup passam;
- C07: crítica independente distingue `PASS_LOCAL` de gate humano pendente.

## Gate

`TECHNICALLY_SPECIFIED`: tooling local, negativos e rollback definidos. BUILD
local exige confirmação humana; a sessão de acessibilidade permanece uma
autoridade separada e não está autorizada por este gate.

O usuário confirmou a opção A em `2026-09-22`, autorizando somente o BUILD
local de tooling. Sessão humana, commit, push, deploy, staging e produção
permanecem não autorizados.

O tooling local foi auditado como `PASS_LOCAL` em relatório candidate-bound.
Isso fecha C01–C07 apenas para o escopo automatizado; o perfil `human_a11y`
permanece `PENDING` e nunca produz `PASS` automático.
