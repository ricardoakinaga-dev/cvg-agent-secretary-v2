# SPEC AUD20-05 — attestation de recursos, grants e replay distribuído

## Estado, dependências e limite

- programa: `AUD20-REM`
- task: `AUD20-05`
- achado: `F07`
- fase: `AUDIT`
- status: `COMPLETED`
- dependência obrigatória: `AUD20-04` concluída em `CONTROLLED_LOCAL` e gate de
  `AUD20-16` fechado
- execução permitida nesta rodada: BUILD local controlado nas superfícies
  candidatas, PostgreSQL descartável e fixtures sintéticas
- ambiente: Node `22.23.2`, PostgreSQL descartável local e dados sintéticos;
  sem staging real, produção, egress, credencial real ou integração externa

Esta SPEC prepara o próximo BUILD sem iniciar `AUD20-05`. A opção A foi
selecionada pelo usuário como orientação de política para o desenho:
30 dias corridos após o TTL ativo, aplicável a todos os tenants e ao replay
inbound; `UNCERTAIN` não expira automaticamente; revisão mensal e revisão
extraordinária por crescimento acima de 80% da previsão, tabela/índice acima de
70% da reserva, p95 acima do SLO, mudança de horizonte/contrato/classificação ou
falha de recovery. A ação proposta é revisar capacidade e aprovar roll-forward,
sem purge destrutivo automático.

O gate foi satisfeito por `AUD20-16-LIFECYCLE-v1`, concluído localmente no
candidato `3f7a1731…`: owner, autoridade de revisão, validade e horizonte foram
formalizados e C01–C07 passaram. Isso libera apenas o BUILD local controlado de
`AUD20-05`; staging, produção e integrações externas permanecem `NO_GO`.

## Objetivo

Derivar e verificar a identidade, configuração, key-ring, referências de
segredo e grants do recurso realmente observado antes de o API/worker servir,
fazer bind ou produzir efeito. O replay distribuído deve operar somente sobre
o store PostgreSQL observado, com schema e privilégios compatíveis com o
contrato; indisponibilidade, divergência ou attestation expirada devem falhar
fechado.

## Topologia existente que a implementação deve respeitar

| Fronteira             | Fonte atual                                                                          | Observação para o BUILD                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attestation externa   | `scripts/lib/production-preflight-core.mjs`                                          | Já valida bytes do arquivo, SHA-256, JSON versionado, HMAC, ambiente, owner, validade, candidate digest, config digest e sinais. Nenhum booleano isolado é evidência.                 |
| Identidade confiável  | `apps/api/src/operator-identity.ts`, `packages/shared/src/auth.ts`                   | Token exige tenant, `kid` e key-ring ativo; keys revogadas ou fora da janela não autorizam. Segredos não podem aparecer em evidência.                                                 |
| Replay                | `apps/api/src/operator-replay-store.ts`, migration `0026_operator_replay_events.sql` | `claim` é UPSERT atômico; `assertReady` verifica a tabela; o BUILD deve acrescentar a prova explícita de grants/recursos observados sem fallback silencioso para memória em produção. |
| Composição API        | `apps/api/src/server.ts`, `apps/api/src/main.ts`                                     | O store é validado antes de `listen`; erro de startup deve ocorrer antes de bind e side effect.                                                                                       |
| Preflight worker      | `apps/worker/src/postgres-role-preflight.ts`, `apps/worker/src/main.ts`              | Role, schema, RLS, migrações, constraints, policies e privilégios mínimos devem continuar sendo comprovados antes do primeiro claim.                                                  |
| Evidência de produção | `scripts/production-preflight.mjs`                                                   | Continua read-only e sem conexão externa; qualquer prova de recurso precisa ser redigida, candidate-bound e localmente reproduzível.                                                  |

## Invariantes de contrato

1. A identidade do recurso é calculada a partir dos bytes/metadata observados
   pelo verificador, nunca aceita de um digest autodeclarado pelo próprio
   recurso.
2. O digest, ambiente, configuração, key-ring e referências de segredo usados
   no runtime pertencem ao mesmo candidato; recurso trocado, path trocado,
   configuração divergente ou candidate digest divergente falha fechado.
3. Uma attestation só é válida dentro de sua janela, ambiente e autoridade; uma
   attestation stale, expirada, revogada, com assinatura inválida ou com
   referência placeholder não autoriza startup.
4. O store escolhido para `CVG_OPERATOR_REPLAY_STORE=postgres` prova schema,
   tabela e grants necessários ao comportamento real: `SELECT`, `INSERT`,
   `UPDATE` e `DELETE` conforme as operações do adapter; privilégios de DDL,
   `TRUNCATE`, `TRIGGER`, `REFERENCES` e ownership continuam proibidos para a
   role de runtime.
5. O adapter distribuído nunca cai para memória quando o perfil é produção.
   Falha de conexão, schema, grant, relógio ou claim nega a requisição e não
   executa mutation/efeito.
6. O bootstrap falha antes de `listen`, bind, claim de worker, envio externo,
   escrita de outbox ou qualquer efeito sensível quando a prova não passa.
7. Logs e receipts contêm somente IDs redigidos, hashes, status e metadados
   sintéticos; não contêm DSN, key material, payload, PII ou segredo.

## Superfície candidata permitida após o gate

- `apps/api/src/operator-replay-store.ts`
- `apps/api/src/operator-identity.ts` e `apps/api/src/server.ts` somente para
  composição/preflight do contrato
- `apps/api/src/main.ts` e testes de startup/bind
- `apps/worker/src/postgres-role-preflight.ts` e `apps/worker/src/main.ts`
  somente para a barreira pré-claim
- `scripts/lib/production-preflight-core.mjs`,
  `scripts/production-preflight.mjs` e manifests/receipts candidate-bound
- `scripts/aud20-05-resource-attestation-check.mjs` e
  `tests/aud20-05-resource-attestation-check.test.js` como tooling offline;
  eles validam somente fixtures sintéticas e nunca são prova de runtime,
  grants PostgreSQL efetivos ou autorização de release
- `scripts/aud20-05-replay-grants-probe.mjs` e
  `tests/aud20-05-replay-grants-probe.test.js` como tooling local descartável;
  o probe aceita somente loopback, cria objetos sintéticos com nomes únicos,
  mede grants efetivos e remove o fixture, sem tocar schema do produto; seu
  resultado permanece `notRuntimeProof=true` e `releaseEligible=false`
- `packages/persistence/migrations/0026_operator_replay_events.sql` somente
  se uma alteração aditiva de grant/schema for demonstrada necessária; não
  alterar a PK nem remover dados
- `tests/production-preflight.test.js`, testes de identidade/replay/startup e
  testes PostgreSQL descartáveis
- `docs/02_spec/**`, `docs/03_build/**` e evidência própria de `AUD20-05`

O BUILD deve permanecer nessa superfície e começar por RED executável; nenhuma
autorização de release decorre do gate local.

## Critérios de aceite

| ID           | Critério                                                                                                                       | Evidência mínima                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| AUD20-05-C01 | recurso, bytes observados, config/key-ring/secret refs, ambiente e candidato são ligados por digest calculado pelo verificador | manifesto redigido + SHA-256 candidate-bound                                   |
| AUD20-05-C02 | attestation válida é aceita somente quando assinatura, validade, ambiente, owner/autoridade e candidate/config digest conferem | teste GREEN + receipt sem segredo                                              |
| AUD20-05-C03 | schema/tabela e grants CRUD do replay store são comprovados para a role efetiva                                                | PostgreSQL descartável com role mínima, query de grants e teste de claim/purge |
| AUD20-05-C04 | API e worker falham antes de bind/claim/side effect quando a prova é ausente ou inválida                                       | teste de startup com marcador de bind/mutation não acionado                    |
| AUD20-05-C05 | replay concorrente entre duas instâncias continua atomicamente rejeitado e falha de store nega                                 | teste PostgreSQL concorrente + teste de indisponibilidade                      |
| AUD20-05-C06 | evidência válida é redigida, reproduzível e ligada ao mesmo candidato dos artefatos                                            | raw log, manifesto, receipt e verificador separado                             |
| AUD20-05-C07 | rollback/desabilitação do adapter mantém fail-closed e não promove memória em produção                                         | teste negativo + relatório de rollback/roll-forward                            |

## RED/GREEN e negativos obrigatórios

O RED deve demonstrar a aceitação indevida ou a ausência de prova. O GREEN só
é válido com PostgreSQL descartável e fixtures sintéticas.

Negativos mínimos:

- digest informado pelo recurso diferente do digest dos bytes observados;
- attestation apontando para recurso trocado, path trocado ou candidato
  diferente;
- assinatura inválida, key-ring ausente, key revogada, referência de segredo
  placeholder, attestation stale ou expirada;
- schema ou tabela `operator_replay_events` ausente;
- cada grant CRUD ausente isoladamente, grant parcial e role sem `USAGE`;
- role dona da tabela, com `CREATE`, `TRUNCATE`, `TRIGGER`, `REFERENCES`,
  `DELETE` indevido além do contrato ou bypass de RLS;
- banco indisponível, timeout, falha de `assertReady` ou claim concorrente
  ambíguo;
- fallback para `memory` em produção;
- tentativa de `listen`, claim de worker, escrita de outbox ou efeito antes do
  preflight;
- log/receipt contendo DSN, segredo, payload, PII ou bytes não redigidos;
- artefato produzido por outro candidate/tree ou alterado depois do receipt.

## Plano de verificação

1. Fixar Node `22.23.2`, iniciar somente PostgreSQL descartável local e criar
   schema/roles/fixtures sintéticos com cleanup garantido.
2. Capturar logs de preflight, grants e comportamento concorrente antes de
   gerar qualquer receipt.
3. Executar focused unit/integração, testes PostgreSQL, produção preflight
   `--expect=REJECT` para negativos, lint, format, docs-check e diff-check.
4. Fechar writers, gerar manifesto/receipts candidate-bound e executar um
   verificador independente que reabra bytes, SHA, scope, candidate/tree e
   links dos comandos.
5. Submeter o pacote a crítica fresh-context. Ausência de ambiente, owner ou
   autoridade mantém o resultado `PASS_LIMITED`/`WAITING_HUMAN_APPROVAL`, não
   `COMPLETED`.

## Rollback, revogação e gate de saída

- Um adapter inválido é desabilitado por configuração controlada e falha
  fechado; não há fallback permissivo nem purge destrutivo.
- Migration já aplicada usa roll-forward; não usar `DROP`, `TRUNCATE`, remoção
  da PK ou exclusão de evidência como rollback.
- O BUILD foi liberado após a decisão formal e o fechamento local de
  `AUD20-16-LIFECYCLE-v1`; expiração ou mudança da política reabre o gate.
- Saída local de `AUD20-05`: C01–C07 PASS, negativos PASS, receipts íntegros,
  crítica independente fresca e `releaseEligible=false` fora de uma promoção
  explicitamente autorizada.

## Próxima ação executável

Iniciar DISCOVERY/PRD/SPEC de `AUD20-06`; preservar staging e produção
`NO_GO`. Qualquer mudança posterior nos bytes selados reabre o gate de
`AUD20-05`.
