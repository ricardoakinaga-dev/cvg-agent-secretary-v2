# Evidência de auditoria — PLAT-S16 release candidate evidence ledger

- task: `PLAT-S16-001_CONTROLLED_RELEASE_CANDIDATE_EVIDENCE_LEDGER`
- sprint: `PLAT-S16_CONTROLLED_RELEASE_CANDIDATE_EVIDENCE_LEDGER`
- fechamento: `2026-08-25T11:55:53-03:00`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- fase final: `AUDIT`
- decisão: `COMPLETED_CONTROLLED`
- base: `f9e0096` (`main`) + checkout controlado não publicado
- dados: somente fixtures e identificadores fictícios; nenhum deploy, push,
  provider, canal, RAG, dado real ou side effect foi executado

## Lacuna e escopo

O S14 protege o preflight crítico imediatamente antes de publish/rollback, mas
não mantinha um registro durável da declaração administrativa de evidência de
uma versão candidata. O S16 fecha essa lacuna com um ledger tenant-aware e
metadata-only. A atestação não é um release, não altera `AgentVersion` ou
`activeVersionId` e não é consultada para habilitar runtime, capability,
provider, canal ou RAG.

## RED observado antes do BUILD

Antes da implementação, os testes do contrato/digest, lifecycle/store e API
foram executados e produziram 5 falhas esperadas: schemas/exports e métodos
do ledger ainda não existiam e a nova rota retornava 404. O resultado foi
registrado no execution log e no estado do Gauntlet como `Round 27`.

## Entrega verificada

- contratos strict e bounded para os quatro gates fixos: `safety_preflight`,
  `test_lab_regression`, `snapshot_integrity` e `external_boundary`;
- referências limitadas a `controlled://evidence/...`, sem URL externa,
  segredo, payload, conteúdo de knowledge ou texto bruto;
- digest SHA-256 canônico calculado no servidor e nunca aceito do caller;
- store em memória, repository PostgreSQL e wrapper tenant-scoped com cópia
  defensiva, vínculo agent/version e unique por tenant/agent/version/digest;
- lifecycle `DRAFT -> VALIDATED | REJECTED | ARCHIVED`,
  `VALIDATED/REJECTED -> ARCHIVED`, `expectedStatus` e conflito CAS;
- `VALIDATED` exige os quatro gates `PASS` e registra somente o ator e o
  instante de validação;
- migration `0006_release_candidate_evidence.sql` com constraints, índice,
  trigger de imutabilidade, `FORCE ROW LEVEL SECURITY` e política tenant-aware;
- API administrativa e Control Center com audit redigido por IDs, status,
  digest e chaves dos gates; a UI informa explicitamente a barreira
  metadata-only;
- E2E confirma criação/validação controlada e que a versão continua `DRAFT`.

## Evidência executável

| Gate                     | Resultado                                                                 |
| ------------------------ | ------------------------------------------------------------------------- |
| `npm run verify`         | PASS — exit 0                                                             |
| `npm test`               | PASS — 88 arquivos pass, 2 skips; 303 testes pass, 18 skips; 321 total    |
| `npm run test:coverage`  | PASS — statements 84,81%; branches 80,03%; functions 84,87%; lines 85,65% |
| `npm run typecheck`      | PASS                                                                      |
| `npm run lint`           | PASS                                                                      |
| `npm run build`          | PASS — build web Vite concluído                                           |
| `npm run readiness`      | PASS — 1 arquivo, 4 testes                                                |
| `npm run test:e2e`       | PASS — 1/1 fluxo Playwright; aproximadamente 9,3 s                        |
| `npm run test:postgres`  | PASS — 6 arquivos; 49 testes pass, 18 skips condicionais                  |
| `npm run audit:security` | PASS — 0 vulnerabilidades                                                 |
| `npm run format:check`   | PASS                                                                      |
| `git diff --check`       | PASS                                                                      |

Os skips do PostgreSQL continuam condicionais porque `TEST_DATABASE_URL` não
está configurada neste checkout; não foram tratados como evidência de um
rollout PostgreSQL real.

## Matriz CTRL-S16

| Critério                                                 | Evidência                                                      | Estado          |
| -------------------------------------------------------- | -------------------------------------------------------------- | --------------- |
| `CTRL-60` shape/gates/refs strict, bounded e secret-free | testes RED/GREEN de schema e entradas negativas                | PASS controlled |
| `CTRL-61` tenant/agent/version e digest do servidor      | store/repository, digest estável, unique e cross-tenant        | PASS controlled |
| `CTRL-62` lifecycle/CAS e validação all-PASS             | transições, stale 409, gates FAIL e caminhos de reject/archive | PASS controlled |
| `CTRL-63` `VALIDATED` sem mutação/execução               | store/API/UI/E2E e inspeção de `AgentVersion` ainda `DRAFT`    | PASS controlled |
| `CTRL-64` PostgreSQL/RLS e boundary existente            | migration 0006, smoke condicional, verify/readiness/E2E/audit  | PASS controlled |

## Auditoria de segurança e limites

- Nenhuma rota aceita digest fornecido pelo caller ou conteúdo de evidência.
- Todas as mutações exigem tenant e identidade de operador com
  `agent:configure`.
- O audit não grava gate payload, mensagem, resposta, token, segredo ou
  conteúdo institucional.
- A migration protege identidade, gates, digest, ator criador e lifecycle;
  registros não são reabertos ou reescritos.
- Não houve alteração em publish, rollback, dispatch, provider, canal, RAG,
  agenda, clínico, financeiro, prontuário ou dados reais.
- A revisão independente por child agents permaneceu indisponível por limites
  de conta/modelo; este fechamento é lead-only, sustentado por RED/GREEN,
  gates executáveis, inspeção temporal e revisão estática de segurança.

## Decisão

`PLAT-S16-001` está `COMPLETED_CONTROLLED`. O checkout permanece
`CONTROLLED_MVP_READY`; produção real permanece `NO-GO` /
`WAITING_HUMAN_APPROVAL`. O próximo lane exige novo registro
`DISCOVERY -> PRD -> SPEC` antes de qualquer BUILD. Nenhum deploy, dado real,
provider/canal, RAG ou ação sensível foi autorizado.
