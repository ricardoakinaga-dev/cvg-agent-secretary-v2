# Auditoria integral do projeto — CVG Agent Secretary V2

Audit ID: `AUD-20260905-001_PROJECT_FULL_CURRENT`

Data: `2026-09-05`

Baseline: `HEAD 0674f0a60f64e6e4029496435bba5ac36800ca9d` mais a árvore de trabalho atual.

## Parecer executivo

| Síntese                                      |       Nota | Interpretação                                                                                                                |
| -------------------------------------------- | ---------: | ---------------------------------------------------------------------------------------------------------------------------- |
| Estado atual consolidado                     | **73/100** | Código executável e bem verificado no recorte controlado, mas com capacidades externas e operacionais ausentes.              |
| Maturidade técnica controlada                | **80/100** | Média dos itens controlados, excluindo RAG institucional não conectado, integrações reais e prontidão de produção.           |
| Completude da secretária para o produto real | **64/100** | Jornadas, drafts, handoff e agenda existem de forma controlada; cadastro, modelo, canal e agenda reais não estão conectados. |
| Prontidão para piloto/produção real          | **25/100** | `NO-GO`: faltam gates externos, operação contínua e autorização humana.                                                      |

Veredicto: `CONDITIONAL_PASS_CONTROLLED_NO_GO_EXTERNAL`.

Não há falha P0/P1/P2 observada no slice R7 de redaction, ack, migration e bridge PostgreSQL; há, porém, blockers de produto e operação que impedem produção. As notas são julgamentos técnicos de maturidade, não percentuais de testes, probabilidade de segurança ou autorização de release. Um blocker de produção não é compensado por uma média alta no código controlado.

## Escopo, método e limites

Foram analisados API, worker, agent-core, platform/control plane, workflows, policy, tools, adapters, RAG, persistência, migrations/RLS, segurança HTTP, UI web, CI, documentação e operação. O exame combinou inspeção de código conectado, execução das suítes atuais, PostgreSQL local descartável, E2E de navegador e inspeção visual dos snapshots em 375/768/1440 px.

Esta é uma auditoria read-only e autoexecutada. O crítico fresh-context R7 existente foi considerado apenas para os boundaries que ele cobriu; ele não é uma revisão independente deste projeto inteiro. Não houve dados reais, provider, canal, IdP, RAG institucional, deploy, broker externo ou efeito clínico/financeiro.

Escala usada:

- `85–100`: forte e comprovado no escopo declarado;
- `70–84`: funcional, com limitações relevantes;
- `50–69`: parcial, utilizável apenas com ressalvas;
- `0–49`: ausente, stub, não conectado ou sem evidência suficiente.

## Notas por item analisado

| Item                                      | Nota /100 | Estado                   | Evidência e justificativa                                                                                                                                                    |
| ----------------------------------------- | --------: | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura e separação de módulos        |    **86** | Forte controlado         | Monorepo separa API, web, worker e packages de domínio; o `server.ts` concentra 5.239 linhas, elevando o custo de manutenção.                                                |
| Runtime do agente e autonomia             |    **67** | Parcial                  | O núcleo pode ser chamado por API ou em processo, mas não age sozinho; o worker atual faz drain bounded/run-once e o modelo é determinístico.                                |
| Cobertura funcional da secretária         |    **64** | Parcial                  | Conversa, sessão, handoff, tarefas e drafts funcionam em fixtures; cadastro, agenda e operação externa não completam o PRD original.                                         |
| API e contratos HTTP                      |    **86** | Forte controlado         | Rotas, schemas, envelopes, limites, erros, paginação e correlation ID foram compilados e exercitados.                                                                        |
| Webhook e entrada inbound                 |    **86** | Forte controlado         | HMAC, janela temporal, replay, SHA-256 de idempotência e deduplicação possuem testes; não há provedor real.                                                                  |
| Worker, outbox e processamento assíncrono |    **70** | Parcial controlado       | Lease, retry, quarantine, ack at-least-once e bridge PostgreSQL passaram; não existe consumidor distribuído contínuo/HA.                                                     |
| Persistência, migrations e RLS            |    **91** | Forte controlado         | PostgreSQL local descartável passou em 10 arquivos/82 testes; migration 0011, isolamento e recuperação foram exercitados.                                                    |
| Isolamento multi-tenant                   |    **89** | Forte controlado         | Repositórios tenant-scoped, RLS, binding de agente/versão e testes de isolamento; o binding operacional de identidade ainda é externo.                                       |
| Autenticação e RBAC                       |    **83** | Controlado com ressalvas | Resolver confiável, token HMAC, papéis e permissões existem; a UI usa headers controlados e não substitui IdP/SSO real.                                                      |
| Segurança HTTP e dependências             |    **84** | Forte controlado         | CORS, CSP, HSTS, HTTPS, limites de body/target, rate limit e `npm audit` sem vulnerabilidades atuais; não é pentest nem prova de host/edge.                                  |
| Privacidade e redaction                   |    **92** | Forte controlado         | Sanitização compartilhada de outbox, traces, erros e payloads evita strings livres, números desconhecidos, segredos e identificadores externos em claro.                     |
| Safety, approval e handoff                |    **90** | Forte controlado         | Preflight com 10 casos, risco composto, bloqueio de ações reais, gateway e takeover fail-closed; os casos são sintéticos e não constituem validação clínica.                 |
| RAG e conhecimento institucional          |    **47** | Não conectado            | Há catálogo/versionamento local e handoff sem fonte; não há ingestão, embeddings, recuperação vetorial ou fonte institucional aprovada.                                      |
| Tools e workflows de negócio              |    **62** | Parcial                  | Jornadas persistem drafts, candidatos, slots sintéticos e tarefas; buscas e agenda real/HIS continuam fora do runtime.                                                       |
| Provider, canais e delivery externos      |    **18** | Não conectado            | O registry executável aceita apenas `fake/deterministic-v1`; adapters e delivery são controlados/fake e `externalCall` permanece falso.                                      |
| Observabilidade e auditoria               |    **83** | Forte controlado         | Trace parental, audit events, checkpoints, correlação e métricas process-local estão presentes; faltam agregação, alertas e retenção operacional.                            |
| Confiabilidade, recuperação e performance |    **61** | Evidência limitada       | Outbox possui lease/retry/recovery; p95 de 45/420 ms foi medido em fixtures, sem carga real, HA, restore ensaiado ou RPO/RTO aprovados.                                      |
| Testes e verificação                      |    **92** | Forte controlado         | 152 arquivos/657 testes passaram; PostgreSQL 10/82; E2E 6/6; coverage 85,51/81,02/91,10/86,41. Há 3 arquivos/25 testes omitidos e exclusões explícitas no denominador.       |
| UX e qualidade visual                     |    **83** | Boa controlada           | Shell responsiva e Control Center foram observados em 375/768/1440 px; estados são claros, mas a validação cobre principalmente fixtures/empty states e uma console técnica. |
| Acessibilidade                            |    **78** | Parcial                  | Labels, landmarks, skip link, foco visível e tamanhos mínimos passaram; não houve auditoria WCAG/axe completa nem estudo com operador.                                       |
| Documentação e governança                 |    **74** | Parcial                  | Há Discovery/PRD/SPEC, runbooks, backlog e evidências; ainda existem seções históricas com estados/contagens/caminhos divergentes.                                           |
| CI, release e deploy                      |    **68** | Parcial                  | Workflow GitHub cobre gates locais, PostgreSQL e E2E; não há imagem/container/deploy operacional, e a árvore está suja: 101 modificados, 86 não rastreados e 1 deletado.     |
| Prontidão para produção/piloto            |    **25** | `NO-GO`                  | Identidade, provider, canal, fonte institucional, signoff humano e RPO/RTO seguem não aprovados; o worker PostgreSQL controlado recusa `NODE_ENV=production`.                |

## Achados principais

### AUD-20260905-F01 — Caminho de produção não está operacional

- Esperado: API, worker, provider, canal e identidade aprovados formarem um caminho executável para piloto controlado.
- Observado: `createPostgresControlledWorker` rejeita produção; o único modelo executável é fake/determinístico; adapters e delivery não produzem efeito externo; RAG real não existe.
- Impacto: o sistema não pode atender usuários reais nem concluir o ciclo resposta→canal.
- Risco/prioridade: alto, `P1` de release, blast radius global do piloto.
- Evidência: [worker PostgreSQL](../../apps/worker/src/postgres-controlled.ts:36), [modelo controlado](../../packages/platform/src/model-provider.ts:4), [adapter fake](../../packages/adapters/src/fake/fake-whatsapp-adapter.ts:6), [dossiê R7](0553_rem0539_r7_final_dossier.md).
- Rota: decisão de produto/Discovery, PRD/SPEC de integrações e gates externos antes de BUILD.

### AUD-20260905-F02 — Worker é bounded/run-once, sem operação contínua

- Observado: a entrada principal executa `drain` limitado e registra `runOnce: true`; não há loop de consumo, broker distribuído, escalonamento, HA ou alerta de backlog.
- Impacto: mensagens persistidas podem permanecer pendentes se nenhum processo for agendado/reiniciado corretamente.
- Risco/prioridade: alto, `P1` operacional antes de piloto.
- Evidência: [entrypoint do worker](../../apps/worker/src/main.ts:89), [contrato bounded](../../apps/worker/src/controlled-worker.ts:65), [runbook operacional](../platform/operations-runbook.md:51).
- Rota: SPEC de operação distribuída, seguida de BUILD e ensaio de crash/restart.

### AUD-20260905-F03 — Jornadas reais e RAG institucional continuam ausentes

- Observado: o catálogo de knowledge local faz matching controlado por texto e retorna handoff quando não encontra fonte; não há ingestão ou recuperação institucional. Tools de tutor/paciente/slot trabalham com drafts e fixtures.
- Impacto: o produto não pode responder RAG institucional nem realizar cadastro/agenda real com segurança autorizada.
- Risco/prioridade: alto para completude, `P1` de produto antes de operação real.
- Evidência: [knowledge controlado](../../packages/rag/src/institutional-rag.ts:23), [workflow institucional](../../packages/workflows/src/institutional/institutional-question-workflow.ts:1), [jornada controlada](../../apps/web/src/features/journeys/index.tsx:225).
- Rota: PRD/SPEC próprios para fonte, proprietário, retenção, integração e aprovação; não habilitar por configuração.

### AUD-20260905-F04 — Operação real não foi demonstrada

- Ausências confirmadas: carga com metas de p95, restore/backup ensaiado, RPO/RTO aprovados, HA, alerting, retenção/purge operacional, IdP, provider, canal e deploy.
- Impacto: não há base para prometer disponibilidade, recuperação, latência de produção ou governança de dados reais.
- Risco/prioridade: alto, `P1` operacional/compliance.
- Evidência: [runbook operacional](../platform/operations-runbook.md:24), [limites R7](0553_rem0539_r7_final_dossier.md), [evidência R7](0552_rem0539_r7_revalidation_evidence.json).
- Rota: obter RF-011, owners, metas e signoffs; então repetir qualificação em ambiente autorizado.

### AUD-20260905-F05 — Higiene de release e documentação ainda têm drift

- Observado: o checkout auditado não é um candidato limpo — 101 arquivos modificados, 86 não rastreados e 1 deletado. O histórico documental preserva seções antigas com contagens, estados e caminhos que não são a autoridade atual.
- Impacto: aumenta o risco de empacotar artefato incompleto ou interpretar evidência histórica como estado vigente.
- Risco/prioridade: médio, `P2` de governança.
- Evidência: inspeção `git status --short`; [runtime state](../99_runtime_state.md), [backlog](../30_backlog_master.md) e [revisão documental histórica](0539_documentation_implementation_review.md).
- Rota: consolidar uma revisão de release em branch/commit limpo, marcar históricos e rodar o gate de release candidato.

### AUD-20260905-F06 — Evidência de cobertura não equivale a cobertura de produção

- Observado: 3 arquivos/25 testes são omitidos na suíte geral; coverage exclui web, entrypoints e parte dos adapters PostgreSQL; a execução local usa Node 24.20.0, enquanto CI declara Node 22. Não houve axe/WCAG formal nem operador real.
- Impacto: limita a confiança em bootstrap, browser completo, compatibilidade de runtime e acessibilidade.
- Risco/prioridade: médio, `P2` de evidência.
- Rota: repetir em Node 22/CI, definir matriz de skips, complementar testes de boundary e executar avaliação acessível/operacional aprovada.

### AUD-20260905-F07 — Generalização semântica do safety não está provada

- Observado: os casos compostos conhecidos de risco passaram no preflight R7, mas a classificação base ainda é lexical e a barreira é uma matriz finita de fixtures; isso não prova comportamento para linguagem natural aberta, negações e variações não cobertas.
- Impacto: não é seguro extrapolar a nota controlada para triagem clínica ou operação real.
- Risco/prioridade: alto, `P1` de segurança de produto antes de qualquer uso clínico.
- Evidência: [classificador de intenção](../../packages/workflows/src/intent/intent-workflow.ts:3), [preflight](../../packages/platform/src/critical-safety-preflight.ts:55), [testes do preflight](../../packages/platform/src/__tests__/critical-safety-preflight.test.ts:132).
- Rota: Discovery/PRD/SPEC de cobertura semântica, conjunto adversarial aprovado e validação humana especializada.

## Verificações executadas

| Verificação                                                     | Resultado observado                                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                             | PASS                                                                                                |
| `npm run lint`                                                  | PASS                                                                                                |
| `npm run format:check`                                          | PASS                                                                                                |
| `npm run build`                                                 | PASS; Vite transformou 159 módulos                                                                  |
| `npm run readiness`                                             | PASS; 1 arquivo/4 testes                                                                            |
| `npm run audit:security`                                        | PASS; 0 vulnerabilidades reportadas                                                                 |
| `npm run test:worker:startup`                                   | PASS; falha sem adapter e smoke controlado positivo                                                 |
| `npm test -- --reporter=dot`                                    | PASS; 152 arquivos, 657 testes; 3 arquivos/25 testes omitidos                                       |
| `TEST_DATABASE_URL=... npm run test:postgres -- --reporter=dot` | PASS controlado; 10 arquivos/82 testes, sem skips, PostgreSQL local descartável                     |
| `npm run test:coverage -- --reporter=dot`                       | PASS; statements 85,51%, branches 81,02%, functions 91,10%, lines 86,41%                            |
| `CVG_WEB_PORT=4201 CVG_API_PORT=3196 npm run test:e2e`          | PASS; 6 testes, incluindo segurança HTTP, pinning, checkpoint, Control Center e visual 375/768/1440 |
| `git diff --check`                                              | PASS                                                                                                |

## Decisão e próxima ação

O projeto está tecnicamente utilizável para construção, demonstração e qualificação controlada com fixtures e PostgreSQL descartável. Não está pronto para piloto real, produção irrestrita ou ação sensível.

Próxima ação única: obter e registrar RF-011, identidade/provider/canal/fonte institucional, signoff humano e RPO/RTO; depois repetir a qualificação em um ambiente aprovado. Não iniciar integração real apenas com base nas notas acima.
