# AUD17-06 — efeitos, outbox e reconciliação

**Status:** `VERIFIED_LOCAL`
**Ambiente:** Node `22.23.2`; adaptadores sintéticos controlados; PostgreSQL
descartável dedicado para a prova persistente; efeitos externos desabilitados.

## Prova vertical

`apps/api/src/__tests__/aud17-connected-redteam.test.ts` atravessa webhook sintético → persistência de inbound/outbox → worker controlado → revalidação de contexto → handler. O teste também confirma isolamento entre tenants e que um outbound marcado com `externalEffects=true` vira handoff sem chamar o handler.

## Prova de falha

`apps/worker/src/__tests__/outbox-recovery.test.ts` simula crash depois do efeito local idempotente e antes do ack: a segunda tentativa é processada, o efeito observado só é aplicado uma vez e o journal sintético mantém uma entrada. Estados ambíguos continuam destinados a `UNCERTAIN`, sem retry cego.

| Comando | Resultado |
| --- | --- |
| `npx vitest run apps/api/src/__tests__/aud17-connected-redteam.test.ts apps/web/src/features/orchestration/orchestration.test.tsx` | PASS nos cenários conectados e de console. |
| `npx vitest run apps/worker/src/__tests__/outbox-recovery.test.ts` | PASS; crash-window, retry, takeover e dead-letter. |
| `npm run test:e2e` | PASS; 9/9 E2E. |
| `npm run test:postgres` | PASS; 23 arquivos e 202 testes, sem falhas; outbox, journal, tenant/RLS, fencing e replay persistentes. |

## Limitação

O adapter continua local/sintético e não prova semântica de provider ou canal
real. Esses gates permanecem externos; a prova local não cobre RPO/RTO físico,
piloto, rollback ou sign-off humano.
