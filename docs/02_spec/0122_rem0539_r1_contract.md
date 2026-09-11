# REM-0539 R1 — Contratos de implementação v1

Estado: SPEC_APPROVED_CONTROLLED_BUILD para REM-04..07. Gate técnico lead: descoberta reproduzida, requisitos corretivos validados, contratos e tasks registrados antes do código. Autorização humana de execução local vem da solicitação atual para implementar o plano completo; não é aprovação independente das futuras evidências. REM-08 exige AUDIT e crítico independente.

## Ownership e contratos

- Runtime builder: packages/platform/src/test-lab.ts, novo safety-assessment.ts, critical-safety-preflight.ts e testes próprios; regressões em agent-core, worker e arquivo novo API rem-risk-boundary.test.ts. Não edita server.ts, contratos gerais ou persistência sem pedido ao lead.
- Approval builder: repositório approval, postgres.ts, tenant-scoped-postgres.ts, tipos de persistência necessários, API server.ts e testes próprios; App.tsx/painel approvals e testes de conflito. Não edita capabilities, registry ou http-security.ts.
- Lead: http-security.ts/test, shared/env e teste correspondente, dependências/lock e documentação; nenhuma edição concorrente do server.ts.
- Integração HTTP reservada ao approval builder enquanto possuir server.ts: substituir apenas opção Fastify por `trustProxy: httpSecurity.trustedProxyAddresses.length ? [...httpSecurity.trustedProxyAddresses] : false`. Lead disponibiliza normalized.trustedProxyAddresses readonly string[].

## Risco

Avaliação dedicada determinística independente da intenção, com normalização Unicode, limites lexicais e negação por cláusula. Não apenas reordenar regex. Aplicar resultado antes de policy/planning; risco alto implica zero chamadas ao planner/approval/handler. Usar entrada/histórico bounded, sem aumentar retenção. Histórico legado string[] mantém caráter conservador e não permite que texto retire risco/autorize efeito; não inferir resolução clínica. Trace contém motivo bounded sem payload adicional sensível. Preflight verifica risco/priority e ausência de planejamento usando evidência explícita ou spies server-owned, não flags do caller.

## HTTP

`trustedProxyAddresses?: readonly string[]`; normalized sempre array; no máximo 32 IPs literais IPv4/IPv6, sem aliases/wildcards/endereços indefinidos. Env `API_TRUSTED_PROXY_ADDRESSES` CSV. `trustedProxyHops` e env legado aceitam somente 0/ausência; positivo/shape inválido falha com mensagem constante de migração. Não introduzir trustProxy=true nem função que use somente hop. Runtime valida configuração novamente. Atualizar Fastify para release corrigida compatível após verificar registry/advisory; não iniciar rede de produto.

## Approval de atendimento

Comando persistence-owned de decisão + audit, actor/tenant/correlation derivados do servidor, sem depender de snapshot do caller. CAS pending→approved/rejected/assumed com preservação dos campos imutáveis; creation/save não pode fornecer bypass para terminal ou alterar decisão existente. Memory prepara/valida ambas mutações antes de commit e usa cópias defensivas. PostgreSQL usa transação explícita na mesma conexão (tenant wrapper isolado NÃO é transação), lock/conditional update e audit; falha de audit desfaz decisão. Código conflict / HTTP409 para perdedor, sem dados de outro ator; inexistente/cross-tenant indistinguíveis. UI exibe recuperação e recarrega fila respeitando view scopes. Aprovação não despacha consulta ou ação sensível.

## Verificação e reversibilidade

RED→GREEN focados, API pública, PostgreSQL com barreira e falha de audit, browser/UI; depois verify/coverage/readiness/worker/PG/E2E. Nenhum teste removido para obter verde; antigos que codificam comportamento inseguro são substituídos por contrato negativo explicitamente documentado. Sem mudança de schema prevista em R1; se constraint aditiva necessária, registrar antes e provar compatibilidade. Rollback de binário não pode reabilitar trustProxy numérico ou sobrescrita insegura; preferir interrupção segura até correção.
