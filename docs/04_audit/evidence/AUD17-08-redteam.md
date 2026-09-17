# AUD17-08 — red-team e governança

**Status:** VERIFIED_LOCAL_WITH_PG_GAP
**Ambiente:** Node `22.23.2`; corpus sintético; sem provider/canal/IdP e sem efeitos externos.

## Prova executada

| Comando | Resultado |
| --- | --- |
| `node scripts/phase11-2-redteam.mjs --suite=all` | PASS; 15/15 verificações sintéticas. |
| `node scripts/phase11-bypass-audit.mjs` | PASS; 47 arquivos, zero findings. |
| `npx vitest run apps/api/src/__tests__/aud17-connected-redteam.test.ts` | PASS; caminho HTTP→outbox→worker, tenant swap e takeover. |
| `npm run audit:security` | PASS; 0 vulnerabilidades high+. |

As contraprovas cobrem modelo sem autoridade, kernel controlado sem capacidade real, tenant explícito, revalidação de replay, outbound proibido em takeover, logs redigidos, candidate dirty e escalada de perfil.

## Limitações

Não há conexão com identidade, canal ou provider reais e não há evidência PostgreSQL concorrente/RLS neste host. O resultado é prova local controlada, não aprovação de integração.
