# REM-0539 — dossiê R7 de revalidação controlada

Data: 2026-09-05
Status: `CONDITIONAL_PASS_CONTROLLED_NO_GO_EXTERNAL`
Evidência principal: [`0552_rem0539_r7_revalidation_evidence.json`](0552_rem0539_r7_revalidation_evidence.json)

## Parecer executivo

A rodada R7 revalidou os blockers técnicos identificados pela crítica fresh-context anterior. O outbox não carrega strings arbitrárias ou números não reconhecidos, o ack PostgreSQL separa ownership e execução para evitar deadlock, a migração legada preserva apenas trabalho roteável, e o bridge usa o handler PostgreSQL controlado real com finalização determinística.

O resultado é um passe condicional apenas para fixtures sintéticas, schemas PostgreSQL descartáveis e serviços locais. Produção e piloto real continuam `NO-GO`: não há identidade externa, provider, canal/destinatário, fonte institucional aprovada, signoff humano ou RPO/RTO aprovado.

## Correções incorporadas

- `packages/shared/src/audit-governance.ts` agora permite somente identificadores internos com formato conhecido e enums de canal/tipo/policy; `status` e `fixture` textuais livres, números e texto desconhecido viram marcadores opacos.
- `packages/persistence/src/outbox.ts` e `packages/persistence/src/postgres.ts` aplicam a mesma política de payload/result/error, preservando o handoff como código controlado e mantendo a deduplicação por tenant.
- `PostgresRuntimeRepository.ack` usa uma transação de validação/commit antes do handler e uma transação final com rechecagem de lease, journal, CAS, tentativa e auditoria. O contrato é at-least-once; handlers controlados devem ser idempotentes.
- `0011_outbox_payload_redaction.sql` classifica legado antes de reinstalar checks/RLS, quarentena rows sem tenant, rota inbound ou tipo controlado e não deixa pending sem contexto executável.
- `apps/worker/src/postgres-controlled.ts` compõe o handler real de inbound, resolve/pina versão publicada, executa o runtime determinístico e chama a finalização tenant-scoped; não chama provider, canal, plugin ou transporte externo.
- O worker PostgreSQL é recusado em `NODE_ENV=production` enquanto o gate externo não existir; a matriz visual e o Control Center continuam cobertos por E2E local.

## Verificação

- `npm test -- --reporter=dot`: 152 arquivos passaram, 3 foram omitidos; 657 testes passaram, 25 foram omitidos.
- `TEST_DATABASE_URL=... npm run test:postgres -- --reporter=dot`: 10 arquivos e 82 testes passaram, sem skips; migration, RLS, outbox, ack e bridge foram exercitados em PostgreSQL local descartável.
- `npm run test:coverage -- --reporter=dot`: statements 85,51%; branches 81,02%; functions 91,10%; lines 86,41%.
- `npm run build`, `typecheck`, `lint`, `format:check`, `readiness`, `test:worker:startup`, `audit:security` e `git diff --check`: `PASS`.
- `CVG_WEB_PORT=4199 CVG_API_PORT=3197 npm run test:e2e`: 6/6 passaram; a shell foi exercitada em 375, 768 e 1440 px, sem overflow horizontal e com foco visível.

## Crítica independente

O crítico fresh-context `01a073e0-1d26-7872-a196-3c22d1d39014` retornou `PASS_CONTROLLED`, sem blockers P0/P1/P2. Confirmou a redação de `status`/`fixture`/texto/números, o commit antes do handler, a quarentena/restauração de RLS da migration, a idempotência por SHA-256 e o bloqueio de produção. A revisão foi estática e não substitui os testes dinâmicos nem os gates externos.

## Critério de parada

R7 fecha a revalidação técnica controlada, mas não transforma mocks/fixtures em integração externa. Permanecem bloqueados: RF-011; identidade e autorização externas; provider e canal com destinatários aprovados; fonte institucional e proprietário aprovados; signoff humano; metas RPO/RTO; ensaio operacional; uso de dados reais; deploy; qualquer ação clínica, financeira, de prontuário definitivo ou confirmação/cancelamento/reagendamento real.

O próximo passo autorizado é anexar o parecer fresh-context R7 e, somente após os gates externos/humanos, repetir REM-27–29 em ambiente aprovado. Até essa decisão, manter o worker controlado fora de produção e a política `NO-GO` para piloto real.
