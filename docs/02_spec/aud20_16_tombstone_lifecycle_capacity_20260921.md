# SPEC AUD20-16 — lifecycle, capacidade e minimização de tombstones

## Estado e autoridade

- programa: `AUD20-REM`
- task: `AUD20-16`
- fase: `SPEC -> BUILD`; BUILD local controlado autorizado
- status: `IN_PROGRESS`
- pedido de decisão: `aud20_16_human_decision_request_20260921.md`
- dependência: `AUD20-04` `COMPLETED` somente em `CONTROLLED_LOCAL`
- achados: `F12` (lifecycle/capacidade) e `F13` (minimização)
- fontes de discovery: auditoria 0568 §F12/F13 e `0090_discovery_validation.md`
- fontes de PRD/decisão: `0090_prd_validation.md`, `aud20_01_baseline_contract_20260920.md`
  e decisão `D05-3/4` do packet de dados
- escopo: PostgreSQL descartável, fixtures sintéticas, documentação, migrations
  aditivas e testes locais; sem dados reais, egress, staging real ou produção
- policy version: `AUD20-16-LIFECYCLE-v1`
- decisão humana: `AUD20-16-human-decision-20260922.json`, SHA-256
  `d9d6a0345614b4310c3ce9a8b3ea336b4030b7589c16bf56a2f7662fcd29e840`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD` confirmado para BUILD local desta
  policy; uma mudança material ou expiração exige nova aprovação humana

Esta SPEC aplica a decisão humana de `2026-09-22`: inbound ativo com TTL de 30
dias; tombstone preservado por 30 dias corridos adicionais para todos os
tenants e replay inbound; estado `UNCERTAIN` nunca expira automaticamente.
Ricardo, no papel de Engineering Owner, revisa mensalmente e após os gatilhos
aprovados e pode aprovar ou rejeitar somente roll-forward de capacidade.
Nenhuma política de arquivo/compactação pode reduzir esse horizonte.

## Problema e resultado observável

`AUD20-04` preserva a identidade `(tenant_id, key)` após o TTL, mas ainda não
define por quanto tempo a identidade deve existir, como o custo cresce, quando
uma partição/arquivo é necessário ou quais dados podem ser minimizados. O
resultado de `AUD20-16` deve ser uma política versionada e mensurável que:

1. mantenha a rejeição de replay durante todo o horizonte de deduplicação;
2. classifique cada campo do registro ativo e do tombstone por necessidade,
   sensibilidade e retenção;
3. produza um modelo de capacidade calibrado por `pg_column_size` e tamanho de
   índices, não por estimativa textual;
4. defina gatilhos, owner, revisão e roll-forward para particionamento/arquivo;
5. prove mixed-version, longo horizonte sintético e recovery sem reabrir replay.

## Decisão preservada e opções condicionais

| Item                 | Baseline atual                                                            | Opções que podem ser avaliadas localmente                                       | Gate                                                               |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| TTL de inbound ativo | 30 dias                                                                   | não reduzir sem nova decisão                                                    | aprovado em `D05-3/4`                                              |
| Tombstone pós-TTL    | 30 dias corridos adicionais, todos os tenants e replay inbound            | retenção direta; partição consultável; arquivo consultável e fail-closed        | policy v1 aprovada; nova decisão para reduzir ou mudar privacidade |
| `UNCERTAIN`          | nunca expira automaticamente                                              | somente reconciliação/owner explícito                                           | não pode virar purge automático                                    |
| `resource_id`        | usado na reserva ativa; não é necessário para rejeitar replay tombstonado | nulificação/redação aditiva após prova mixed-version; marcador opaco temporário | SPEC + teste; aprovação se alterar contrato externo                |
| `tenant_id` + `key`  | identidade única necessária ao conflito inbound                           | índice/arquivo pseudonimizado somente se a unicidade continuar provada          | não trocar por digest isolado                                      |

Nenhuma opção de compactação ou expiração pós-tombstone pode reduzir os 30 dias
aprovados. A decisão formal fechou a janela e o owner operacional; o BUILD local
controlado pode executar C04–C06, mantendo staging e produção `NO_GO`.

### Ferramenta neutra permitida antes da decisão

É permitido construir e testar um calculador offline de capacidade como
artefato de planejamento. Ele deve exigir `horizonDays` e `safetyFactor` no
input, rejeitar ausência ou valores inválidos, aceitar apenas medições
sintéticas e não escolher, persistir ou aplicar uma política. Isso não é BUILD
de schema/produto nem libera migration; serve apenas para tornar a decisão
posterior mensurável.

## Classificação de dados e invariantes

| Campo              | Função                             | Classificação                                   | Regra de retenção/minimização                                                          |
| ------------------ | ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `tenant_id`        | isolamento e chave única           | identificador interno restrito                  | retido enquanto a identidade for consultável; nunca cruzar tenant                      |
| `key`              | conflito de idempotência inbound   | identificador derivado, potencialmente sensível | retido na tabela corrente enquanto necessário à unicidade; não entra em logs           |
| `tombstone_digest` | prova pseudônima de identidade     | derivado sensível                               | obrigatório no tombstone; SHA-256 tenant-scoped; não substitui sozinho a chave única   |
| `tombstoned_at`    | janela/lifecycle e particionamento | metadado operacional                            | obrigatório no tombstone; usado para cutoff, capacidade e revisão                      |
| `resource_id`      | vínculo do recurso processado      | referência operacional restrita                 | não necessário no replay tombstonado; minimizar somente com compatibilidade comprovada |
| `created_at`       | idade do inbound                   | metadado operacional                            | necessário para TTL ativo e capacidade; não é log de conteúdo                          |

Invariantes obrigatórias:

- um `(tenant_id, key)` produz no máximo uma identidade, ativa ou tombstonada;
- um tombstone tem digest válido, timestamp e nenhum caminho de replay que crie
  conversa, mensagem ou outbox;
- uma consulta/arquivo de tombstones deve responder `reject` ou `uncertain`
  fail-closed quando a fonte está indisponível; nunca responder “ausente” por
  timeout;
- compactação nunca remove a última cópia consultável antes do fim do horizonte
  aprovado;
- dados de conteúdo, payload bruto, credenciais e PII não entram no modelo de
  capacidade nem em logs de retenção.

## Modelo de capacidade

O runbook deve calcular, por tenant e globalmente:

```text
rows_tombstoned_per_day = inbound_rows_per_day * eligible_rate
bytes_row = p50/p95(pg_column_size(row))
bytes_index = measured_index_bytes / measured_tombstone_rows
daily_growth = rows_tombstoned_per_day * (bytes_row + bytes_index)
projected_bytes(horizon) = daily_growth * horizon_days * safety_factor
```

O ensaio sintético deve medir `pg_relation_size`, `pg_indexes_size`,
`pg_total_relation_size`, contagem de tombstones, p50/p95 de tamanho e duração
do sweep em pelo menos três volumes (pequeno, médio e limite operacional). O
modelo deve registrar `safety_factor`, unidade, timestamp, Node/PostgreSQL e
fixtures; não pode usar dados reais.

Gatilhos de revisão aprovados para o Engineering Owner:

- crescimento diário acima de 80% da previsão por duas janelas;
- índice ou tabela acima de 70% da capacidade local reservada;
- p95 de retenção ou replay acima do SLO documentado;
- horizonte de replay, contrato de canal ou classificação de `key` alterado;
- falha de recovery/arquivo ou consulta fail-closed.

## Lifecycle e compatibilidade mixed-version

O rollout deve ser expand/forward-only:

1. expandir colunas/índices de forma aditiva, sem apagar tombstones;
2. executar writers/readers compatíveis com campos ausentes e valores legados;
3. provar que writer antigo não transforma tombstone em delete/replay e que
   reader antigo não trata `tombstoned_at` como reserva nova;
4. somente depois habilitar minimização de `resource_id` ou arquivo;
5. manter recovery por roll-forward e reter a última fonte consultável durante
   todo o horizonte de replay.

Se a nulificação de `resource_id` exigir quebrar `NOT NULL` ou contrato de
leitura, a mudança deve ser uma migration aditiva separada, com janela,
owner e aprovação. Não usar `DELETE`, `TRUNCATE`, `DROP`, purge destrutivo ou
alteração da PK como mecanismo de minimização.

## Critérios de aceite e negativos

| ID           | Critério                                                                                                  | Evidência mínima                                          |
| ------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| AUD20-16-C01 | política versionada define TTL ativo, horizonte tombstone, `UNCERTAIN`, owner e review trigger            | policy map + decisão/pendência explícita                  |
| AUD20-16-C02 | `tenant_id`, `key`, digest, timestamps e `resource_id` são classificados e minimizados sem quebrar dedupe | data map + shape query + teste de replay                  |
| AUD20-16-C03 | capacidade é medida por volume e índice, com fórmula reproduzível e thresholds                            | runbook + log sintético + hashes                          |
| AUD20-16-C04 | arquivo/particionamento, se escolhido, continua consultável e fail-closed                                 | migration/adapter local + recovery/replay test            |
| AUD20-16-C05 | mixed-version expand/forward mantém rejeição de replay e não reintroduz delete                            | matriz old/new + PostgreSQL descartável                   |
| AUD20-16-C06 | horizonte longo sintético e recovery convergem sem duplicidade                                            | teste parametrizado + relatório de restart/restore lógico |
| AUD20-16-C07 | docs, owner, status, policy version e next action permanecem candidate-bound                              | docs-check semântico + receipt                            |

Negativos obrigatórios: tombstone expirado antes do horizonte, digest isolado
com colisão/cross-tenant, `resource_id` removido antes de mixed-version,
arquivo indisponível tratado como “ausente”, writer antigo reabrindo replay,
capacidade subestimada, policy sem owner/trigger e qualquer dado real em logs.

## Change surface e rollback

Antes do gate de BUILD, somente SPEC, backlog, runtime state, execution log,
evidência de planejamento e a ferramenta offline parametrizada de capacidade
podem mudar. Após aprovação, a allowlist candidata é:

- `packages/persistence/migrations/**` para mudanças aditivas;
- `packages/persistence/src/retention.ts` e repositórios apenas se o contrato
  exigir comportamento novo;
- testes PostgreSQL/unitários de retenção e idempotência;
- `scripts/aud20-16-capacity-model.mjs` e
  `tests/aud20-16-capacity-model.test.js` como tooling offline de planejamento;
- `docs/02_spec/**`, `docs/03_build/**` e evidência AUD20-16.

Rollback do código é reversível localmente; schema já aplicado usa
roll-forward. Nenhum rollback remove identidade tombstonada ou reduz a janela
sem decisão explícita.

## Gate de saída

`AUD20-16` só pode ser `COMPLETED` quando C01–C07 tiverem evidência fresca, os
negativos passarem, o modelo de capacidade for reproduzível e uma crítica
independente validar o pacote. Policy/owner/trigger estão decididos até
`2026-12-31T23:59:59-03:00`; até o restante fechar, staging e produção
permanecem `NO_GO` e `AUD20-05` não pode iniciar como BUILD de produto.
