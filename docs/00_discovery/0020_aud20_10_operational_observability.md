# Discovery AUD20-10 — fechar o ciclo de observabilidade

## Trigger e problema

O usuário determinou avançar da `AUD20-17`, que fica adiada sem claim de
conclusão, para a próxima task do DAG: `AUD20-10` (F10).

O repositório já possui telemetry, collector redigido, regras de alerta,
runbooks e exercício sintético. Porém os entrypoints reais não formam um ciclo
operacional: a API escreve JSON diretamente, o worker usa o sink JSON por
default, `approval_latency_ms` só é injetada pelo exercício e não há prova
conectada de emissão, export, avaliação, entrega e fechamento do alerta.

## Evidência observada

- `packages/observability/src/collector.ts`: collectors in-process, arquivo e
  OTLP-shaped, com allowlist/redaction;
- `apps/api/src/main.ts`: logger JSON, sem collector configurado;
- `apps/worker/src/main.ts`: `createJsonWorkerTelemetry`, sem sink controlado
  configurável no entrypoint;
- `observability-exercise.ts`: injeta `approval_latency_ms` artificialmente e
  declara ausência de collector/dashboard/pager externo;
- regras e oito runbooks existem, mas owner/SLO permanecem
  `PROPOSED_NOT_APPROVED`.

## Resultado, atores e guardrails

Operadores devem conseguir observar um fluxo sintético real do runtime,
correlacionar API/worker, detectar falha, receber uma entrega local auditável e
registrar fechamento com timestamps. A métrica de latência deve nascer da
transição real de approval, não de amostra fabricada.

Guardrails: dados sintéticos; sink local explícito e redigido; nenhum pager,
SaaS ou credencial; owner e SLO continuam pendentes de autoridade humana;
staging/produção `NO_GO`.

## Recomendação

`DISCOVERY_READY`: seguir para PRD/SPEC de wiring local fail-closed, métrica
real, entrega local de alerta e exercício correlacionado. A ausência de
owner/SLO não bloqueia a construção técnica local, mas impede conclusão
operacional externa e qualquer release claim.
