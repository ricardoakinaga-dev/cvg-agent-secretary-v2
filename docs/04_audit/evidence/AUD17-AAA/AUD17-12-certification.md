# AUD17-12 — certificação candidate-bound final

Status da task: `COMPLETED_LOCAL_CONDITIONAL_GO`.

## Escopo e decisão

- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`;
- execução: `CONTROLLED_LOCAL`, somente dados sintéticos, adapters controlados e
  banco descartável;
- perfil solicitado: `STAGING`;
- perfil elegível: `STAGING` controlado;
- decisão: `CONDITIONAL_GO` para o perfil solicitado e `NO_GO` para produção;
- realData: `false`; realEffects: `false`; nenhum push, deploy, publicação,
  provider, canal, IdP, RAG institucional ou aprovação humana foi executado.

## Identidade do candidato

| Campo | Valor |
|---|---|
| certificationId | `phase11-4fdbd4821c7b2701-mu5iat94` |
| candidateId | `4fdbd4821c7b270174b9ea2445e4aa03b3a6d1aff1dbdff505e129cc56342375` |
| commit | `c24c7126646a088aa9cb2bc63deed6169d394260` |
| treeHash | `a97389be03c58c7ed2e6e91ba1a4ae6f8376d8fd40f5cf572b2ab86f7b75ba61` |
| arquivos no candidato | `999` |
| árvore | `dirty=false`, `untrackedFiles=[]` |
| Node | `22.23.2` |

Fonte canônica: `certification/current.json`,
`certification/phase11/manifest.json` e
`certification/phase11/phase11-result.json`.

## Gates executados

`PASS`: `prompt_integrity`, `format`, `typecheck`, `lint`, `build`, `unit`,
`coverage`, `security`, `supply_chain`, `worker_startup`, `e2e`, `evals`,
`chaos`, `load`, `recovery`, `bypass_audit`, `certification_self_test`,
`phase10_historical_verification`, `evidence_graph`, `candidate_clean`,
`node_target`, `verify`, `production_preflight`, `evidence_reports`,
`independent_critic`, `trace_lineage`, `governance_redteam`, `tenant_redteam`,
`certification_redteam`, `adversarial_proof`, `outbox_replay` e
`clone_verify`.

`postgres`: `PASS`; sob Node `22.23.2`, `TEST_DATABASE_URL` apontou para o
PostgreSQL descartável dedicado e a suíte terminou com 23 arquivos e 202
testes PASS, sem falhas. Os efeitos externos permaneceram desabilitados.

`PHASE11_FORMAL_CLOSURE`: `PASS`; `INV-007`, `INV-008`, `INV-009` e `INV-010`
passaram com a prova persistente. O `promotion:check` ainda retorna
`eligible=false` para produção, com `reason=production_assurance_incomplete`,
porque a decisão externa/humana não foi concedida.

## Métricas locais

- unidade: 255 arquivos PASS, 10 SKIP; 1792 testes PASS, 117 SKIP;
- coverage: 89.45% statements, 82.76% branches, 88.68% functions, 89.99%
  lines;
- E2E: 9 PASS;
- evals: 8 PASS, task success rate 0.9464, policy violation 0, unsafe action 0,
  adversarial pass 1;
- chaos: 18 PASS, 2 SKIP na suíte in-memory do certificador; os cenários
  PostgreSQL CHAOS-04/05 passaram na execução conectada da suíte PostgreSQL;
- load sintético in-memory: 10.000 eventos, 2 workers, 10.000 processados,
  perda 0, duplicatas 0, throughput 1.041,1/s;
- segurança: 0 vulnerabilidades; licenses `372` verificadas, `0` negadas.

## Verificações pós-selo

- `npm run certification:verify:phase11`: exit `0`, `status=PASS`,
  `failures=[]`;
- `npm run evidence:verify:phase11`: exit `0`, `status=PASS`,
  `failures=[]`;
- `npm run production:preflight -- --profile=PRODUCTION --expect=REJECT`:
  exit `0`, `status=PASS`, `actualStatus=FAIL`, `sideEffects=false`;
- `npm run promotion:check`: exit `1` esperado, `eligible=false`, sem efeito de
  produção.

## Findings e invariantes

`AUD-11-01..07` estão fechados no recorte local; `AUD-11-08` permanece
`PARTIAL/EXTERNAL`. O fechamento local não equivale a evidência de integração,
operação física ou decisão humana.

`INV-001..016` estão `PASS`. A razão para não promover produção não é uma
falha local: são os oito gates externos/humanos ainda
`NOT_VALIDATED`/`PENDING`.

## Fluxo sintético exercitado

Inbound sintético → outbox persistível/observável → worker → policy/approval →
effect journal/adaptador controlado → audit/read model. Foram cobertos HMAC
válido e inválido, isolamento cross-tenant, takeover/handoff humano,
crash/replay, `UNCERTAIN` e deduplicação. Não houve chamada externa nem efeito
clínico, financeiro, de prontuário ou de agenda real.

## Limitações e próximo gate

O PostgreSQL descartável prova CAS/RLS/fencing, migrations, outbox/replay e
restore lógico, mas não backup/restore físico, durabilidade de infraestrutura
ou RPO/RTO. Sem integrações autorizadas não há prova de provider, canal,
identidade externa ou RAG institucional; `pilot`, `rollback` e `humanSignoff`
permanecem `NOT_VALIDATED`/`PENDING`.

Próxima etapa: abrir, separadamente e em ambiente autorizado, `AUD17-13`
(integrações), `AUD17-14` (RPO/RTO físico, rollback e piloto) e `AUD17-15`
(revisão e signoff humano). Produção continua `NO_GO`.

## Crítica independente

Os pareceres frescos e a resposta às contraprovas estão em
[`AUD17-independent-critics-20260917.md`](AUD17-independent-critics-20260917.md).
O achado local de redaction de critérios foi corrigido em `7c5075d`; a lacuna
de campos de identidade no payload de auditoria foi corrigida em `3876b72` e
incluída neste selo. As lacunas de foco/detalhe por estado e de prova PostgreSQL
permanecem explicitamente limitadas, sem serem convertidas em PASS.
