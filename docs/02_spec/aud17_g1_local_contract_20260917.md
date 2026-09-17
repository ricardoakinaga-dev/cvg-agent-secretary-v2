# SPEC G1 — contratos locais AUD17-03..11

**Data:** 2026-09-17
**Pipeline:** DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT
**Gate:** SPEC_APPROVED_CONTROLLED_BUILD
**Escopo:** somente execução local controlada, Node 22.23.2, fixtures sintéticas,
adapters falsos e PostgreSQL descartável quando disponível. Não há autorização
para provider, canal, IdP, RAG institucional, egress, deploy, piloto, dado real,
efeito clínico/financeiro ou alteração de prontuário.

## Decisões de boundary

1. A autoridade de bootstrap será uma função pura compartilhada pelo comando
   scripts/production-preflight.mjs e pelos entrypoints API/worker. Ela valida
   configuração, separação dos endpoints e um atestado runtime hash-bound com
   fingerprints de banco, migrations, RLS, constraints e role; checagens
   conectadas continuam nos preflights de runtime. Um processo de produção não
   pode iniciar antes de a função retornar sucesso.
2. O cálculo de maturidade será uma rubrica explícita, separada da decisão
   binária de gate. Cada domínio expõe score, status, dimensões, pesos, provas,
   limitações e caps; evidência ausente, stale ou externa bloqueada reduz o
   score e nunca é convertida em 99.
3. O worker continua usando ack durável, revalidação de tenant/policy/
   approval/takeover e handoff para incerteza. A mudança local só pode fechar
   contra um teste que reproduza um contraexemplo; não haverá retry cego nem
   adapter externo.
4. A console permanece read-only. Estados de execução são derivados do
   read-model tenant-scoped; ações de efeito/requeue não serão adicionadas sem
   PRD/SPEC próprios.

## Contratos por task

### AUD17-03 — semântica de score

- Entrada: gates, invariantes, findings, successState e, quando aplicável,
  evidência de domínio.
- Saída: objeto determinístico por domínio com value entre 0 e 100, status
  (PASS, PARTIAL, NOT_EXECUTED, BLOCKED, FAIL), rubrica dimensionada, pesos
  cuja soma é 1, evidência e limitações.
- Negativos: fixture com todos os gates locais PASS mas evidência externa,
  crítica, PostgreSQL ou recuperação ausente; gate NOT_EXECUTED; finding P0/P1
  aberto; score adulterado no resultado. Nenhum desses casos pode gerar score
  alto, GO ou elegibilidade de produção.
- DoD: known-good e known-bad fixtures; recálculo independente; verifier
  detecta alteração de score; decisão binária continua soberana e thresholds
  históricos não são reduzidos.

### AUD17-04 — orquestração persistida

- Entrada: Goal/Plan/Step/Attempt/Evaluation sintéticos e orçamento cumulativo.
- Saída: replan e retomada ligados à avaliação persistida, com lineage,
  deadline, iteração e budget não-resetáveis.
- Negativos: ciclo semântico, timeout, budget cumulativo, kill/restart, lease
  stale e planner tentando executar tool diretamente.
- DoD: testes públicos/runtime e PostgreSQL quando disponível mostram
  terminação segura ou continuação do estado persistido sem replay de efeito.

### AUD17-05 — persistência/fencing/recovery

- Entrada: banco descartável e migrations existentes; nenhum banco externo.
- Saída: claim/fencing/CAS/tenant/RLS/restart/restore lógico preservam
  invariantes.
- Negativos: claim duplo, token/lease antigo, tenant cruzado, migration
  incompleta, restart e restore lógico.
- DoD: logs/queries brutos e testes reproduzíveis; ausência de prova física
  permanece NOT_EXECUTED até AUD17-14.

### AUD17-06 — efeitos, approval e outbox

- Entrada: inbound HTTP sintético, SQL/outbox, worker e adapter falso com
  contador.
- Saída: aprovação/policy/journal/audit vinculados ao mesmo tenant, correlation
  e idempotency key.
- Negativos: crash antes/depois do adapter, ack perdido, replay, takeover,
  approval race e tenant mismatch.
- DoD: zero duplicação; crash ambíguo é UNCERTAIN/handoff com lineage; a
  rejeição de revalidação é terminal e auditável.

### AUD17-07 — bootstrap fail-closed

- Entrada: ambiente de processo e arquivos/migrations locais.
- Saída: API e worker não escutam/não reivindicam trabalho quando o preflight
  de produção falha.
- Negativos: NODE_ENV/persistence/DB/RLS/identity/approval/journal, flag
  externa forjada, segredo placeholder e migration source ausente.
- DoD: processo negativo verifica exit não-zero e ausência de serving/claim;
  comando e entrypoints usam a mesma função; production:preflight PASS em
  modo --expect=REJECT continua sendo apenas prova do negativo.
- O atestado `CVG_PRODUCTION_PREFLIGHT_ATTESTATION_FILE` e seu SHA-256 devem
  ser emitidos por um preflight conectado/revisado; flags isoladas ou URLs
  sintéticas não satisfazem essa prova.

### AUD17-08 — red-team conectado

- Entrada: corpus sintético congelado atravessando API, tenant resolver,
  policy, approval, outbox, journal, audit e logs.
- Saída: rejeição fail-closed sem efeito nem vazamento.
- Negativos: actor não confiável, cross-tenant, prompt/tool/channel injection,
  approval replay, stale lease e segredo no log.
- DoD: teste conectado + crítica fresca read-only; não aceitar marcador de
  fonte como substituto da contraprova de boundary.

### AUD17-09 — qualidade/perturbação

- Entrada: suites Node22, cobertura, skips, evals, chaos e mutantes
  selecionados antes do resultado.
- Saída: relatórios frescos por gate, sem converter skip obrigatório em PASS.
- Negativos: mutant de policy/fencing/budget/journal/tenant/certificação,
  log stale e suite não executada.
- DoD: pisos históricos preservados, críticos cobertos ou bloqueados,
  inventário de skips e raw logs guardados.

### AUD17-10/11 — console e operação

- Entrada: read-model sintético populado, falhas injetadas e correlation id.
- Saída: console read-only mostra estados truthful e trace/metric/audit
  permite localizar handoff/UNCERTAIN.
- Negativos: loading/empty/error/retry, approval pendente, budget/loop,
  UNCERTAIN, cross-tenant e conteúdo sensível.
- DoD: screenshots reais em 375/768/1440, teclado/semântica, logs de
  rede/console e runbook de reconciliação exercitado. Sem PASS visual por
  inspeção de JSX/CSS.

## Gate de transição

Cada task sai de IMPLEMENTED somente com teste focado GREEN e revisão do
artefato/negative. VERIFIED_LOCAL exige regressão proporcional. AUD17-12 só
abre depois de AUD17-03..11 terem evidência atual; AUD17-13..15 permanecem
BLOCKED_EXTERNAL e não podem ser simuladas como PASS.

## Evidência e atualização operacional

Os logs devem ser sanitizados, vinculados ao candidato e registrados junto com
status PASS/FAIL/SKIP/NOT_EXECUTED, Node, banco e limitações em
docs/04_audit/evidence/AUD17-AAA/. Ao fim de cada rodada, atualizar runtime
state, execution log e backlog sem sobrescrever o histórico Phase 11.
