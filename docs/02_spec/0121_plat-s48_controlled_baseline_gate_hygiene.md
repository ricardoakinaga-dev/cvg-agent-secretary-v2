# SPEC — PLAT-S48 baseline controlado e determinismo de testes

## `PLAT-S48-001` — clock do Capability Gateway

`CapabilityGatewayOptions` terá `now?: () => Date`. O construtor guardará a
função e usará `() => new Date()` quando nenhuma função for fornecida. A
boundary `hasValidApproval` deverá obter o instante uma vez, rejeitar clock
inválido ou não-finito e comparar `expiresAt` com esse instante. Em seguida,
`approvalAuthority.verifyAndConsume` continuará sendo chamado para validar
status, binding, input hash, expiração na autoridade e consumo único.

A função é uma seam de determinismo do runtime controlado; não concede ao
caller autoridade para alterar o tempo de uma autoridade durável. O fixture do
gateway e sua `InMemoryCapabilityApprovalAuthority` receberão a mesma função.

## `PLAT-S48-002` — consulta semântica da timeline

O teste de aplicação importará `within` e fará a busca de `Mensagem via API`
dentro do elemento com `aria-label="Timeline selecionada"`. A prova permanece
orientada ao usuário e tolera o preview da mesma mensagem no seletor de
conversas. Nenhum componente de produção será alterado.

## Invariantes

1. Approval inválido, vencido, malformado ou com clock inválido falha fechado.
2. Approval válido não é bloqueado por divergência artificial entre relógio do
   gateway e relógio do fixture.
3. A autoridade durável permanece a fonte final de consumo, binding, revogação
   e expiração.
4. O gateway não executa handler antes das validações existentes.
5. A UI continua renderizando preview e timeline; somente o seletor do teste é
   escopado.
6. Nenhum provider/canal/RAG/rede/dado real/side effect entra no caminho.

## Write-set e verificação

- `packages/platform/src/plugin-gateway.ts`
- `packages/platform/src/__tests__/capability-approval-gateway.test.ts`
- `apps/web/src/__tests__/app.test.tsx`
- evidência final em `docs/04_audit/0538_plat-s48_controlled_deterministic_clock_and_test_contract_evidence.md`

Executar RED focado antes do BUILD, GREEN focado após o patch, regressão,
coverage, typecheck, lint, format, audit, readiness, worker smoke, PostgreSQL,
E2E, build e `git diff --check`. O review independente será tentado quando o
runtime de agentes estiver disponível; indisponibilidade será registrada como
limitação, nunca como aprovação.
