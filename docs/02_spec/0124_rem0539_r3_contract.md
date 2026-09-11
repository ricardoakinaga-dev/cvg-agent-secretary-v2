# 0124 — SPEC R3: contrato de jornadas persistentes

Data: 2026-09-05. Programa: `REM-0539`. Onda: R3. Estado: `SPEC_APPROVED_CONTROLLED_BUILD`.

## Modelo controlado

`JourneyRepository` usa `DatabaseState` no modo memória para provar o contrato sem banco externo. Cada registro tem `tenantId`, ID de domínio, timestamps do relógio do repositório, estado e `idempotencyKey`. O estado inclui `ownerDrafts`, `patientDrafts`, `appointmentDrafts` e um catálogo sintético de candidatos/slots derivado de fixtures estáveis.

Estados permitidos:

- tutor/pet: `draft` → `linked` ou `expired`;
- appointment: `proposed` → `awaiting_approval` → `expired`/`cancelled`;
- nenhum caminho local chega a `confirmed`.

## Operações

`searchOwnerByPhone`, `createOwnerDraft`, `searchPatient`, `createPatientDraft`, `linkPatient`, `findAvailableSlots`, `createAppointmentDraft`, `listDrafts` e `createJourneyTask` validam tenant e entradas bounded. Busca ambígua retorna candidatos e requer esclarecimento. `linkPatient` exige candidato único/explicíto e falha em caso cross-tenant. Slots são `clock + 1/2 dias`, com fonte `synthetic-schedule-v1`. Expiração é avaliada na leitura e não remove evidência.

## Auditoria e handoff

Cada mutação registra evento `integration_event` ou `handoff` com `journeyType`, ID, tenant, conversa/sessão quando disponível e resumo redigido. O resumo de handoff usa o contrato de `packages/workflows/src/handoff/handoff-summary.ts`; não inclui telefone ou texto bruto. Uma triagem de risco não chama as operações de jornada.

## Compatibilidade

As funções locais existentes mantêm o contrato sem contexto (`matches: []`, drafts efêmeros) para consumidores legados. Quando recebem `{ repository, tenantId, ... }`, delegam ao contrato persistente. Assim a migração é opt-in e não mascara a ausência de integração.

## Testes e rollback

RED/GREEN cobre idempotência, restart, ambiguidade, cross-tenant, slot vencido, expiração, confirmação bloqueada, tarefa e handoff. Rollback consiste em não habilitar o contexto persistente e preservar os registros sintéticos anteriores; nenhuma migration ou fonte real é necessária nesta onda.
