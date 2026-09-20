# AUD19-09 — métricas, traces, alertas e SLOs (evidência)

- Programa: `AUD19-REM` · Task: `AUD19-09` · Gate: `G4`
- Status desta rodada: entrega local controlada, SLOs `PROPOSED_NOT_APPROVED`
- Escopo: execução local com dados sintéticos. Sem produção, provider, canal,
  RAG institucional, dado real ou efeito externo. Nenhum commit/push/deploy.

## Entregáveis

| Entregável | Caminho |
| --- | --- |
| Contrato de collector + adapters | `packages/observability/src/collector.ts` |
| Regras de alerta executáveis | `packages/observability/src/alerts.ts` |
| Exercício sintético determinístico | `packages/observability/src/observability-exercise.ts` |
| Catálogo SLI/SLO (proposto) | `docs/04_audit/evidence/AUD19/AUD19-09-sli-slo.json` |
| Evidência do exercício | `docs/04_audit/evidence/AUD19/AUD19-09-observability-exercise.json` |
| Relatório de redaction | `docs/04_audit/evidence/AUD19/AUD19-09-redaction-report.json` |
| Runbooks (1 por alerta) | `docs/08_runtime/runbooks/` |
| Gerador do exercício | `scripts/aud19-09-observability-exercise.ts` |
| Testes | `packages/observability/src/__tests__/{collector,alerts,sli-slo-catalog,observability-exercise}.test.ts` |

## Contrato do collector

`ObservabilityCollectorPort` (`recordSpan`/`recordMetric`/`recordLog`/`flush`/
`redaction`/`close`) é implementado por três adapters:

- `InProcessCollector` — determinístico, em memória, usado por testes e evals.
- `createFileCollector` — JSONL, inerte a menos que `enabled === true`.
- `createOtlpJsonCollector` — payload OTLP/JSON com transporte injetado; não
  cria cliente de rede e não é chamado enquanto desabilitado.

O boundary sanitiza todo registro antes de qualquer sink: allowlist explícita de
chaves (`COLLECTOR_ATTRIBUTE_ALLOWLIST`), valores escalares curtos, nomes de
span/métrica/log validados e bloqueio do marcador sintético `SENSITIVE-*`.
Objetivos, payloads, prompts e texto livre são descartados e contabilizados em
`CollectorRedactionReport`.

## SLIs e SLOs propostos

O catálogo cobre os oito domínios exigidos: `queue`, `lease`, `approval`,
`uncertain`, `dlq`, `handoff`, `errors`, `cost`. Cada entrada registra unidade,
emissão, consulta e o alerta associado. Nenhum SLO foi aprovado:
`governance.sloStatus = PROPOSED_NOT_APPROVED`, `owner = null`,
`approvedBy/approvedAt = null`. `approval_latency_ms` está marcada como
`PROPOSED_INSTRUMENTATION` (ainda não emitida pelo runtime; o exercício injeta
amostras sintéticas).

## Alertas → runbooks

| Alerta | Severidade | Runbook |
| --- | --- | --- |
| `AUD19-09-ALERT-QUEUE-LAG` | P2 | `AUD19-09-ALERT-QUEUE-LAG.md` |
| `AUD19-09-ALERT-LEASE-CLAIM` | P1 | `AUD19-09-ALERT-LEASE-CLAIM.md` |
| `AUD19-09-ALERT-APPROVAL-LATENCY` | P1 | `AUD19-09-ALERT-APPROVAL-LATENCY.md` |
| `AUD19-09-ALERT-UNCERTAIN` | P1 | `AUD19-09-ALERT-UNCERTAIN.md` |
| `AUD19-09-ALERT-DLQ` | P1 | `AUD19-09-ALERT-DLQ.md` |
| `AUD19-09-ALERT-HANDOFF` | P2 | `AUD19-09-ALERT-HANDOFF.md` |
| `AUD19-09-ALERT-ERRORS` | P1 | `AUD19-09-ALERT-ERRORS.md` |
| `AUD19-09-ALERT-COST` | P2 | `AUD19-09-ALERT-COST.md` |

O teste `alerts.test.ts` falha se um alerta não tiver runbook, se o runbook não
citar o alerta, ou se citar um script `npm run`/`npx tsx scripts/...`
inexistente.

## Resultado do exercício sintético

Fluxo: webhook → outbox → claim com falha → DLQ → sweep `UNCERTAIN` →
replay do operador → efeito despachado.

- Detecção: 6 regras em `firing` (`QUEUE-LAG`, `LEASE-CLAIM`,
  `APPROVAL-LATENCY`, `UNCERTAIN`, `DLQ`, `COST`); `ERRORS` permaneceu `ok`
  (abaixo do limiar), provando ausência de falso positivo no cenário saudável.
- Correlação: 1 `traceId` e 1 `correlationId` em 5 hops, com
  `parentSpanId` do produtor preservado através do boundary API → worker.
- Recuperação: replay processado (`processedAfterReplay = 1`,
  `lagAfterReplay = 0`, efeito despachado com o mesmo `correlationId`); a
  avaliação sustentada (após a maior janela) não tem nenhuma regra em `firing`.
- Redação: `canaryHits = 0` nos exports dos coletores e nos três adapters
  (`in_process_worker_sink`, `file_jsonl`, `otlp_json_memory_transport`), com
  canários bloqueados e campos descartados contabilizados.

Reprodução:

```bash
npx tsx scripts/aud19-09-observability-exercise.ts --dry-run
npx tsx scripts/aud19-09-observability-exercise.ts
```

## Verificação

```bash
npx vitest run packages/observability --no-file-parallelism --maxWorkers=2
npm test
npx tsc -p tsconfig.typecheck.json --noEmit
npx eslint <arquivos alterados>
npx prettier --check <arquivos alterados>
npm run docs:check
```

Resultados: `packages/observability` 6 arquivos / 42 testes PASS; `npm test`
271 arquivos PASS e 12 SKIP, 1.924 testes PASS e 131 SKIP; typecheck, lint,
Prettier e `docs:check` (693 links, 548 JSONs) PASS.

## Riscos e limitações (handoff ao lead)

- Não há collector hospedado, dashboard, pager ou entrega externa; o export é
  in-process ou arquivo opt-in. A prova é local e determinística.
- SLOs e thresholds continuam `PROPOSED_NOT_APPROVED`; é necessária a
  designação de um owner operacional para aprovar objetivos e janelas.
- `approval_latency_ms` ainda não é emitida no caminho produtivo; requer
  instrumentação aprovada (o exercício injeta amostras).
- Custo não é atribuído por Goal/tenant; o SLI de custo é global no run.
- O sink JSON de stdout do worker continua sendo um canal de debug com redaction
  por padrão de chave; a via auditada é o collector
  (`createCollectorWorkerTelemetry`).
- RPO/RTO físico, entrega de alertas em produção e integração com o plantão
  permanecem fora do escopo e não são alegados.
