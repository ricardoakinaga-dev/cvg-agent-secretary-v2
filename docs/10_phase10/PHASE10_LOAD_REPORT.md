# PHASE 10 — LOAD REPORT

Fonte mecânica: `certification/load-report.json`, gerado por
`npx tsx scripts/phase10-load.ts --events=10000`.

## Configuração

- 10.000 eventos sintéticos no contrato de outbox em memória, 2 workers.
- Escopo: medição do contrato do monólito modular, **não** um benchmark de
  produção (sem PostgreSQL, sem rede). Não declara SLA.

## Resultado

| Métrica       | Valor       |
| ------------- | ----------- |
| eventos       | 10.000      |
| processados   | 10.000      |
| perdas        | 0           |
| duplicações   | 0           |
| enqueue       | 1.035 ms    |
| drain         | 11.245 ms   |
| throughput    | 801,98 ev/s |
| latência p50  | 2,13 ms     |
| latência p95  | 3,73 ms     |
| latência p99  | 4,58 ms     |
| latência máx. | 9,02 ms     |

## Interpretação

O critério de correção (0 perda, 0 duplicação) passa. Números de latência e
throughput valem apenas para a camada em memória. A meta de 100k eventos fica
registrada no backlog para execução contra PostgreSQL em ambiente dedicado.

## Próximo passo mensurável

`npx tsx scripts/phase10-load.ts --events=100000` com PostgreSQL real, medindo
também conexões, queue depth, CPU e memória.
