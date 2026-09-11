# PHASE 10 — CHAOS REPORT

Fonte mecânica: `certification/chaos-report.json` e `packages/chaos`.
Execução: `npm run test:chaos` (14 cenários em memória) +
`packages/chaos/src/__tests__/chaos-postgres.test.ts` (2 cenários PostgreSQL,
requerem `TEST_DATABASE_URL`).

## Cenários

| ID       | Cenário                                | Resultado                            |
| -------- | -------------------------------------- | ------------------------------------ |
| CHAOS-01 | worker crash antes do efeito           | PASS — lease takeover, 1 efeito      |
| CHAOS-02 | worker crash após resposta do provider | PASS — journal dedupe                |
| CHAOS-03 | crash após efeito externo antes do ack | PASS — 1 efeito externo              |
| CHAOS-04 | disconnect temporário do PostgreSQL    | NOT_EXECUTED (sem TEST_DATABASE_URL) |
| CHAOS-05 | restart do PostgreSQL                  | NOT_EXECUTED (sem TEST_DATABASE_URL) |
| CHAOS-06 | timeout de provider                    | PASS — deadline                      |
| CHAOS-07 | provider 429                           | PASS — retry 1x                      |
| CHAOS-08 | provider 503                           | PASS — fail closed                   |
| CHAOS-09 | webhook duplicado                      | PASS — 1 evento inbound              |
| CHAOS-10 | webhook fora de ordem                  | PASS — 0 perda                       |
| CHAOS-11 | approval expirado durante execução     | PASS — fail closed                   |
| CHAOS-12 | tenant mismatch                        | PASS — 0 acesso cross-tenant         |
| CHAOS-13 | token reenviado                        | PASS — replay rejeitado, TTL         |
| CHAOS-14 | worker duplicado disputando claim      | PASS — owner único                   |
| CHAOS-15 | latência de rede                       | PASS — sucesso lento no deadline     |
| CHAOS-16 | outage de canal                        | PASS — retry sem duplicar            |

## Aceitação

- mensagens perdidas = 0
- acessos cross-tenant = 0
- efeitos externos duplicados = 0
- ações não autorizadas = 0

## Limites

CHAOS-04/05 são exercitados no CI com serviço PostgreSQL (`verify.yml`). Sem
`TEST_DATABASE_URL`, ficam registrados como `NOT_EXECUTED` e a decisão permanece
`CONDITIONAL_GO`, nunca `GO`.
