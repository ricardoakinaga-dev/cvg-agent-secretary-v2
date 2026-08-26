# Security Model

## Trust boundaries

```text
HTTP/browser/job ─validation─► API/runtime ─tenant/auth─► control plane
                                      │
                                      ├─policy/gateway/approval─► handler
                                      └─redaction─► trace/audit/persistence
```

Nenhuma entrada externa é autoridade para tenant, grant, versão, digest,
segredo ou código.

## Controles atuais

- Zod strict/bounded em IDs, bodies, jobs, configs, query filters e evidence;
- identity resolver confiável e RBAC/tenant checks nas mutações;
- SQL parametrizado e filtros tenant-aware; RLS/roles least-privilege no modo
  PostgreSQL preparado para produção;
- `secretRef` sem valor de segredo em config, UI, trace ou audit;
- redaction de PII, payloads e mensagens, além de headers HTTP defensivos;
- HMAC/replay, rate limit process-local bounded e falha de startup redigida;
- policy hard safety, capability gateway deny-by-default e approval scoped;
- preflight crítico e autoridade de evidência no publish/rollback.

## Falha fechada

Ausência de identidade, binding, policy, versão, migration, queue adapter,
approval, candidate ou transporte seguro relevante resulta em erro seguro,
handoff ou encerramento. O sistema não tenta descobrir contexto faltante.

## O que ainda exige produção

IdP/tenant binding real, roles e RLS rollout, limiter/replay distribuídos,
CSRF/HTTPS/CSP no host, retenção/DLP/PII, alertas, HA, leases, migration/backfill
com change control e signoff para providers, canais, RAG, agenda, financeiro,
clínico ou prontuário. O audit controlado não substitui esses controles.
