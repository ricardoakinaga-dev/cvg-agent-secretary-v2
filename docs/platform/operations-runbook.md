# Operations Runbook

## Estado permitido

O estado publicado deste repositório é `CONTROLLED_MVP_READY`. Desenvolvimento
e testes usam fixtures; produção real permanece `NO-GO` até decisões humanas e
infraestrutura comprovada.

## Checks locais

```text
npm ci --ignore-scripts
npm run readiness
npm run verify
npm run test:worker:startup
TEST_DATABASE_URL=postgres://... npm run test:postgres
npm run test:e2e
```

O worker sem `CVG_WORKER_QUEUE_ADAPTER` deve encerrar com exit 1 e evento JSON
`worker.startup_failed/queue_adapter_missing`; isso é comportamento esperado,
não um worker pronto para tráfego.

## API

Development pode inicializar o preset `CVG Secretary` controlado em memória.
Production exige PostgreSQL, RLS enforcement, `DATABASE_URL`, migration role
separada quando aplicável, tenant/agent resolver, identity resolver confiável,
origins allowlisted, HTTPS explícito e verifier de webhook. Segredos são
fornecidos por ambiente/secret manager e nunca por config/UI.

## Diagnóstico seguro

- erro de body/query: confira schema e limites; não copie payload para logs;
- `published_version_missing`: confira agent/version binding e lifecycle;
- `pinned_version_invalid`: confira par tenant/agent/version da sessão/job;
- `queue_adapter_missing`: configure adapter aprovado ou mantenha o worker
  desligado;
- falha de migration/RLS: interrompa startup e corrija schema/role, sem
  desabilitar enforcement;
- publish/rollback recusado: confira candidato `VALIDATED`, digest, quatro
  gates e binding exato, sem editar banco manualmente.

## Release controlado

Execute os gates, registre evidências em `docs/04_audit/`, revise diff e
backlog, e obtenha aprovação humana antes de qualquer piloto. Não confirmar,
cancelar ou reagendar consulta real; não responder RAG sem fonte institucional
aprovada; não executar ação clínica, financeira ou prontuário definitivo.

## Observabilidade

`/health` é o endpoint básico. `/health/metrics` é somente process-local e
controlado em test/development; não é monitoramento distribuído. Traces e audit
devem permanecer redigidos e tenant-scoped. Para produção, adicionar alerting,
retenção, purge, HA, limiter/replay distribuído e runbooks aprovados.
