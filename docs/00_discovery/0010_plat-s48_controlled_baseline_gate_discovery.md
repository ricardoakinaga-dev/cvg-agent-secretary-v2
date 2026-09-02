# Discovery — PLAT-S48 baseline controlado e contratos de teste

## Identificação

- sprint: `PLAT-S48_CONTROLLED_BASELINE_DETERMINISM`
- data: `2026-09-02`
- fase: `DISCOVERY`
- método: inspeção read-only do source, testes, CI, runtime e documentação
- decisão: `READY_FOR_PRD_SPEC`

## Evidência observada

O checkout estava limpo e os gates estáticos existentes permaneciam verdes,
mas a regressão integral deixou de sustentar o fechamento histórico S47:

- `npm test`: 129 arquivos; 125 pass, 2 falhos e 2 skipped; 553 testes, 532
  pass, 2 falhos e 19 skipped;
- `packages/platform/src/__tests__/capability-approval-gateway.test.ts`:
  o fixture injeta `2026-09-01T10:00:00.000Z` na autoridade de approval, mas
  `CapabilityGateway` usa `Date.now()` diretamente. A aprovação válida é
  rejeitada como `approval_required` antes da autoridade durável verificar e
  consumir o registro;
- `apps/web/src/__tests__/app.test.tsx`: `Mensagem via API` é renderizada uma
  vez no botão de preview da conversa e outra vez na timeline selecionada. A
  consulta global `findByText` falha por ambiguidade, embora a UI mostre o
  comportamento esperado.

Nenhuma reprodução usou provider, canal, RAG, rede, banco com dado real,
segredo, agenda, ação clínica/financeira ou side effect externo.

## Lacuna e hipótese

1. O gateway precisa de uma fonte de tempo injetável, com default para o relógio
   real, para que fixtures e autoridade compartilhem a mesma noção de agora.
   A autoridade durável continuará sendo a decisão final de expiração,
   binding, consumo único e revogação.
2. O teste de aplicação precisa consultar a região semântica da timeline, e
   não o documento inteiro, para distinguir preview de histórico selecionado.

## Limites congelados

- somente correção do seam temporal do gateway e da consulta semântica do
  teste web;
- sem mudança de schema, contrato HTTP ou comportamento de API externa; a
  única superfície adicional é uma opção TypeScript interna do gateway, não
  exposta a input externo; sem mudança de política de approval, provider/canal,
  RAG, rede, deploy, dado real ou efeito externo;
- sem relaxar fail-closed, single-use, binding por tenant/agente/versão/tool ou
  redaction;
- a fronteira `PRODUCTION_REAL_DATA_READY` permanece `NO-GO`.

## Próximo gate

Registrar PRD e SPEC, executar RED focado, implementar o menor patch possível e
reexecutar a regressão completa com os gates controlados. A lane só pode ser
fechada após evidência executável e auditoria do diff.
