# 0014 — Discovery R4: integrações e operação governadas

Data: 2026-09-05. Programa: `REM-0539`. Onda: R4. Estado: `DISCOVERY_VALIDATED_CONTROLLED`.

## Problema observado

O núcleo controlado já possui identidade de operador, catálogo de knowledge, canal fake, métricas e auditoria, mas ainda não prova rotação de segredo, falha de provider, replay de entrega, revogação de fonte, retenção, restore ou rollback. Mocks não podem ser apresentados como integração externa pronta.

## Escopo da descoberta

- Contratos locais para identidade assinada com janela de rotação.
- Adapter de modelo determinístico com timeout, orçamento e saída maliciosa bloqueada.
- Entrega humana mock com idempotência, replay e takeover.
- Catálogo de conteúdo versionado com publicação, revogação e handoff sem fonte válida.
- Métricas, alertas, redaction e purge controlados.
- Snapshot/restore/rollback de estado sintético com conferência de tenant.

## Limites

Nenhum IdP, modelo, canal, segredo de produção ou fonte institucional real será conectado nesta onda. O adapter deve declarar `externalCall=false`. Qualquer sandbox externo, credencial, destinatário ou orçamento exige aprovação independente e não muda o status do programa.

## Próximo gate

PRD e SPEC podem detalhar essas seams locais. O gate de integração real permanece separado do BUILD e exige responsável, contrato, retenção, custo e aprovação explícita.
