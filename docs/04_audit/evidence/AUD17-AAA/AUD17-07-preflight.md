# AUD17-07 — bootstrap e preflight de produção

**Status:** VERIFIED_LOCAL_FAIL_CLOSED
**Ambiente:** Node `22.23.2`; configuração inválida/sintética; sem listen, database ou deploy.

## Prova executada

| Comando | Resultado |
| --- | --- |
| `npx vitest run tests/production-preflight.test.js` | PASS; paridade API/script para origins mistas e API/worker encerrando com bootstrap inválido. |
| `npm run production:preflight -- --profile=PRODUCTION --expect=REJECT` | PASS do modo negativo; `actualStatus=FAIL`, `sideEffects=false`. |
| `npm run test:worker:startup` | PASS; startup inválido e smoke controlado. |

`apps/api/src/main.ts` e `apps/worker/src/main.ts` chamam o mesmo `production-preflight-core` antes de iniciar o caminho de serviço. O core exige PostgreSQL, endpoints distintos, um atestado runtime hash-bound com fingerprints e schema/role verificados, migrations >= 23, RLS, kernel durável, identidade confiável, HTTPS, governança e atestações externas; apenas flags ou URLs sintéticas não produzem `PASS` de infraestrutura.

## Limitação

O preflight local valida configuração e presença de fontes de migration. A prova de privilégios, schema/RLS efetivo, secrets reais e atestações externas continua dependente do ambiente autorizado.
