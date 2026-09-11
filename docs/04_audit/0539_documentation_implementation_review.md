# Auditoria integral da documentação e implementação — 2026-09-05

Task: `AUD-DOC-001_FULL_DOCUMENTATION_IMPLEMENTATION_REVIEW` — **COMPLETED**.
Baseline auditado: `0674f0a60f64e6e4029496435bba5ac36800ca9d` (árvore inicialmente limpa).

## Parecer

**Nota geral: 69/100.** Existe uma plataforma controlada funcional e bem testada, com persistência PostgreSQL, configuração versionada de agentes, painel, Test Lab, approvals, auditoria e isolamento por tenant. A secretária operacional completa continua parcial: cadastro de tutor/pet e agenda são stubs, o modelo é determinístico, não há canal real nem RAG institucional, e worker/outbox não entregam processamento durável.

**Aderência funcional aos 39 RF originais: 61.4/100. Qualidade da plataforma no escopo controlado: 85/100. Prontidão para operação real: 25/100, com veredito NO-GO.** As notas medem coisas diferentes. Não são percentuais de tarefas concluídas, probabilidade de segurança ou autorização de release.

Há **um achado P1 de comportamento**: pedido de consulta junto com sinal de risco é classificado como agendamento de baixo risco e não solicita handoff. Há também **um achado P2 de segurança HTTP condicional**: confiança numérica no proxy permite que um header afirme HTTPS numa chamada direta à aplicação. Esses comportamentos estão reproduzidos. Um terceiro achado, AUD-F07 (P2), demonstra sobrescrita de decisão por snapshot obsoleto no repositório de approvals de atendimento. Nenhuma correção de produto foi feita nesta auditoria.

O antigo `CONTROLLED_MVP_READY: PASS` deve ser lido como histórico do escopo/testes anteriores. O parecer desta rodada é **AUDIT_COMPLETED_WITH_OPEN_FINDINGS**: os gates executáveis passam, mas não há aprovação de segurança sem ressalvas, piloto ou produção.

## Escopo, método e limites

Foram lidos integralmente **227 arquivos originais de docs**: 210 Markdown, 11 JSON e 6 YAML, incluindo diretórios ocultos de skills. O inventário com tamanho, SHA-256 do baseline e confirmação de leitura está em [0540](0540_documentation_review_inventory.json). Trechos truncados foram relidos. Artefatos desta auditoria não entram no denominador original.

A leitura foi confrontada com código e testes de API, worker, web e packages de plataforma, agent-core, workflows, policy, tools, adapters, RAG, shared e persistence. Foi inspecionado o caminho publicado efetivo, diferenciando funções legadas isoladas de funcionalidades integradas. Foram executados testes locais, PostgreSQL efêmero e navegador com fixtures. Não houve dados reais, deploy, push, provider/canal externo ou ação clínica/financeira. A consulta pública aos advisories não foi uma integração de produto.

Esta é uma auditoria por inspeção e execução de cenários, não uma prova formal de todas as linhas do código, pentest exaustivo, validação clínica, benchmark de carga ou certificação de acessibilidade. Nenhuma revisão independente por subagente foi executada nesta rodada. Código que passa em fixtures não foi contado como integração real.

Escala: 0 = ausente; 1–24 = intenção/contrato/stub; 25–49 = parcial com lacunas centrais; 50–69 = utilizável parcialmente; 70–84 = funcional com limitações relevantes; 85–94 = consistente e comprovado no escopo declarado; 95–100 = evidência muito forte para o requisito estrito. As notas são julgamento técnico ordinal, com arredondamento explícito nas médias. Um limite intencional não é defeito, mas reduz a completude frente ao produto original.

A nota geral usa apenas as seis dimensões abaixo. As matrizes detalhadas se sobrepõem e **não** são somadas novamente.

| Dimensão                   | Nota /100 | Peso % |
| -------------------------- | --------- | ------ |
| Cobertura funcional do PRD | 61.4      | 35     |
| Plataforma controlada      | 85        | 20     |
| Segurança operacional      | 60        | 15     |
| Testes e engenharia        | 88        | 15     |
| Documentação e governança  | 72        | 10     |
| Operação real              | 25        | 5      |

Média ponderada = 69.14, arredondada para **69/100**. Plataforma controlada 85 e operação real 25 são sínteses de escopo, não médias de itens que incluem capacidades futuras.

## Evidência executável atual

| Verificação             | Resultado observado                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambiente                | Linux; Node 24.20.0, npm 11.19.0; CI declara Node22, não repetido localmente nessa versão.                                                         |
| npm ci --ignore-scripts | PASS; 303 pacotes instalados; package-lock sem alteração.                                                                                          |
| npm run verify          | PASS: format, typecheck, lint, build, regressão, coverage e audit no limiar high.                                                                  |
| Regressão Vitest        | 127 arquivos PASS / 2 skipped; 537 testes PASS / 19 skipped.                                                                                       |
| Coverage                | 84,87% statements; 80,12% branches; 84,98% functions; 85,98% lines.                                                                                |
| Build web               | 158 módulos; JavaScript 349,39 kB, gzip 101,50 kB.                                                                                                 |
| Worker startup smoke    | PASS; exige encerramento com queue_adapter_missing. Não comprova consumidor de fila.                                                               |
| PostgreSQL              | PG16.14 efêmero local: 8 arquivos / 72 testes PASS, sem skips; cluster encerrado após uso.                                                         |
| Playwright browser/API  | 4 testes PASS, CI=1, porta API isolada 33197, retries=0. Primeira tentativa falhou por Chromium ausente; após instalar browser, reexecução passou. |
| npm audit --json        | 1 dependência moderada (Fastify 5.8.5), dois advisories; 0 high/critical. Exit0 do gate high não significa zero vulnerabilidades.                  |
| Probes adicionais       | Intenção composta falha no escalonamento; HTTPS aceita header em confiança numérica. Evidência abaixo.                                             |

As 72 verificações PostgreSQL incluem testes já representados na suíte geral; não se deve somar 537+72 como testes únicos. Os 19 skips da suíte geral não foram apresentados como passes. O E2E real é o Playwright `.spec.ts`; `critical-flows.test.ts` usa Vitest/API injection.

Os logs e probes desta rodada foram preservados em [0541](0541_documentation_review_evidence.json), com hashes. Logs temporários genéricos que sofreram interferência de outro processo foram descartados como autoridade; a evidência final usa exclusivamente `/tmp/secretary-v2-audit-0674f0a`.

## Requisitos funcionais — PRD original

Fonte: [0013](../01_prd/0013_requisitos_funcionais.md). Nota contra o requisito completo; ferramentas fake não contam como consulta ou persistência de cadastro real.

| RF     | Item                                      | Nota /100 | Implementação e limite                                                                                                     |
| ------ | ----------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| RF-001 | Receber mensagem por adapter              | 55        | Webhook normalizado, HMAC/replay e FakeWhatsAppAdapter; canal conectado real ausente.                                      |
| RF-002 | Criar conversa                            | 90        | receive-inbound-message, repositórios memory/PostgreSQL e testes de isolamento/idempotência.                               |
| RF-003 | Criar/retomar sessão                      | 92        | Sessão persistida, continuidade e pinning de versão; prova PostgreSQL e E2E.                                               |
| RF-004 | Registrar mensagens recebidas/enviadas    | 82        | Inbound e outbound controlado na timeline; envio externo não ocorre.                                                       |
| RF-005 | Histórico consultável                     | 88        | API paginada, timeline, tenant e redaction; limites controlados.                                                           |
| RF-010 | Identificar intenção                      | 40        | Regex com confiança fixa; mensagem composta perde risco alto (AUD-F01).                                                    |
| RF-011 | Executar workflow LangGraph               | 15        | Funções TypeScript executam decisões; LangGraph foi removido e não existe execução pelo framework exigido.                 |
| RF-012 | Manter estado do workflow                 | 65        | Estado da sessão/takeover e versão persistem; não há checkpoint de grafo conversacional completo.                          |
| RF-013 | Registrar agent run                       | 85        | Agent runs e execution traces persistentes, vinculados ao tenant/agente/versão.                                            |
| RF-014 | Interromper quando policy exigir handoff  | 75        | Policy e takeover interrompem; AUD-F01 impede que certas entradas cheguem com o risco correto.                             |
| RF-020 | Buscar tutor por telefone                 | 20        | Tool valida presença de telefone e retorna matches vazio; não consulta cadastro.                                           |
| RF-021 | Criar draft de tutor                      | 20        | Retorna objeto draft/input; não há cadastro durável integrado ao fluxo publicado.                                          |
| RF-022 | Buscar paciente                           | 15        | Retorna matches vazio e input; sem busca efetiva.                                                                          |
| RF-023 | Criar draft de paciente                   | 20        | Retorna objeto draft; sem persistência de paciente integrada.                                                              |
| RF-024 | Vincular paciente à conversa              | 10        | ownerPatientNextStep devolve nome da próxima ação; vínculo efetivo não demonstrado.                                        |
| RF-030 | Coletar dados básicos da demanda          | 35        | Mensagem/histórico e respostas operacionais existem; coleta estruturada de triagem incompleta.                             |
| RF-031 | Classificar risco operacional             | 30        | Risco derivado da intenção lexical; triage vira high, scheduling low inclusive no caso composto.                           |
| RF-032 | Bloquear diagnóstico/prescrição           | 80        | Input policy, medication refusal e output policy com regressões; padrões lexicais não provam cobertura semântica completa. |
| RF-033 | Escalonamento de emergência               | 35        | Handoff em sintoma isolado; combinação com consulta deixa o bot ativo (AUD-F01).                                           |
| RF-040 | Consultar slots                           | 30        | Tool compilada e gateway funcionam em dry-run; slots são fixtures com datas fixas de maio/2026.                            |
| RF-041 | Sugerir horário                           | 35        | Resposta operacional e resultado de tool controlados; sem disponibilidade de agenda real.                                  |
| RF-042 | Criar appointment draft                   | 20        | Tool retorna draft/confirmationBlocked/input; não persiste agendamento.                                                    |
| RF-043 | Solicitar aprovação para confirmação      | 60        | Serviço/API de approval e bloqueio de confirmação existem; jornada draft→agenda real não está ligada.                      |
| RF-050 | Resumo de handoff                         | 80        | Builder estruturado e metadados de risco/intenção/destino no runtime; contexto tutor/pet ainda limitado.                   |
| RF-051 | Criar approval request                    | 90        | Schema bounded, API, persistência e fila; capability approval tem autoridade própria durável.                              |
| RF-052 | Registrar decisão/assunção humana         | 90        | Decisão, ator, timestamp, RBAC e transições; testes API/PostgreSQL.                                                        |
| RF-053 | Escalar para humano                       | 75        | Máquina de estados e silêncio do bot; sem entrega a Desk/Chatwoot/equipe real.                                             |
| RF-060 | Criar tarefa interna                      | 88        | Comando/API/repositório, idempotência e validação antes de persistir.                                                      |
| RF-061 | Vincular tarefa a conversa/sessão/contato | 55        | sessionId e relação indireta com conversa; cadastro/vínculo completo de contato ausente.                                   |
| RF-062 | Status da tarefa                          | 88        | Listagem e PATCH com status validado, persistência e testes de lifecycle.                                                  |
| RF-070 | Registrar tool calls                      | 88        | Gateway e sinks com trace parental, status e projeção redigida; tools externas não exercitadas.                            |
| RF-071 | Registrar safety events                   | 75        | Eventos de policy/output/handoff; entrada malclassificada pode não gerar evento de risco esperado.                         |
| RF-072 | Registrar integration events              | 50        | Contrato/eventos controlados existem; integrações reais não executadas.                                                    |
| RF-073 | Investigar conversa/sessão/tool/approval  | 85        | Audit evidence, filtros, checkpoints e traces; correlação controlada comprovada.                                           |
| RF-080 | Listar conversas                          | 90        | API paginada e painel com estados de loading/erro/vazio.                                                                   |
| RF-081 | Fila de approvals                         | 88        | API/client/painel funcional com identidade e permissões.                                                                   |
| RF-082 | Exibir tarefas                            | 88        | Painel, client e API verificados por testes.                                                                               |
| RF-083 | Ação humana sobre approvals               | 88        | Decisão pelo painel/API, RBAC e auditoria; não executa ação clínica/agenda real.                                           |
| RF-084 | Exibir resumo de handoff                  | 80        | Resumo e estado disponíveis nas superfícies operacionais; entrega humana real pendente.                                    |

**Média dos 39 RF: 61.4/100**, pesos iguais.

## Casos de uso

| UC    | Jornada                         | Nota /100 | Parecer                                                                                  |
| ----- | ------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| UC-01 | Receber mensagem e criar sessão | 75        | Núcleo persistente comprovado; adapter externo é fake.                                   |
| UC-02 | Identificar intenção            | 40        | AUD-F01 e confiança fixa limitam a qualidade.                                            |
| UC-03 | Identificar tutor/pet           | 17        | Tools e próximos passos são stubs, sem cadastro operacional.                             |
| UC-04 | Triagem inicial                 | 35        | Proteções existem; risco composto não é escalado.                                        |
| UC-05 | Sugerir agendamento             | 30        | Somente fixture; drafts não persistem agenda.                                            |
| UC-06 | Solicitar aprovação humana      | 85        | Jornada administrativa controlada e decisão auditada; operação humana real não validada. |
| UC-07 | Resumo de handoff               | 75        | Resumo/estado funcionam; contexto cadastral e entrega externa incompletos.               |
| UC-08 | Criar tarefa interna            | 80        | API/painel/persistência, sem automação completa de responsável/prazo.                    |
| UC-09 | Dúvida institucional            | 45        | Binding source/version e ausência de fonte→handoff; não existe RAG institucional ativo.  |

**Média dos 9 UC: 53.6/100**, pesos iguais; não agregada novamente à nota geral.

## Requisitos não funcionais

IDs P/C/R/S/M/G/E abaixo são identificadores desta auditoria para cada bullet do [0014](../01_prd/0014_requisitos_nao_funcionais_produto.md), na ordem original. São 31 itens.

| ID  | Requisito                                    | Nota /100 | Evidência/limite                                                                                                                                                                         |
| --- | -------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01 | Persistência p95 ≤ 2 s                       | 30        | Não foi executado benchmark p95 com carga; tempo de suíte não mede esse SLA.                                                                                                             |
| P02 | Primeira resposta p95 ≤ 10 s                 | 15        | Provider externo ausente; latência de fixture não valida SLA real.                                                                                                                       |
| P03 | Persistência independente de falha do agente | 80        | Inbound pending/completed e conclusão atômica permitem retry investigável; caminho é síncrono.                                                                                           |
| P04 | Timeout/fallback/correlação externos         | 25        | Retry auxiliar existe, mas não constitui timeout/circuit breaker operacional integrado.                                                                                                  |
| C01 | Modo solo sem HIS/Desk/CIP                   | 80        | Modo local controlado funciona sem esses sistemas; degradação de conexões reais não testada.                                                                                             |
| C02 | Duplicatas não duplicam efeitos              | 85        | Unique/idempotência/leases e testes concorrentes; delivery externo ausente.                                                                                                              |
| C03 | Policy indisponível bloqueia sensível        | 90        | Evaluator/gateway fail-closed e negativos executáveis.                                                                                                                                   |
| C04 | Webhook/tool/approval/task idempotentes      | 75        | Webhook/tasks e capability approval têm controles; decisão de approval de atendimento tem lacuna de snapshot obsoleto (AUD-F07).                                                         |
| C05 | Worker não perde mensagem aceita             | 45        | Mensagem persiste, mas não há consumidor durável para provar recuperação ponta a ponta.                                                                                                  |
| R01 | Correlation id por conversa                  | 90        | Envelopes e IDs gerados pelo servidor; traces parentais.                                                                                                                                 |
| R02 | Auditoria de tool input/output/status/erro   | 85        | Projeção/redaction deliberada; conteúdo bruto não deve ser preservado.                                                                                                                   |
| R03 | Decisão humana com ator/data                 | 90        | Persistência e controles de decisão.                                                                                                                                                     |
| R04 | Resposta vinculada a run/policy/fonte        | 85        | Runtime controlado mantém trace e versão; source somente quando binding válido.                                                                                                          |
| R05 | Auditoria sensível append-only               | 85        | Repositórios, RLS/roles e checkpoints; retenção/imutabilidade externa não provadas.                                                                                                      |
| S01 | Bloquear diagnóstico/prescrição/definitivo   | 80        | Regras input/output, ferramentas controladas e preflight; cobertura lexical limitada.                                                                                                    |
| S02 | Dados somente a perfis autorizados           | 80        | RBAC/tenant/RLS e testes negativos; IdP operacional não integrado.                                                                                                                       |
| S03 | Baixa confiança prefere handoff              | 75        | Threshold/clarify/handoff; confiança é fixa e risco composto falha.                                                                                                                      |
| S04 | Painel autenticado/autorizado/auditado       | 60        | Resolver/token HMAC e RBAC existem; console controlado não entrega login/IdP operacional.                                                                                                |
| S05 | Secrets por ambiente/referência              | 85        | secretRef validado e redaction; secret manager/rotação operacionais pendentes.                                                                                                           |
| S06 | Minimização/mascaramento/retenção            | 65        | Redaction em persistência/UI; política e execução de retenção real não comprovadas.                                                                                                      |
| M01 | Operadores visualizam/assumem                | 85        | Filas e takeover explícito; sem validação com operadores reais.                                                                                                                          |
| M02 | Prevenir conflitos de approval               | 55        | Serviço rejeita snapshot já decidido; repositório permite sobrescrita a partir de snapshot pending obsoleto (AUD-F07).                                                                   |
| M03 | Uma decisão final concorrente                | 40        | Consumo único comprovado para capability approval; approval de atendimento tem escrita sem CAS. Concorrência HTTP em memória tentou e rejeitou a segunda decisão, sem provar PostgreSQL. |
| G01 | Autonomia configurável                       | 80        | Config declarativa limitada por hard safety; autonomia real deliberadamente desligada.                                                                                                   |
| G02 | Policy versionada                            | 92        | Snapshots imutáveis e lifecycle.                                                                                                                                                         |
| G03 | Mudança sensível auditável                   | 88        | Clone, versão, audit, release candidate e preflight.                                                                                                                                     |
| G04 | Gate para rollout real                       | 80        | NO-GO explícito e runbooks; checklist executado em produção inexiste.                                                                                                                    |
| G05 | Autonomia como alteração de risco            | 80        | Governança declarada e versões; avaliação operacional ainda futura.                                                                                                                      |
| E01 | Coverage ≥ 80%                               | 95        | 84,87/80,12/84,98/85,98; branches perto do mínimo.                                                                                                                                       |
| E02 | Críticos com idempotência/policy/audit       | 75        | Muitos negativos e PG; falta caso composto de risco no preflight.                                                                                                                        |
| E03 | Test/typecheck/lint verdes                   | 95        | verify atual PASS; CI usa Node22, esta execução Node24.                                                                                                                                  |

**Média: 73.2/100**. SLAs não medidos recebem nota baixa por falta de comprovação, não por latência ruim observada.

## Capacidades da plataforma e qualidade técnica

| Item                                      | Nota /100 | Parecer                                                                                                                      |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura modular e separação de planos | 80        | Workspaces, portas e executor comum; server.ts 4.748 linhas e painel platform 2.208 concentram responsabilidades.            |
| Agent/AgentVersion e lifecycle            | 92        | Memory/PostgreSQL, snapshots, CAS e isolamento testados.                                                                     |
| Publish/rollback e release candidate      | 88        | Digest, vínculo, validador distinto e gate server-side; refs controlled:// são atestação, não validação de artefato externo. |
| Pinning de sessão/worker                  | 92        | Sessão mantém v1 ARCHIVED após v2; PostgreSQL e browser/API.                                                                 |
| Control Center multiagente                | 86        | Criar/clonar/configurar/publicar A/B, proteção contra respostas tardias; UX ainda técnica.                                   |
| Prompt profile/templates                  | 85        | JSON validado, locks/checksum e templates; prompt não gera inferência no provider fake.                                      |
| Provider/modelo controlado                | 90        | Registry fechado resolve exatamente fake/deterministic-v1 e rejeita fallback.                                                |
| Integração de LLM real                    | 10        | Contrato/configuração somente; complete ignora prompt e retorna fallbackText.                                                |
| Policy e output safety                    | 72        | Hard safety e saída bloqueada antes de tools; risco de entrada depende do classificador defeituoso.                          |
| Handoff Policy Studio                     | 80        | Thresholds/destinos/prioridade e trace; falta dispatch e risco composto.                                                     |
| Human takeover                            | 90        | Estados/transações e silêncio do bot; retorno explícito.                                                                     |
| Capability gateway e approvals            | 90        | Autoridade server-side, validators, binding, single-use e audit.                                                             |
| Plugin registry/versionamento             | 90        | Somente código compilado, pinning, rejeição de colisões.                                                                     |
| Catálogo de plugins                       | 90        | Metadata persistente, lifecycle, UI/API/RLS; aprovação não instala handler.                                                  |
| Marketplace/instalação externa            | 5         | Direção documentada; execução externa ausente por projeto.                                                                   |
| Event bus/hooks local                     | 85        | Payload minimizado, isolamento e entrega best-effort; sem broker.                                                            |
| Test Lab/suites/A-B/traces                | 88        | Mesmo executor publicado, suites persistentes e comparação controlada.                                                       |
| Preflight crítico de publicação           | 55        | Cinco casos fixos passam, mas emergência composta fica fora da barreira.                                                     |
| Knowledge source catalog                  | 90        | Metadata source/version/status com RLS, sem conteúdo.                                                                        |
| RAG institucional executável              | 25        | Noop/binding de fixture e handoff seguro; sem ingestão/embeddings/vector store.                                              |
| Auditoria/checkpoint/correlação           | 88        | Filtros, digest server-side, CAS e trace parental persistentes.                                                              |
| PostgreSQL/migrations/RLS                 | 90        | 8 arquivos/72 testes reais em PG16 efêmero; roles, tenant, concorrência e migrations.                                        |
| API/HTTP e identidade                     | 72        | Schemas/RBAC/HMAC/CORS/limites; proxy numérico vulnerável e IdP real pendente.                                               |
| Worker/fila/outbox duráveis               | 20        | Handler direto funciona; bootstrap rejeita adapter e processOutboxEvent é stub.                                              |
| Observabilidade operacional               | 45        | Métricas locais e logs redigidos; sem alertas, SLO, retenção ou agregação distribuída.                                       |
| Testes/CI/reprodutibilidade               | 88        | verify, PG e 4 E2E reproduzidos; ausência de carga e moderada passa no gate high.                                            |
| UX funcional do painel mínimo             | 80        | Conversas, tarefas, approvals, auditoria e estados vazios/erro; testes DOM e browser.                                        |
| Acessibilidade/usabilidade em operação    | 45        | Labels e testes semânticos existem; sem auditoria WCAG integral, mobile ou usuários reais.                                   |
| Operação/deploy/recuperação               | 30        | Runbook e bloqueios claros; sem imagem/backup-restore/HA/canal/provedor operacional provados.                                |

## Documentação — qualidade e aderência

Cada arquivo foi lido; as notas abaixo agrupam documentos de mesma função para evitar atribuir maturidade de software a uma ata histórica. O inventário 0540 identifica individualmente todos os arquivos. Documentos antigos continuam válidos como história, mas precisam de indicação clara quando deixam de ser autoridade do estado atual.

| Grupo documental                              | Nota /100 | Parecer                                                                                                  |
| --------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| 00_discovery                                  | 80        | Problema, riscos e hipóteses claros; pressupostos não substituem validação operacional.                  |
| 01_prd                                        | 78        | 39 RF, 9 UC e metas mensuráveis; requisitos originais não conciliados integralmente com o slice atual.   |
| 02_spec                                       | 80        | Contratos e gates detalhados; arquitetura original LangGraph diverge da implementação atual.             |
| 03_build                                      | 65        | Rastreabilidade e histórico úteis; plano esperando Phase0 e caminho Timeline.tsx obsoleto.               |
| 04_audit                                      | 65        | Evidências extensas por sprint; relatórios canônicos antigos e tabelas finais com contagens divergentes. |
| 05_loop                                       | 72        | Processo de feedback definido; muitos registros são preparação/histórico.                                |
| 06_skill, inclusive ocultos                   | 85        | Procedimentos específicos, papéis e limites claros; repetição aumenta manutenção.                        |
| 07_agents e instruções operacionais           | 88        | Pipeline, gates e proibições explícitos.                                                                 |
| 08_runtime                                    | 72        | Contratos/continuidade documentados; execução durável não acompanha toda a intenção.                     |
| 09_debug                                      | 65        | Evidências de correções; estados globais/pêndencias históricas não totalmente conciliados.               |
| platform, ADRs e guias                        | 78        | Estado controlado é explícito; migration-guide omite 0009 e audit final mistura baselines.               |
| README, blueprint e CODEX_MASTER              | 60        | Orientação abrangente; texto presume componentes maduros ausentes e mistura planejamento com construção. |
| runtime state, execution log e backlog master | 68        | História preservada; várias seções afirmam estado atual diferente, leitura cronológica difícil.          |

Aderência à SPEC: contratos de tenant, snapshots, approvals, persistência, validação e testes do slice atual têm evidência forte. Aderência literal à arquitetura original é parcial: RF-011/LangGraph e outbox/worker DB-backed não estão entregues. A remoção de dependências não utilizadas consta no log de 2026-04-29; é uma decisão histórica, não uma biblioteca acidentalmente esquecida. O `CODEX_MASTER_INSTRUCTIONS.md` presume componentes maduros como Chatwoot/Redis/JWT/Qdrant que não correspondem ao runtime instalado; o token HMAC próprio não constitui integração de IdP/JWT operacional.

## Achados e plano de remediação

### AUD-F01 — P1: intenção de agendamento sobrepõe sinal de risco

Referências: [classifyForDryRun](../../packages/platform/src/test-lab.ts:536), `riskForIntent` no mesmo arquivo, [executor publicado](../../packages/agent-core/src/commands/execute-published-agent.ts).

Reprodução no preset publicado, store em memória, mensagens fictícias:

| Mensagem                                | Intent / risco               | Policy / estado                   | Handoff / tool             |
| --------------------------------------- | ---------------------------- | --------------------------------- | -------------------------- |
| Quero uma consulta                      | scheduling / low             | allowed / BOT_ACTIVE              | não / find_available_slots |
| Meu pet esta com sangue                 | triage / high                | handoff / HANDOFF_REQUESTED       | sim, high / nenhuma        |
| Quero consulta, meu pet esta com sangue | scheduling / low             | allowed / BOT_ACTIVE              | não / find_available_slots |
| Qual o horário de funcionamento?        | institutional_question / low | approved_source_missing / handoff | sim / nenhuma              |

O classificador verifica medicamento, informação institucional e agendamento antes de triagem. O risco vem da intenção escolhida. A tool retornou fixture; não houve consulta real, prescrição ou dano observado. O defeito é não reconhecer/escalar risco no comportamento controlado. As cinco entradas fixas do preflight não incluem essa combinação.

Remediação proposta (não implementada): novo gate DISCOVERY→PRD→SPEC para detectar sinais de risco independentemente da intenção administrativa, preservar a prioridade de safety e acrescentar regressões de intenções compostas ao runtime publicado, worker/API e preflight. Aceite: mensagem composta solicita handoff de risco alto, não planeja tools e preserva casos administrativos benignos. Owner sugerido: runtime/policy; prioridade imediata antes de reafirmar segurança do MVP.

### AUD-F02 — lacuna de produto: worker/outbox não entregam processamento durável

[worker.ts](../../apps/worker/src/worker.ts) rejeita adapter ausente e não oferece adapter suportado. O handler de job pode ser chamado diretamente com versão pinned, mas não existe consumo de broker. [process-outbox-event.ts](../../apps/worker/src/jobs/process-outbox-event.ts) retorna `status: processed` sem dispatch/ack. O schema/repositório pode guardar eventos, mas isso não prova entrega. O contrato original 0303 exige outbox DB-backed consumida por worker; S33/S34 limitam explicitamente o escopo ao handler e falha segura.

Remediação futura: contrato de lease, claim/ack, retry, dead-letter, idempotência e recuperação com crash antes/depois do efeito. Só então adapter controlado e teste fim a fim; integração real exige gate próprio. Não habilitar envio ao corrigir apenas bootstrap. Prioridade de produto P2; ausência atual é deliberada, não incidente em produção.

### AUD-F03 — lacuna de produto: IA, cadastro, agenda e canais simulados

[model-provider.ts](../../packages/platform/src/model-provider.ts) registra apenas `fake/deterministic-v1`; `complete` ignora prompt e devolve fallbackText. [tools locais](../../packages/tools/src/local) retornam objetos/arrays fixos: busca de tutor/paciente não encontra registros, drafts não persistem entidades, slots têm datas fixas de maio/2026. [FakeWhatsAppAdapter](../../packages/adapters/src/fake/fake-whatsapp-adapter.ts) simula envio. [Noop RAG](../../packages/rag/src/noop-rag-source.ts) não fornece base institucional.

Isso é compatível com as restrições das sprints controladas, mas impede afirmar que a secretária completa está pronta. Catálogo de knowledge aprovado é metadata; não aprova automaticamente conteúdo institucional. Catálogo de plugins aprovado não instala código. Remediação: especificar e implementar vertical slices separados, inicialmente com contratos e fixtures persistentes, depois conectar serviços somente com autorização/gates apropriados. Prioridade de produto P2.

### AUD-F04 — P2 documental: autoridades e rastreabilidade divergentes

Exemplos verificáveis: `0306` mantém espera de aprovação Phase0; a matriz `0304` aponta `apps/web/src/features/conversations/Timeline.tsx`, enquanto o componente está em `index.tsx`; relatórios canônicos 0410–0418 descreviam ausência de runtime apesar de evidências recentes; `final-technical-audit.md` mistura 512/537 testes em seções apresentadas como finais; `migration-guide.md` lista até 0008 e omite 0009. Readiness documental verde verifica condições limitadas, não resolve essas divergências nem AUD-F01.

Nesta rodada os documentos canônicos de audit recebem referência datada ao novo parecer, mantendo o histórico. Remediação restante: indicar uma autoridade atual por assunto, marcar planos antigos como históricos, corrigir caminhos e validar referências de código/migrations em vez de só existência de testes. Owner: documentação/governança. Não reescrever o histórico para atribuir testes atuais a uma sprint antiga.

### AUD-F05 — P2: Fastify afetado e confiança numérica no proxy

Fastify instalado: **5.8.5**. `npm audit` identifica dois advisories moderados. A API usa `trustProxy: httpSecurity.trustedProxyHops || false` e exige `request.protocol === https`. Em `buildServer` com `enforceHttps=true`, `trustedProxyHops=1` e endereço fictício `203.0.113.7`, `GET /health` retorna **426** sem header e **200** com `X-Forwarded-Proto: https`. A chamada foi `app.inject`, sem rede externa.

O advisory oficial descreve spoofing quando a origem pode ser alcançada diretamente e a confiança usa número de saltos; a correção 5.12.1 remove essa forma numérica. A exposição real da origem não foi auditada. Portanto há reprodução do comportamento na aplicação, mas não alegação de exploração de um ambiente implantado. [Advisory oficial de proxy](https://github.com/fastify/fastify/security/advisories/GHSA-3m5p-2c4r-xxw2).

O segundo advisory trata de coerção de primitivo na validação de schema do framework. As rotas inspecionadas revalidam bodies com Zod; não foi demonstrado bypass de negócio por esse segundo problema. [Advisory oficial de schema](https://github.com/fastify/fastify/security/advisories/GHSA-w2qp-rph6-63g4).

Remediação proposta: atualizar dependência/lock sob gate de BUILD e substituir confiança numérica por endereço/CIDR/função que valide origem, com regressões HTTP direto versus proxy confiável. Só atualizar o pacote pode exigir mudança de contrato/configuração porque o modo numérico foi removido. Verificar isolamento de rede no futuro host e repetir audit, typecheck e testes HTTP. Owner: API/security. O gate high deve exibir explicitamente a moderada mesmo quando passa.

### AUD-F06 — lacuna de evidência operacional e manutenção

Não há benchmark p95, ensaio de carga, recuperação de fila, backup/restore, HA, retenção/purge operacional, IdP real ou teste com operador. As métricas são locais e a rota fica desabilitada em produção; não existe observabilidade distribuída pronta. A concentração de rotas em `server.ts` e de UI no painel de plataforma amplia custo de revisão; contagem de linhas é indício de manutenção, não defeito funcional por si só.

Remediação futura: definir cenários de carga e falha com dados sintéticos, metas e medição; exercitar restore e concorrência; implementar operação por contratos aprovados. Refatoração só com uma necessidade concreta e regressão preservada. Prioridade P2 antes de piloto, P3 para organização interna.

### AUD-F07 — P2: snapshot obsoleto sobrescreve approval de atendimento

A aprovação de capabilities e a aprovação de atendimento são mecanismos diferentes. A primeira tem autoridade durável single-consume. Na segunda, [ApprovalService](../../packages/policy/src/approvals/approval-service.ts) valida o status do objeto recebido, enquanto [ApprovalRepository.save](../../packages/persistence/src/repositories/approval-repository.ts) substitui o registro sem comparar seu estado corrente. `PostgresDatabase.saveApproval` também usa `ON CONFLICT DO UPDATE` sem precondição de status; a rota lê e grava em operações separadas.

Reprodução em repositório memory, somente fixture: criar pending; ler snapshots A/B; decidir A como approved e salvar; decidir B ainda pending como rejected e salvar. Ambas as gravações retornam sucesso e o estado final é rejected. Isso demonstra falta de proteção a escrita obsoleta nessa porta. Uma tentativa adicional com duas chamadas HTTP concorrentes em memória retornou 200/400 e **não** reproduziu dupla decisão HTTP; o interleaving no PostgreSQL não foi executado nesta rodada. Não se alega que todo pedido concorrente produz a falha, nem que uma ação externa foi executada.

Remediação: transição atômica condicionada a pending, resultado explícito de conflito e auditoria consistente com a única decisão vencedora. Acrescentar teste com barreira entre leituras concorrentes e prova PostgreSQL; não transferir a garantia do capability approval para essa fila. Owner sugerido: persistence/API; prioridade P2 antes de operação multiusuário real.

## Métricas e resultados que não podem ser afirmados

As metas do PRD (100% mensagens registradas, 100% tools auditadas, 90% handoffs completos, zero perda de mensagem, p95 2s, zero dupla decisão) são objetivos. Os testes mostram exemplos e invariantes controlados, não taxas operacionais de população. Não há base para calcular sucesso de atendimento, precisão de intenção, redução de trabalho humano ou retorno financeiro. Coverage de 84,87% não significa produto 84,87% pronto. A reprodução AUD-F01 prova que a suíte verde não é suficiente para atestar segurança semântica.

## Encerramento e próxima ação

Auditoria solicitada concluída, com leitura integral, notas, evidências, gaps e plano registrados. Produto/lockfile não foram alterados. Atualizados runtime state, execution log, backlog master, progress da plataforma e índices canônicos de audit. Os achados abertos são trabalho futuro, não pendências de entrega deste relatório.

Próxima ação técnica prioritária: abrir discovery/PRD/SPEC para AUD-F01, AUD-F05 e AUD-F07, com aceite reproduzível; não iniciar automaticamente um BUILD a partir desta auditoria. Produção real, dados reais, providers/canais, RAG institucional e ações sensíveis permanecem **NO-GO** até os respectivos gates.
