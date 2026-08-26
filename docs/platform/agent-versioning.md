# Agent Versioning

## Lifecycle

```text
DRAFT → TESTING → APPROVED → PUBLISHED → ARCHIVED
```

Uma versão contém configuração completa e é tenant/agent-scoped. O store e o
repository fazem cópia defensiva; transições usam compare-and-swap com
`expectedStatus`.

## Publish

Publish exige, além de `APPROVED`, um `ReleaseCandidate` do mesmo tenant,
agente e versão. O candidato precisa estar `VALIDATED`, ter metadados de
validação, quatro gates `PASS` e digest recomputável. O preflight crítico é
calculado pelo servidor antes da mutação e a autoridade é repetida no store.

## Rollback

Rollback não edita a versão antiga. Ele autoriza a versão fonte com seu
candidato, copia sua configuração, cria nova versão e percorre o lifecycle
controlado até publicar o snapshot derivado. Candidato de outra versão,
tenant, agente, status ou digest falha fechado.

## Sessões e worker

Uma sessão pode fixar o par agente/versão no primeiro turno e continuar usando
snapshot `ARCHIVED` do mesmo escopo. O worker recebe `versionId` pinned e nunca
resolve `latest`.

## Produção

O ledger e `VALIDATED` são evidência administrativa controlada, não autorização
de deploy, rollout, provider, canal ou dado real. Produção exige signoff,
identity provider, RLS/roles, migração e controles operacionais separados.
