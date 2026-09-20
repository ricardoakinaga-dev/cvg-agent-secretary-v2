# AUD19-14 — Dossiê de restore, RPO/RTO, rollback e piloto supervisionado

- Programa: `AUD19-REM`; task: `AUD19-14`; status: `BLOCKED`.
- Fonte: [auditoria 0566](../../0566_full_repository_gauntlet_audit_2026-09-19.md), [backlog 0332](../../../03_build/0332_aud20260919_backlog.md).
- Autoridade requerida: owner de infraestrutura + owner de operações + autorização de dados/ambiente para o piloto.
- Nenhum backup, restore, deploy ou piloto real foi executado.

## 1. Escopo e provas exigidas

| Prova                  | Como medir                                                                                          | Critério de aceite                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Restore íntegro        | `pg_basebackup`/snapshot + restore em infraestrutura isolada; validar papéis, RLS, migrations e outbox | integridade igual ao artefato de origem; sem perda    |
| RPO                    | intervalo entre último WAL/backup válido e o ponto de falha                                         | meta aprovada pelo owner (proposta histórica ≤5min)  |
| RTO                    | tempo entre declaração de falha e serviço pronto com os mesmos digests                              | meta aprovada pelo owner (proposta histórica ≤30min) |
| Rollback               | reverter para o release anterior com runbook executado e verificado                                 | serviço saudável e digests do rollback registrados   |
| Piloto supervisionado  | operar cenário representativo com humano em toda decisão sensível e critérios de interrupção        | relatório sem incidente crítico e com owners         |

## 2. Pré-condições de entrada

1. Autorização de ambiente, dados (sintéticos ou aprovados), janela e orçamento.
2. Candidato e artefatos congelados com digests; runbooks de incidente/rollback revisados.
3. Observabilidade ligada ao collector controlado (SLIs de AUD19-09) com alertas e plantão definidos.
4. Critérios de interrupção do piloto e canal de escalonamento aprovados.

## 3. Schema de evidência exigido

Aderente a `AUD19-13-15-external-evidence.schema.json`, com: `gateId`
(`rpoRto`/`rollback`/`pilot`), owner, ambiente, validade, `candidateDigest`,
`configDigest`, timestamps medidos, métricas observadas, logs redigidos,
digests dos artefatos de restore/rollback e parecer supervisionado.

## 4. Comandos dry-run (sem infraestrutura real)

```bash
node scripts/aud19-external-evidence-check.mjs --gate=rpoRto --attestation=<path> --expect=REJECT
node scripts/aud19-external-evidence-check.mjs --gate=rollback --attestation=<path> --expect=REJECT
node scripts/aud19-external-evidence-check.mjs --gate=pilot --attestation=<path> --expect=REJECT
```

## 5. Registro de bloqueio

- Causa: sem infraestrutura designada, sem autorização de dados/janela e sem owners nominais.
- Impacto: `rpoRto`, `rollback` e `pilot` permanecem `NOT_VALIDATED`; M6/G6 e M7 não fecham; produção `NO_GO`.
- Autoridade necessária: infraestrutura + operações + segurança/dados.
- Procedimento no ambiente autorizado: congelar workload/SLO, medir falha/restore/rollback no artefato exato, conduzir o piloto com humano em decisão sensível e anexar os artefatos ao pacote.
