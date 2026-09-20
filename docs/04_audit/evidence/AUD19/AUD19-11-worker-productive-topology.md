# AUD19-11 — topologia empacotável de API e worker (evidência)

- **Programa:** AUD19-REM · **Task:** AUD19-11 · **Status:** `COMPLETED_LOCAL`
- **Escopo:** `CONTROLLED_LOCAL` (dados sintéticos, PostgreSQL descartável, build de imagem local)
- **Produção:** `NO_GO` · **Staging real:** `NO_GO`
- **Autorização:** prompt do usuário para implementação local; nenhum push, deploy, publicação de imagem, provider/canal/IdP/RAG real ou efeito externo.
- **Node:** `22.23.2` · **npm:** `10.9.8` · **Docker:** `29.1.3`
- **Evidências:** `AUD19-11-digests.json`, `AUD19-11-worker-smoke.json`, `AUD19-11-worker-smoke-container.json`, `AUD19-11-container-checks.json` (este diretório).

## 1. Onde estava o bloqueio produtivo e como foi substituído

`P1-OPS-01` do relatório 0566: o worker PostgreSQL recusava `NODE_ENV=production`
incondicionalmente, enquanto o preflight de produção exige exatamente o kernel durável
e o adapter PostgreSQL nesse perfil. O worker nunca poderia existir em produção.

Removidos os dois pontos de recusa incondicional:

| Antes | Depois |
| --- | --- |
| `apps/worker/src/worker.ts` — `production_controlled_worker_forbidden` para qualquer adapter postgres | `getProductionWorkerConfigurationFailure(env)` (`production-worker-guard.ts:77`) |
| `apps/worker/src/postgres-controlled.ts` — `throw` em `NODE_ENV=production` | `assertProductionWorkerConfiguration(env)` (`postgres-controlled.ts:168`) |

O guard de produção agora exige, por código e em ordem determinística
(`apps/worker/src/production-worker-guard.ts`):

1. adapter PostgreSQL durável (`postgres`/`postgres-controlled`);
2. `CVG_WORKER_RUNTIME=kernel` + `CVG_DURABLE_KERNEL_ORCHESTRATOR=true`;
3. `CVG_WORKER_RUN_MODE=continuous` (consumo supervisionado com drain);
4. `DATABASE_URL` PostgreSQL;
5. `DATABASE_MIGRATION_URL` PostgreSQL **distinto** (papel de migração separado);
6. `POSTGRES_RLS_ENFORCEMENT=true`;
7. `POSTGRES_AUTO_MIGRATE=false`;
8. `CVG_WORKER_CONTROLLED_MODE=true`;
9. `CVG_WORKER_TENANT_ID` válido;
10. `CVG_REAL_EFFECTS`/`CVG_ALLOW_REAL_EFFECTS` desligados (efeitos reais proibidos).

O entrypoint continua chamando `assertProductionBootstrap` (contrato assinado/versionado
com atestação externa e runtime attestation). Produção exige **os dois**: guard estático +
preflight atestado. Configuração incompleta falha fechado por código.

**Prova de que o bloqueio virou gate real:** na imagem final, com o perfil estático de
produção completo (valores sintéticos, sem atestações), o worker falha com apenas
`bootstrap.external_attestation,bootstrap.external_attestations,bootstrap.runtime_attestation`
— os gates externos/humanos legítimos — em vez da impossibilidade incondicional.
(`AUD19-11-container-checks.json` → `workerCompleteStaticProductionProfile`.)

## 2. Topologia empacotável

`Dockerfile` multi-target, todos non-root (`USER cvg`, uid/gid 10001), sem segredos:

| Target | Base | Healthcheck | Comando |
| --- | --- | --- | --- |
| `api` | `runtime-base` (deps de produção) | `GET /live` via `node -e fetch` | `tsx apps/api/src/main.ts` |
| `worker` | `runtime-base` | arquivo de prontidão `grep '"status":"ready"' /tmp/cvg-worker-ready` | `tsx apps/worker/src/main.ts` |
| `web` | nginx unprivileged (inalterado) | — | — |

- `scripts/lib/production-preflight-core.mjs` passou a ser copiado para a imagem: o
  entrypoint do worker o importa e sem ele a imagem quebrava (parte do defeito P1-OPS-01).
- `.dockerignore` endurecido: `tests`, `**/__tests__`, `.gitignore`, padrões de
  chaves/certificados e diretórios de segredos ficam fora do contexto de build.
- Runtime sem tooling de dev: `npm ci --omit=dev`; `tsx` é dependência de produção
  explicitamente justificada no Dockerfile conforme `aaa_quality_contract.md` §6/Q-A18-03
  (não há emit JS — o tsconfig usa `allowImportingTsExtensions` + `noEmit`; um entrypoint
  compilado exigiria reescrita de build).
- Worker: `STOPSIGNAL SIGTERM`; drain gracioso pelo `createShutdownController` do shared
  (já usado no `main.ts`), com `markDraining()` antes de parar o pump e `markStopped()`
  depois. `CVG_WORKER_MAX_EVENTS`/`CVG_WORKER_DRAIN_MS` seguem valendo.

### Prontidão observável (`apps/worker/src/worker-health.ts`)

- **Arquivo** (padrão `/tmp/cvg-worker-ready`, `CVG_WORKER_READINESS_FILE`): JSON
  `{kind: cvg-worker-readiness, status: starting|ready|draining, workerId, pid, updatedAt}`;
  é removido em `markStopped`.
- **HTTP opcional** (`CVG_WORKER_HEALTH_PORT`; desligado por padrão): `GET /live` (200
  enquanto o processo vive) e `GET /ready` (200 só em `ready`, 503 caso contrário). O bind
  é exclusivamente loopback (`CVG_WORKER_HEALTH_HOST` aceita só `127.0.0.1`/`::1`/`localhost`);
  host público é recusado — nenhuma porta é aberta por padrão.

## 3. Builds locais e digests

```
docker build --target api    -t cvg-aud19-api:local .
docker build --target worker -t cvg-aud19-worker:local .
node scripts/build-digests.mjs
```

Ambos PASS. Nenhuma imagem foi publicada, tagueada para registry ou enviada.

Digests canônicos em `AUD19-11-digests.json`:

| Campo | Valor |
| --- | --- |
| build.api.id | `sha256:1a910a14681e78a137c6b8bab6165d1a58e782e2c39a9751638565021bee2d1c` |
| build.worker.id | `sha256:292a0f9b0df66e37bf9122154149b2a4967bba72c393e0b9f9ff7739a9d9babb` |
| container.api.configDigest | ver `container.api.configDigest` no JSON |
| container.worker.configDigest | ver `container.worker.configDigest` no JSON |
| migration.digest (0019..0026, 8 arquivos) | `dc9da14b59af03a348b10006fba1e55ef8e6f11e5a5f38a8fe19e23ceda9fc36` |
| policy.digest (fontes do policy-engine + preflight de produção) | ver `policy.digest` no JSON |
| sbom.digest | `d8843096c1590ef48369a6464abdc42a6d6de8493cb0d700d704173422b249da` (374 componentes) |
| toolchain | node `v22.23.2`, npm `10.9.8`, docker `29.1.3` |

Campos indisponíveis seriam gravados como `NOT_RUN` + motivo; nesta rodada todos os
campos mensuráveis passaram. O SBOM é regenerado pelo próprio script (`npm run sbom`)
antes do digest, então digest e artefato ficam alinhados na mesma execução.

## 4. Scans locais

Executados dentro de `scripts/build-digests.mjs` (exit code é a autoridade) e também
manualmente: `npm run sbom` exit 0; `npm run licenses:check` exit 0 (374 pacotes,
21 internos, 0 negados, 0 não classificados); `npm run audit:security` exit 0
(`found 0 vulnerabilities`, `--audit-level=high`).

## 5. Smoke do worker produtivo controlado

`scripts/worker-productive-smoke.ts` (modo local e modo Docker), contra
`postgres://postgres:postgres@127.0.0.1:5434/cvg_test` descartável (schema e papel
temporários, removidos ao final). Perfil: kernel durável, RLS, modo controlado,
`CVG_REAL_EFFECTS`/`CVG_ALLOW_REAL_EFFECTS` desligados.

Resultados (ambos `PASS`):

| Prova | Local (`AUD19-11-worker-smoke.json`) | Container (`…-container.json`) |
| --- | --- | --- |
| `worker.continuous_ready` | sim | sim (`docker logs`) |
| arquivo de prontidão | `status=ready` e removido no shutdown | `status=ready` (dentro do container) |
| evento sintético `message.outbound` | `processed`, 1 tentativa | `processed` |
| efeito externo | `externalEffects=false`, `effect_journal` vazio | idem |
| drain em SIGTERM | `worker.shutdown.completed`, exit 0 | `docker stop` exit 0 |
| healthcheck da imagem | — | `healthy` (container-checks) |

O handler composto para `message.outbound` no kernel é `controlled_outbound_suppressed`
com `externalEffects=false` (`apps/worker/src/kernel-composition.ts:1876`); nenhum
provider/canal/IdP foi contatado (não há credencial nem adapter real no ambiente).

## 6. Verificação

| Comando | Resultado |
| --- | --- |
| `npx tsc -p tsconfig.typecheck.json --noEmit` | exit 0 |
| `npx eslint <arquivos alterados>` | exit 0 |
| `npx prettier --check <arquivos alterados>` | exit 0 |
| `npx vitest run apps/worker/src/__tests__ --no-file-parallelism --maxWorkers=2` | 17 arquivos PASS / 3 skip, 121 PASS / 25 skip (sem `TEST_DATABASE_URL`) |
| idem com `TEST_DATABASE_URL` local | 21 arquivos PASS, 150 PASS, 0 falhas |
| `npm run test:worker:startup` | exit 0 (`queue_adapter_missing` + controlled smoke) |

Novos testes:
`production-worker-guard.test.ts` (10 casos, um por dimensão de configuração + perfil
completo aceito), `worker-health.test.ts` (config fail-closed + ciclo de prontidão +
endpoint loopback), `worker-docker-topology.test.ts` (contrato de alvo/entrypoint: targets
`api`/`worker` do mesmo runtime non-root, CMD do worker, cópia do módulo de preflight,
healthcheck por arquivo e ausência de `EXPOSE`/porta por padrão no worker), além de ajuste
dos testes existentes que afirmavam a recusa incondicional (`continuous-worker.test.ts`,
`postgres-controlled.test.ts`, `published-worker-runtime.test.ts`).

## 7. O que o lead precisa integrar no release manifest

`certification/phase11/release-manifest.json` (não editável nesta task; pertence a
AUD19-12) tem hoje `buildId`, `containerDigest`, `migrationDigest`, `policyVersion` e
`sbomDigest` nulos/antigos. O mapeamento está em `AUD19-11-digests.json →
releaseManifestMapping`:

- `buildId` ← `build.api.id` / `build.worker.id`;
- `containerDigest` ← `container.api.configDigest` / `container.worker.configDigest`
  (hash canônico de `docker inspect ...{{json .Config}}`);
- `migrationDigest` ← `migration.digest`;
- `policyVersion`/`policyDigest` ← `policy.digest`;
- `sbomDigest` ← `sbom.digest`.

A geração em `scripts/phase11-certify.mjs` continua com esses campos nulos
(não foi editada — fora do escopo autorizado); o lead precisa ligar o gerador a
`AUD19-11-digests.json` ou aos mesmos cálculos no momento do re-selo AUD19-12.

## 8. Riscos e limitações

- **Produção continua `NO_GO`:** o guard torna a vertical executável, mas a atestação
  externa assinada e a runtime attestation seguem obrigatórias e não existem.
- O smoke usa `NODE_ENV=test` (perfil kernel durável e efeitos desligados). O perfil
  `production` completo é exercitado apenas no negativo de fail-closed da imagem.
- "Zero efeito externo" é provado por composição (`controlled_outbound_suppressed`,
  `externalEffects=false`, `effect_journal` vazio), não por captura de tráfego; não há
  adapter de provider no binário composto.
- O healthcheck do worker depende do arquivo de prontidão; o endpoint HTTP opcional não
  foi validado em container (apenas em teste unitário, em porta efêmera loopback).
- `tsx` permanece no runtime por necessidade do build atual (contrato §6 permite com
  justificativa explícita registrada no Dockerfile).
- Imagens são locais e não assinadas (sem SBOM embutido no artefato, sem signature);
  assinatura/attestation de imagem pertence ao fluxo de release.
