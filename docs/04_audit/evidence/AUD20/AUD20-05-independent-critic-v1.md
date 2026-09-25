# AUD20-05 — crítica independente v1

- data: `2026-09-22`
- modo: leitura independente, fresh-context
- staging/produção: `NO_GO`

## Primeiro verdict

`FAIL`. A crítica identificou que `assertReady()` rejeitava `CREATEDB`, mas não
o privilégio efetivo `CREATE` concedido diretamente no banco. C03 e C06 foram
considerados bloqueados.

## Remediação observada

O runtime passou a consultar
`has_database_privilege(current_user, current_database(), 'CREATE')` e rejeitar
o resultado positivo. A suíte unitária cobre a variante e um teste PostgreSQL
real concede `CREATE`, observa a rejeição e revoga o privilégio. O teste focado
PostgreSQL passou `20/20`; typecheck e lint passaram.

## Re-review

Verdict: `PASS_LIMITED — sem bloqueador de implementação`.

| Critério | Resultado |
| --- | --- |
| C01 | `PASS` — binding por digest implementado |
| C02 | `PASS` — assinatura, validade, ambiente, owner e candidate/config digest fail-closed |
| C03 | `PASS` — CRUD, ownership, memberships e privilégios proibidos cobertos, inclusive database `CREATE` |
| C04 | `PASS` — API antes de listen e worker antes do primeiro claim |
| C05 | `PASS` — UPSERT atômico, duas pools e falha do store cobertos |
| C06 | `WAITING_SEAL` — único item pendente no instante da crítica |
| C07 | `PASS` — memória/adapter ausente em produção falham fechado |

A crítica considerou que os negativos de memória/adapter ausente, a barreira
de startup e o relatório de roll-forward satisfazem o requisito de rollback.
Após este verdict, o seal candidate-bound deve ser regenerado; nenhuma
autorização de release decorre da aprovação local.

