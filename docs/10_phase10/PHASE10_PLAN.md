# PHASE 10 — PRODUCTION ASSURANCE & AGENT RUNTIME CLOSURE

## Plano de execução

| Campo     | Valor                                                              |
| --------- | ------------------------------------------------------------------ |
| Baseline  | `0d48cc80ca9b5f359255547c8482b3aae1f93ad7`                         |
| Escopo    | controlled construction (sem produção, sem dados reais)            |
| Decisão   | `CONDITIONAL_GO` / `AAA_CONTROLLED`                                |
| Evidência | `certification/phase10-result.json`, `certification/manifest.json` |

## Ondas

| Onda  | Entrega                                                                   | Evidência                                                             | Status |
| ----- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| 10.0  | Baseline mecânico das 11 suítes existentes                                | `certification/baseline.json`                                         | PASS   |
| 10.1  | `@cvg/model-gateway`: providers, routing, timeout, retry, breaker, budget | `packages/model-gateway` (30+ testes)                                 | PASS   |
| 10.2  | `@cvg/policy-engine`: capabilities, least privilege, deny-by-default      | `packages/policy-engine`                                              | PASS   |
| 10.3  | `@cvg/approval-engine`: binding SHA-256, single-use, expiração            | `packages/approval-engine`                                            | PASS   |
| 10.4  | `@cvg/channel-gateway`: envelope canônico, dedupe, interlock, SSRF        | `packages/channel-gateway`                                            | PASS   |
| 10.5  | Distributed safety: replay store TTL, idempotência, leases                | `packages/channel-gateway/idempotency.ts`, chaos CHAOS-01..16         | PASS   |
| 10.6  | `@cvg/observability`: OTel, trace context, redaction, audit hash chain    | `packages/observability`                                              | PASS   |
| 10.7  | `@cvg/agent-evals`: dataset 56 cenários + adversariais + regression gate  | `certification/agent-eval-report.json`                                | PASS   |
| 10.8  | `@cvg/chaos`: 16 cenários de failure injection                            | `certification/chaos-report.json`                                     | PASS   |
| 10.9  | Data classification, LGPD técnico, RAG governance                         | `packages/shared/data-classification.ts`                              | PASS   |
| 10.10 | Supply chain: CodeQL, gitleaks, SBOM CycloneDX, licenças, actions pinadas | `.github/workflows/security.yml`, `certification/sbom.cyclonedx.json` | PASS   |
| 10.11 | Runtime: `/live`, `/ready`, graceful shutdown                             | `apps/api/src/readiness.ts`, `packages/shared/lifecycle.ts`           | PASS   |
| 10.12 | Canary/promoção: rings, shadow mode, supervised pilot documentados        | `PHASE10_ARCHITECTURE.md` §promoção, `runtime.shadowMode`             | PASS   |
| 10.13 | Certificação mecânica `npm run certify` + `npm run certification:verify`  | `certification/phase10-result.json`                                   | PASS   |

## Gates de release

`npm run certify` executa 16 gates: format, typecheck, lint, build, unit, coverage,
security, worker_startup, postgres, e2e, evals, chaos, load, restore, sbom,
licenses. O gate PostgreSQL é registrado como `NOT_EXECUTED` quando
`TEST_DATABASE_URL` não está disponível — nunca como PASS.

## Como reproduzir

```bash
npm ci --ignore-scripts
npm run certify            # gera certification/*.json
npm run certification:verify   # recomputa decisão e valida hashes
```
