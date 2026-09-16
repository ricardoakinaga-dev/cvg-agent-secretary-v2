# Phase 11.1 — contrato de fechamento formal — 2026-09-15

**Pipeline:** `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
**Task:** `PHASE11.1-FORMAL-CLOSURE-20260915`
**Gate:** `SPEC_APPROVED_CONTROLLED_BUILD`
**Release posture:** `CONTROLLED_LOCAL / PRODUCTION_NO_GO`

## Decisão de escopo

Esta SPEC transforma o prompt de fechamento formal recebido em 2026-09-15
([intake exato](../11_phase11/prompt-master/20260915-formal-closure/README.md))
em um incremento verificável sobre o sistema existente. O BUILD autorizado é
local, reversível e usa somente fixtures sintéticas e banco descartável quando
disponível. Não autoriza provider, canal, identidade, RAG institucional,
piloto, deploy, produção, paciente real ou efeito clínico/financeiro/de
prontuário.

O escopo prioriza a verdade operacional da Phase 11: certificação corrente
candidate-bound, separação histórica da Phase 10, evidência reexecutável,
red-team dos invariantes de orquestração durável e inspeção do console. O
núcleo já implementado é preservado; mudanças de produto só entram quando a
reprodução mostrar uma lacuna nos limites públicos ou de persistência.

## Contrato corrente de certificação

1. `certification/phase11/` é o pacote canônico da Phase 11. Artefatos de
   `certification/phase10/` (ou o legado equivalente) são históricos.
2. `certification/current.json` aponta para uma única certificação corrente e
   só pode apontar para uma Phase 11 válida, com `commit`, `treeHash`,
   `candidateId`, `manifestSha256` e `resultSha256` coerentes.
3. O resultado corrente contém candidato completo, perfil elegível, gates,
   invariantes, findings, scores, evals/chaos/load/recovery/PostgreSQL,
   integrações externas, RPO/RTO, piloto, signoff, `successState`, decisão,
   certificação e blockers.
4. `certify`, `verify` e `promotion:check` usam a mesma função de cálculo,
   revalidam bytes e não aceitam `GO` produzido por um campo declarado pelo
   próprio artefato.
5. Dirty tree, HEAD/tree hash divergente, prompt alterado, evidência ausente,
   gate obrigatório não executado ou finding crítico aberto é bloqueador.
6. Certificação local sem provas externas fica no máximo em
   `CONDITIONAL_GO / AAA_CANDIDATE` e elegível para `STAGING` ou
   `SUPERVISED_PILOT`; nunca promove `PRODUCTION`.

## Critérios de aceitação congelados

Os critérios binários, prioridades, validade e métodos de evidência estão em
[`quality-bar-phase11-1-v1.json`](../04_audit/evidence/AAA/AAA-21/quality-bar-phase11-1-v1.json).
Os itens mínimos são: reanchor/current pointer; cálculo único e false-GO;
auditoria de bypass legado; replan com `parentPlanId`; loop e orçamento
persistente; lease/fencing; crash/effect/unknown reconciliation; lineage e
telemetria; isolamento tenant/RLS e red-team de prompt/tool/model/replanner;
PostgreSQL/recovery; console responsivo e acessível; supply-chain; e gates
externos/humanos honestamente separados.

## Plano de implementação

- alinhar scripts, schemas e aliases à topologia canônica sem apagar os
  artefatos históricos;
- introduzir fixtures e regressões negativas para cada gap local reproduzível;
- fazer a auditoria de call-sites do runtime legado antes de alterar qualquer
  seletor;
- executar o caminho controlado com Node 22 e PostgreSQL descartável quando
  disponível;
- produzir evidência local sanitizada, manifests hashados e relatório de
  auditoria independente; registrar `NOT_RUN`/`BLOCKED` quando a prova depende
  de ambiente, autoridade ou integração ausente;
- atualizar runtime state, execution log, backlog e evidências pela ordem
  canônica ao final da rodada.

## Gate de BUILD

O pedido explícito do usuário autoriza o BUILD controlado local desta SPEC. O
gate não altera o estado do programa global nem concede autoridade humana ou
externa. Antes do primeiro código são obrigatórios: prompt intake com hashes,
quality bar congelada, baseline candidate-bound e delta audit dos achados
AUD-11-01..09. Uma falha nesses pré-requisitos interrompe o BUILD de produto,
mas não impede documentação e diagnóstico seguros.

**Status:** `READY_FOR_CONTROLLED_BUILD`
