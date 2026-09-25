# SPEC AUD20-04 — retenção inbound em lotes e tombstone

## Estado e autoridade

- task: `AUD20-04`
- fase: `BUILD` local controlado, com auditoria posterior
- dependência: G0 de `aud20_01_baseline_contract_20260920.md`
- escopo: PostgreSQL descartável, tenants e holds sintéticos, sem dados reais
- produção/staging: `NO_GO`
- autorização: somente código, migrations aditivas, testes e evidência local;
  nenhum commit, push, deploy, publicação, integração externa ou efeito real

Esta SPEC amplia a baseline somente nos pontos de lote, concorrência,
semântica de auditoria e rollout seguro exigidos pelo backlog 0337. Não altera
o significado de retenção aprovado nem cria autorização para purge destrutivo.

## Resultado observável

O sweep de retenção processa candidatos em lotes pequenos, ordenados e
concorrentes, com uma transação por lote. Cada lote é selecionado por identidade
estável, usa `FOR UPDATE SKIP LOCKED`, respeita legal hold e tenant context,
aplica uma mutação set-based e grava seu ledger somente dentro da mesma
transação. Uma interrupção ou falha do ledger perde apenas o lote corrente;
reexecução retoma pelos candidatos ainda elegíveis e converge sem duplicar
efeito.

Inbound expirado não é apagado fisicamente: sua chave primária permanece com
um digest SHA-256 de `(tenant_id, key)` e `tombstoned_at`. Replay tardio não
recria conversa, mensagem ou outbox; falha fechado no limite de persistência.

## Contrato técnico congelado

1. `batchSize` é inteiro seguro entre 1 e 1000; o default controlado é 100.
   `maxBatches` é inteiro entre 1 e 1000; o default controlado é 100. Se o
   limite for alcançado, o relatório informa `complete=false` e a próxima
   execução é o checkpoint operacional. Não existe SELECT ou UPDATE sem
   limite para uma mutação de retenção.
2. A seleção usa o catálogo fechado de tabelas/colunas, janela `[windowStart,
cutoff)`, `ORDER BY idColumn ASC`, `LIMIT batchSize` e
   `FOR UPDATE SKIP LOCKED`. A política de concorrência é explícita e não
   espera indefinidamente por outro sweeper.
3. Cada lote executa seleção, mutação e ledger na mesma transação. O runner
   aceita limites de `lock_timeout` e `statement_timeout`; timeout aborta a
   transação e não cria receipt de sucesso. Holds são lidos novamente por
   lote, para que um hold criado entre lotes proteja os candidatos seguintes.
4. A mutação é set-based por conjunto de IDs. `deletedCount` conta somente
   `DELETE` físico; `tombstonedCount` conta somente transições de identidade
   para tombstone. O ledger e o relatório expõem os dois campos.
5. O ledger é metadata-only e candidate-bound. Logs de execução e resultados
   brutos devem ser fechados antes de receipts/manifests; qualquer write
   posterior invalida evidência dependente.
6. A migration é additive e checksum-guarded. A migration já aplicada não é
   editada para corrigir rollout: qualquer mudança posterior usa migration de
   forward-fix. O runner pode repetir uma migration aplicada somente quando o
   checksum permanece igual.
7. O caminho inbound reconhece tombstone/violação de identidade como rejeição
   controlada antes de criar qualquer novo recurso. Tenant, chave e digest
   permanecem opacos e não entram em logs de conteúdo.

## Critérios de aceite e negativos

| ID           | Critério requerido                                                         | Evidência mínima                                                            |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| AUD20-04-C01 | migration aditiva, checksum e shape do tombstone                           | migration smoke + checksum/query de constraint                              |
| AUD20-04-C02 | mais de um lote, ordem estável e limite observável                         | teste PostgreSQL com lote pequeno e contagem de batches                     |
| AUD20-04-C03 | dois sweepers não duplicam nem cruzam tenant/hold                          | duas conexões/tenants, `SKIP LOCKED`, invariantes persistidas               |
| AUD20-04-C04 | restart entre lotes converge; ledger failure faz rollback do lote corrente | relatório de restart e rollback                                             |
| AUD20-04-C05 | replay tardio não recria processamento e conta tombstone separadamente     | matriz inbound TTL/replay + `deletedCount=0`, `tombstonedCount>0`           |
| AUD20-04-C06 | timeout/lock é limitado e falha sem receipt falso                          | probes com lock concorrente (`lock_timeout`) e falha de `statement_timeout` |
| AUD20-04-C07 | regressão de retenção, typecheck, lint e migration runner não regride      | comandos executados sob Node 22.23.2                                        |

Negativos obrigatórios: `AUD20-N05` (late replay), múltiplos lotes,
concorrência, crash/restart, hold, tenant cruzado, ledger failure,
timeout/lock excedido e alteração de log após receipt. Qualquer falha de
tenant isolation, replay, hold, rollback ou lock bounded bloqueia G1R.

## Change surface e rollback

Paths de produto autorizados: `packages/persistence/src/retention.ts`,
`packages/persistence/src/postgres/migrations.ts`,
`packages/persistence/migrations/**`,
`packages/agent-core/src/commands/receive-inbound-message.ts`,
`packages/persistence/src/__tests__/retention-postgres.test.ts` e testes
`*idempotency*`. SPEC/evidência e os registros operacionais obrigatórios podem
ser atualizados na mesma rodada.

Rollback local: reverter somente a fatia de código/teste incompatível,
preservando o histórico e os receipts inválidos. Para schema já aplicado,
usar forward-fix aditivo; nunca remover colunas, apagar tombstones ou
reintroduzir purge destrutivo.

## Limitações conhecidas

O teste local usa PostgreSQL descartável e não prova volume de produção,
backup/restore físico, RPO/RTO, provider, canal, IdP, RAG, staging real ou
sign-off humano. Esses gates permanecem bloqueados e não são simulados.
