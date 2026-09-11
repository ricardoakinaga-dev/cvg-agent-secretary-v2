# 0313 — Backlog executável pós-auditoria

Data: 2026-09-05. Programa: `REM-0539`. Fonte: [auditoria 0539](../04_audit/0539_documentation_implementation_review.md). Estado: **EXECUÇÃO CONTROLADA — R1–R4 CONCLUÍDAS / R5 NO-GO CONTROLADO**. REM-04–28 têm evidência local; REM-29 registrou NO-GO e REM-30 é opcional/deferida. REM-02 permanece pendente de decisão humana. [Dossiê R3](../04_audit/0546_rem0539_r3_evidence.json), [R4](../04_audit/0547_rem0539_r4_evidence.json), [R5](../04_audit/0548_rem0539_r5_qualification_evidence.json).

## Estado consolidado após BUILD/AUDIT

| Faixa     | Estado atual                                        | Evidência                         |
| --------- | --------------------------------------------------- | --------------------------------- |
| REM-01/03 | IMPLEMENTED_CONTROLLED                              | R0/R1–R4 contracts and baseline   |
| REM-04–08 | COMPLETED_CONTROLLED                                | `0543`, `0544`                    |
| REM-09–12 | COMPLETED_CONTROLLED                                | `0545`                            |
| REM-13–18 | COMPLETED_CONTROLLED                                | `0546`                            |
| REM-19–26 | COMPLETED_CONTROLLED, gates externos não conectados | `0547`                            |
| REM-27/28 | COMPLETED_CONTROLLED local                          | `0548`                            |
| REM-29    | NO_GO_CONTROLLED                                    | `0548`                            |
| REM-02    | PENDING_HUMAN_DECISION                              | RF-011 sem decisão do responsável |
| REM-30    | DEFERRED_OPTIONAL                                   | fora do caminho crítico           |

A conclusão do backlog é condicional: a implementação local foi executada, mas o programa não autoriza produção nem piloto real enquanto os gates externos/humanos não forem aprovados.

## Convenções, prontidão e rastreabilidade

30 tasks no programa; REM-01/03 e REM-04–28 já têm execução/evidência controlada; REM-29 tem parecer NO-GO; REM-02 aguarda decisão humana e REM-30 é opcional/deferida. Os nomes de owners são papéis sugeridos. Prioridade é ordem de execução: P1 exige atenção imediata/fecha gate; P2 entrega necessária ao objetivo; P3 opcional. A severidade dos achados originais permanece a do relatório. Tamanho relativo: S = item limitado; M = módulo/contrato e regressão; L = atravessa módulos, dados ou operação. L exige decomposição adicional em subtasks na SPEC; não é compromisso de caber em uma sprint.

O estado inicial permanece preservado nas fichas para rastreabilidade. Estado atual: REM-01 e REM-03 **IMPLEMENTED_CONTROLLED**; REM-04–28 **COMPLETED_CONTROLLED**; REM-02 **PENDING_HUMAN_DECISION**; REM-29 **NO_GO_CONTROLLED**; REM-30 **DEFERRED_OPTIONAL**. PLANNED não autoriza execução imediata: dependências, responsável e autorização aplicável ainda precisam ser verificados. Tarefas de BUILD só entram em READY_FOR_BUILD com discovery, PRD e SPEC aprovados, task registrada e revisão humana de BUILD. Estados futuros: IN_PROGRESS → IN_AUDIT → COMPLETED; bloqueios explícitos sem inferir aprovação por tempo decorrido.

Definição de pronto comum: aceite específico demonstrado, testes negativos relevantes, nenhum efeito fora do escopo, documentação/evidência com commit e ambiente, e fechamento AUDIT. Para código: format/typecheck/lint/build/test/coverage (≥80% por dimensão) e audit; PostgreSQL para persistência/concorrência, Playwright para jornada/console e worker smoke/recuperação quando aplicável. Explicar skips e vulnerabilidades remanescentes; exit0 do gate high não significa audit zero. Não declarar testes desta lista como já executados.

Aprovação de uma SPEC local não autoriza rede externa, credenciais de produção, dados reais, RAG institucional sem aprovação, deploy ou ações sensíveis. Essas dependências são adicionais às dependências REM. Cada task de integração pode terminar sua parte local, mas a parte externa permanece bloqueada até seu gate e sua própria evidência.

## Índice priorizado por onda

| ID     | Onda | Prioridade | Task                                                 | Owner proposto                                        | Tamanho | Depende de                                     |
| ------ | ---- | ---------- | ---------------------------------------------------- | ----------------------------------------------------- | ------- | ---------------------------------------------- |
| REM-01 | R0   | P1         | Revalidar achados e fixar baseline                   | Tech lead + QA                                        | S       | Relatório 0539                                 |
| REM-02 | R0   | P2         | Conciliar PRD, SPEC e autoridade documental          | Produto + arquitetura                                 | M       | REM-01                                         |
| REM-03 | R0   | P1         | Detalhar e submeter contratos das três correções     | Tech lead + security                                  | M       | REM-01                                         |
| REM-04 | R1   | P1         | Separar risco da intenção administrativa             | Runtime/policy                                        | M       | REM-03                                         |
| REM-05 | R1   | P1         | Ampliar preflight e regressões de risco              | QA + runtime                                          | M       | REM-04                                         |
| REM-06 | R1   | P2         | Corrigir dependência e confiança no proxy            | API/security                                          | M       | REM-03                                         |
| REM-07 | R1   | P2         | Tornar decisão de atendimento atômica                | Persistence/API                                       | L       | REM-03                                         |
| REM-08 | R1   | P1         | Auditar fechamento da estabilização                  | QA + revisor de segurança                             | M       | REM-05, REM-06, REM-07                         |
| REM-09 | R2   | P2         | Especificar processamento durável                    | Arquitetura + backend                                 | M       | REM-08                                         |
| REM-10 | R2   | P2         | Implementar outbox e consumidor controlados          | Backend/persistence                                   | L       | REM-09                                         |
| REM-11 | R2   | P2         | Integrar aceite inbound e execução assíncrona        | API/runtime                                           | L       | REM-10                                         |
| REM-12 | R2   | P2         | Provar recuperação, replay e falhas de entrega       | QA + backend                                          | M       | REM-11                                         |
| REM-13 | R3   | P2         | Especificar domínio tutor/pet/agenda e jornadas      | Produto + backend                                     | M       | REM-02, REM-08                                 |
| REM-14 | R3   | P2         | Persistir busca e drafts de tutor/pet                | Backend/persistence                                   | L       | REM-13                                         |
| REM-15 | R3   | P2         | Construir coleta estruturada e handoff completo      | Runtime + produto                                     | L       | REM-14, REM-05                                 |
| REM-16 | R3   | P2         | Persistir sugestões e drafts de agenda               | Backend + tools                                       | L       | REM-14, REM-07                                 |
| REM-17 | R3   | P2         | Completar tarefa e UX da jornada operacional         | Web + backend                                         | M       | REM-15, REM-16                                 |
| REM-18 | R3   | P2         | Auditar secretária completa em fixtures              | QA + produto                                          | M       | REM-12, REM-17                                 |
| REM-19 | R4   | P2         | Definir identidade, privacidade e contratos externos | Security + operação + produto                         | L       | REM-08, REM-02                                 |
| REM-20 | R4   | P2         | Implementar identidade e gestão de secrets           | Security/API + web                                    | L       | REM-19                                         |
| REM-21 | R4   | P2         | Implementar adapter de modelo com avaliação          | Runtime + QA                                          | L       | REM-05, REM-19, REM-20                         |
| REM-22 | R4   | P2         | Implementar canal e entrega humana controlados       | Adapters + backend                                    | L       | REM-12, REM-19, REM-20                         |
| REM-23 | R4   | P2         | Implementar ciclo de conteúdo institucional          | Knowledge + security                                  | L       | REM-19, REM-20                                 |
| REM-24 | R4   | P2         | Implementar observabilidade e retenção               | Operação + backend                                    | L       | REM-12, REM-19, REM-20                         |
| REM-25 | R4   | P2         | Preparar artefato, restore e rollback                | Operação + persistence                                | L       | REM-12, REM-19, REM-20                         |
| REM-26 | R4   | P2         | Auditar integrações e operação em ambiente sintético | QA + security + operação                              | L       | REM-18, REM-21, REM-22, REM-23, REM-24, REM-25 |
| REM-27 | R5   | P2         | Medir carga, disponibilidade e SLAs                  | QA/performance + operação                             | L       | REM-26                                         |
| REM-28 | R5   | P2         | Validar operação humana e acessibilidade             | Produto + QA + operação                               | M       | REM-26                                         |
| REM-29 | R5   | P1         | Emitir parecer de qualificação e decisão de piloto   | Auditoria + responsáveis de negócio/security/operação | M       | REM-27, REM-28                                 |
| REM-30 | POST | P3         | Refatorar hotspots conforme evidência de manutenção  | Tech lead                                             | M       | REM-08, REM-02                                 |

## Cobertura dos achados

| Achado  | Tasks principais       | Fechamento esperado                                           |
| ------- | ---------------------- | ------------------------------------------------------------- |
| AUD-F01 | REM-01/03/04/05/08/15  | G1: risco composto corrigido e regressão obrigatória          |
| AUD-F02 | REM-09/10/11/12/22     | G2: recuperação/entrega controlada; canal real ainda tem gate |
| AUD-F03 | REM-13..23/26          | G3/G4: substituir stubs e distinguir fixture de conexão real  |
| AUD-F04 | REM-02                 | Autoridade e matriz atualizadas; decisão RF-011 explícita     |
| AUD-F05 | REM-01/03/06/08        | G1: proxy/dependência corrigidos e prova de origem            |
| AUD-F06 | REM-12/17/19/20/24..30 | G4/G5: operação mensurada; refatoração opcional               |
| AUD-F07 | REM-01/03/07/08        | G1: CAS de approval de atendimento e teste PostgreSQL         |

## Fichas de execução

### REM-01 — Revalidar achados e fixar baseline

- Onda / prioridade / tamanho: R0 / P1 / S.
- Estado atual: `IMPLEMENTED_CONTROLLED`. Owner proposto: Tech lead + QA.
- Origem: AUD-F01/F05/F07.
- Dependências: Relatório 0539 e autorização da rodada de revalidação; gates CVG e externos aplicáveis conforme convenções.
- Onde: docs/04_audit; suites de API/platform/persistence.
- O que / como: Reexecutar probes com fixtures e registrar commit, ambiente e limites da reprodução.
- Critério de pronto: Três reproduções documentadas; distinguir snapshot obsoleto de corrida HTTP; lista de regressões do próximo gate definida.
- Evidência registrada ou pendente: registro REM-01 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-02 — Conciliar PRD, SPEC e autoridade documental

- Onda / prioridade / tamanho: R0 / P2 / M.
- Estado atual: `PENDING_HUMAN_DECISION`. Owner proposto: Produto + arquitetura.
- Origem: AUD-F04; RF-011.
- Dependências: REM-01; gates CVG e externos aplicáveis conforme convenções.
- Onde: docs/01_prd, docs/02_spec, docs/03_build e docs/platform.
- O que / como: Decidir formalmente manter runtime atual ou exigir LangGraph; reconciliar caminhos, migrations e estados históricos sem apagar evidências.
- Critério de pronto: Decisão de RF-011 registrada e validada pelo responsável; matriz dos 39 RF atualizada; cada assunto possui fonte vigente; decisão não implica reescrita automática.
- Evidência registrada ou pendente: registro REM-02 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-03 — Detalhar e submeter contratos das três correções

- Onda / prioridade / tamanho: R0 / P1 / M.
- Estado atual: `IMPLEMENTED_CONTROLLED`. Owner proposto: Tech lead + security.
- Origem: AUD-F01/F05/F07.
- Dependências: REM-01; gates CVG e externos aplicáveis conforme convenções.
- Onde: docs/00_discovery, docs/01_prd, docs/02_spec.
- O que / como: Percorrer gates por correção: precedência de risco, proxy confiável e decisão atômica. Registrar compatibilidade, testes RED previstos e rollback.
- Critério de pronto: Discovery/PRD/SPEC aprovados pelos respectivos gates e revisão humana de BUILD registrada; sem aprovação, tarefas de código ficam bloqueadas.
- Evidência registrada ou pendente: registro REM-03 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-04 — Separar risco da intenção administrativa

- Onda / prioridade / tamanho: R1 / P1 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Runtime/policy.
- Origem: AUD-F01; RF-010/014/031/033.
- Dependências: REM-03; gates CVG e externos aplicáveis conforme convenções.
- Onde: packages/platform e packages/agent-core.
- O que / como: Detectar risco antes do planejamento administrativo, preservando output safety e takeover; testar mensagem, contexto relevante e intenções compostas.
- Critério de pronto: Consulta+sangue gera handoff high e nenhuma tool; casos de medicamento continuam bloqueados; corpus benigno não sofre regressão indevida; justificativa de risco no trace.
- Evidência entregue: `docs/04_audit/0543_rem0539_r1_evidence.json`; atualizar task, runtime state e execution log após execução.

### REM-05 — Ampliar preflight e regressões de risco

- Onda / prioridade / tamanho: R1 / P1 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: QA + runtime.
- Origem: AUD-F01; RNF E02.
- Dependências: REM-04; gates CVG e externos aplicáveis conforme convenções.
- Onde: Test Lab/preflight, tests/e2e, API e worker.
- O que / como: Fixar corpus versionado de sintomas, intenções compostas, variações e casos benignos; testar a mesma versão no executor publicado.
- Critério de pronto: Todos os casos críticos do corpus aprovado passam; regressão de risco impede publish/rollback; nenhum caso crítico planeja tool; evidência de API e handler worker.
- Evidência entregue: `docs/04_audit/0543_rem0539_r1_evidence.json`; atualizar task, runtime state e execution log após execução.

### REM-06 — Corrigir dependência e confiança no proxy

- Onda / prioridade / tamanho: R1 / P2 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: API/security.
- Origem: AUD-F05.
- Dependências: REM-03; gates CVG e externos aplicáveis conforme convenções.
- Onde: apps/api/src/http-security.ts, server.ts, shared/env e package-lock.json.
- O que / como: Revalidar advisory/versão no início do BUILD; migrar confiança numérica para política que valide endereço e atualizar dependências compatíveis.
- Critério de pronto: Origem não confiável com X-Forwarded-Proto=https recebe rejeição; proxy permitido funciona; CORS/HTTPS e configuração legada cobertos; audit atual e impacto da atualização registrados.
- Evidência entregue: `docs/04_audit/0543_rem0539_r1_evidence.json`; atualizar task, runtime state e execution log após execução.

### REM-07 — Tornar decisão de atendimento atômica

- Onda / prioridade / tamanho: R1 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Persistence/API.
- Origem: AUD-F07; RF-052/083; RNF M02/M03.
- Dependências: REM-03; gates CVG e externos aplicáveis conforme convenções.
- Onde: ApprovalRepository, PostgresDatabase.saveApproval, API e painel approvals.
- O que / como: Separar criação de transição ou impor CAS pending→decisão; auditar somente decisão vencedora e tratar conflito na UI.
- Critério de pronto: Snapshots A/B: exatamente uma transição vence; a segunda recebe conflito e não sobrescreve; barreira de leitura força corrida em PostgreSQL; ator/data/audit consistentes; capability approval preservada.
- Evidência entregue: `docs/04_audit/0543_rem0539_r1_evidence.json`, `docs/04_audit/0544_rem0539_r1_closure_evidence.json` e `packages/persistence/src/__tests__/attendance-approval-postgres.test.ts`; a corrida PostgreSQL passou em cluster local descartável.

### REM-08 — Auditar fechamento da estabilização

- Onda / prioridade / tamanho: R1 / P1 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: QA + revisor de segurança.
- Origem: AUD-F01/F05/F07.
- Dependências: REM-05, REM-06, REM-07; gates CVG e externos aplicáveis conforme convenções.
- Onde: docs/04_audit e gates existentes.
- O que / como: Reproduzir cenários originais após correção e executar gates integrados; solicitar revisão distinta do implementador quando houver disponibilidade.
- Critério de pronto: F01/F05/F07 fechados por evidência específica; zero P0/P1 aberto no escopo; ressalvas e ausência de revisão independente declaradas; produção continua NO-GO.
- Evidência: `docs/04_audit/0543_rem0539_r1_evidence.json` e `docs/04_audit/0544_rem0539_r1_closure_evidence.json`; corrida PostgreSQL executada em cluster local descartável.

### REM-09 — Especificar processamento durável

- Onda / prioridade / tamanho: R2 / P2 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Arquitetura + backend.
- Origem: AUD-F02; RNF C05.
- Dependências: REM-08; gates CVG e externos aplicáveis conforme convenções.
- Onde: Contratos agent-core/persistence/worker e docs/02_spec.
- O que / como: Escolher mecanismo de fila conforme requisitos, sem impor tecnologia antecipadamente; definir aceitação, claim, lease, ack, retry, dead-letter e cancelamento.
- Critério de pronto: SPEC/gate aprovados; matriz crash antes/depois do commit/efeito/ack; política explícita para entrega at-least-once e deduplicação; sem promessa de exactly-once externo.
- Evidência: [Discovery 0012](../00_discovery/0012_rem0539_r2_durability.md), [PRD 0023](../01_prd/0023_rem0539_r2_durability.md), [SPEC 0123](../02_spec/0123_rem0539_r2_contract.md) e closure R1 `docs/04_audit/0544_rem0539_r1_closure_evidence.json`. BUILD R2 segue os critérios de REM-10/11/12.

### REM-10 — Implementar outbox e consumidor controlados

- Onda / prioridade / tamanho: R2 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Backend/persistence.
- Origem: AUD-F02.
- Dependências: REM-09; gates CVG e externos aplicáveis conforme convenções.
- Onde: apps/worker e packages/persistence.
- O que / como: Implementar claim/lease transacional tenant-scoped, ack persistente, retry limitado e fila de falhas com destino local fictício.
- Critério de pronto: Reinício recupera pendentes; dois consumidores não processam simultaneamente o mesmo lease válido; expiração recuperável; estado processed exige resultado durável, não retorno de stub.
- Evidência registrada ou pendente: registro REM-10 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-11 — Integrar aceite inbound e execução assíncrona

- Onda / prioridade / tamanho: R2 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: API/runtime.
- Origem: AUD-F02; RF-001/004/013; RNF P03.
- Dependências: REM-10; gates CVG e externos aplicáveis conforme convenções.
- Onde: apps/api, agent-core, worker e outbox.
- O que / como: Persistir aceite antes da execução; preservar deduplicação, pinning, takeover e conclusão atômica; especificar compatibilidade do envelope HTTP.
- Critério de pronto: Mensagem aceita permanece investigável após crash; retry não duplica efeito controlado; continuidade usa versão pinned; takeover impede resposta mesmo com job já enfileirado.
- Evidência registrada ou pendente: registro REM-11 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-12 — Provar recuperação, replay e falhas de entrega

- Onda / prioridade / tamanho: R2 / P2 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: QA + backend.
- Origem: AUD-F02/F06.
- Dependências: REM-11; gates CVG e externos aplicáveis conforme convenções.
- Onde: Testes PostgreSQL/worker/API e runbook.
- O que / como: Injetar falhas nos pontos do contrato, comparar mensagens aceitas, registros, tentativas e efeitos do destino fictício.
- Critério de pronto: Zero perda e zero efeito duplicado na matriz controlada; dead-letter/reprocessamento auditáveis; desligamento e recuperação documentados; gate R2 auditado.
- Evidência registrada ou pendente: registro REM-12 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-13 — Especificar domínio tutor/pet/agenda e jornadas

- Onda / prioridade / tamanho: R3 / P2 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Produto + backend.
- Origem: AUD-F03; UC-03/04/05/07/08.
- Dependências: REM-02, REM-08; gates CVG e externos aplicáveis conforme convenções.
- Onde: PRD/SPEC de domínio e contratos tools.
- O que / como: Definir identidade por tenant, ambiguidade, consentimento/minimização, drafts, fonte de slots e estados de handoff; definir contrato de pausa/retomada.
- Critério de pronto: PRD/SPEC/gate aprovados; drafts não equivalem a cadastro definitivo ou consulta confirmada; critérios de confiança e decisão humana explícitos.
- Evidência registrada ou pendente: registro REM-13 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-14 — Persistir busca e drafts de tutor/pet

- Onda / prioridade / tamanho: R3 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Backend/persistence.
- Origem: AUD-F03; RF-020..024.
- Dependências: REM-13; gates CVG e externos aplicáveis conforme convenções.
- Onde: packages/tools, persistence e migrations aditivas.
- O que / como: Substituir matches vazios/objetos efêmeros por consultas e drafts persistentes em fixtures; resolver múltiplos matches sem associação automática ambígua.
- Critério de pronto: Criar, reiniciar e recuperar drafts; busca por identificador sintético; isolamento cross-tenant; nenhum vínculo quando ambíguo; vínculo autorizado rastreável à conversa.
- Evidência registrada ou pendente: registro REM-14 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-15 — Construir coleta estruturada e handoff completo

- Onda / prioridade / tamanho: R3 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Runtime + produto.
- Origem: AUD-F03/F01; RF-030/050/053.
- Dependências: REM-14, REM-05; gates CVG e externos aplicáveis conforme convenções.
- Onde: Runtime/workflows e painel de conversas.
- O que / como: Coletar somente campos operacionais definidos, manter progresso e montar resumo com origem/pendências; não gerar interpretação clínica.
- Critério de pronto: Retomada mantém dados; risco prevalece sobre coleta; resumo contém intenção, dados disponíveis, risco, pendências e próximo passo; operador assume e bot silencia.
- Evidência registrada ou pendente: registro REM-15 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-16 — Persistir sugestões e drafts de agenda

- Onda / prioridade / tamanho: R3 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Backend + tools.
- Origem: AUD-F03; RF-040..043.
- Dependências: REM-14, REM-07; gates CVG e externos aplicáveis conforme convenções.
- Onde: packages/tools, persistence e agenda controlada.
- O que / como: Usar catálogo sintético relativo ao relógio do teste; persistir sugestão/draft com expiração e idempotência; conectar approval sem confirmar consulta.
- Critério de pronto: Sem slots fixos vencidos; draft recuperável após reinício; conflito/expiração tratados; aprovação não executa confirmação/cancelamento/reagendamento real.
- Evidência registrada ou pendente: registro REM-16 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-17 — Completar tarefa e UX da jornada operacional

- Onda / prioridade / tamanho: R3 / P2 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Web + backend.
- Origem: AUD-F03/F06; RF-061; UC-07/08.
- Dependências: REM-15, REM-16; gates CVG e externos aplicáveis conforme convenções.
- Onde: apps/web, task contracts e API.
- O que / como: Vincular tarefa à sessão/conversa/contato permitido e exibir responsável/prazo quando definidos; tornar conflitos, pausa, loading e erros compreensíveis.
- Critério de pronto: Browser cobre identificar→triagem→draft→approval/handoff→tarefa; teclado e foco nos fluxos críticos verificados; referências pessoais redigidas; nenhuma ação sensível implícita.
- Evidência registrada ou pendente: registro REM-17 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-18 — Auditar secretária completa em fixtures

- Onda / prioridade / tamanho: R3 / P2 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: QA + produto.
- Origem: AUD-F03; UC-01..09.
- Dependências: REM-12, REM-17; gates CVG e externos aplicáveis conforme convenções.
- Onde: Test Lab, Playwright, PostgreSQL e docs/04_audit.
- O que / como: Executar matriz de jornadas e reavaliar os 39 RF com mesma rubrica; UC-09 permanece handoff seguro até fonte aprovada.
- Critério de pronto: Matriz indica entregue/parcial/ausente sem contar stub como integração; retomada, ambiguidade, erro de agenda e takeover passam; corpus safety sem regressão; gate R3 fechado.
- Evidência registrada ou pendente: registro REM-18 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-19 — Definir identidade, privacidade e contratos externos

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Security + operação + produto.
- Origem: AUD-F03/F06.
- Dependências: REM-08, REM-02; gates CVG e externos aplicáveis conforme convenções.
- Onde: docs/02_spec, docs/08_runtime e contratos de adapters.
- O que / como: Selecionar IdP/provider/canal/fonte somente após requisitos, orçamento e responsáveis; definir credenciais, retenção, limites de custo, egress e aprovação de conteúdo.
- Critério de pronto: Decisões de arquitetura/negócio e SPEC registradas; gate externo separado do BUILD local; responsável por fonte e operação definido; nenhuma credencial material em docs.
- Evidência registrada ou pendente: registro REM-19 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-20 — Implementar identidade e gestão de secrets

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Security/API + web.
- Origem: AUD-F06; RNF S02/S04/S05.
- Dependências: REM-19; gates CVG e externos aplicáveis conforme convenções.
- Onde: Resolver de identidade, console, configuração e deploy de teste.
- O que / como: Integrar primeiro com IdP de teste local; validar tenant/roles derivados da identidade, expiração, revogação e rotação; usar referências de segredo.
- Critério de pronto: Headers autoafirmados não autenticam; cross-tenant/role negativa bloqueados; logout/expiração tratados na UI; rotação testada sem vazamento; IdP externo exige autorização separada.
- Evidência registrada ou pendente: registro REM-20 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-21 — Implementar adapter de modelo com avaliação

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Runtime + QA.
- Origem: AUD-F03; RNF P02/P04.
- Dependências: REM-05, REM-19, REM-20; gates CVG e externos aplicáveis conforme convenções.
- Onde: packages/platform/model-provider e Test Lab.
- O que / como: Implementar contrato com mock local, timeout, limite de tokens/custo, falha segura e output safety; manter provider fake para regressão.
- Critério de pronto: Simulador local cobre timeout/erro/saída maliciosa; nenhum modelo concede permissão; sandbox externo só após gate; avaliação separa fixture de inferência efetiva e mede qualidade do corpus.
- Evidência registrada ou pendente: registro REM-21 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-22 — Implementar canal e entrega humana controlados

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Adapters + backend.
- Origem: AUD-F03; RF-001/004/053/072.
- Dependências: REM-12, REM-19, REM-20; gates CVG e externos aplicáveis conforme convenções.
- Onde: packages/adapters, worker e handoff.
- O que / como: Conectar mock de canal à outbox e ao destino humano fictício, com raw-body HMAC, deduplicação, retry e estado de entrega.
- Critério de pronto: Replay/timeout/crash não duplicam efeito no mock; decisão humana registra ator; takeover impede envio tardio; sandbox real, destinatários e teto de tráfego dependem de gate externo.
- Evidência registrada ou pendente: registro REM-22 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-23 — Implementar ciclo de conteúdo institucional

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Knowledge + security.
- Origem: AUD-F03; UC-09.
- Dependências: REM-19, REM-20; gates CVG e externos aplicáveis conforme convenções.
- Onde: packages/rag, catálogo knowledge e Test Lab.
- O que / como: Projetar ingestão/versionamento/aprovação/expiração/revogação; usar conteúdo sintético local; só permitir retrieval de versão aprovada e vinculada ao tenant.
- Critério de pronto: Sem fonte válida há handoff; resposta cita fonte/versão; revogação e mudança invalidam uso; conteúdo recuperado não altera policy; fonte institucional real exige aprovação do responsável antes de ingestão/resposta.
- Evidência registrada ou pendente: registro REM-23 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-24 — Implementar observabilidade e retenção

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Operação + backend.
- Origem: AUD-F06; RNF R05/S06.
- Dependências: REM-12, REM-19, REM-20; gates CVG e externos aplicáveis conforme convenções.
- Onde: Métricas, audit, replay/rate limit e runbooks.
- O que / como: Definir métricas de fila, falhas, latência, handoff e policy; alertas e retenção em ambiente sintético; limites compartilhados quando houver múltiplas instâncias.
- Critério de pronto: Alerta disparado por falha injetada; correlação fim a fim sem payload sensível; purge atende política aprovada; limiter/replay ensaiados entre duas instâncias; trilha necessária preservada.
- Evidência registrada ou pendente: registro REM-24 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-25 — Preparar artefato, restore e rollback

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Operação + persistence.
- Origem: AUD-F06.
- Dependências: REM-12, REM-19, REM-20; gates CVG e externos aplicáveis conforme convenções.
- Onde: Empacotamento/deploy de teste, migrations e docs/08_runtime.
- O que / como: Definir imagem/artefato reproduzível e scan aplicável, roles/RLS, backup/restore e reversão de configuração; ensaiar em banco descartável.
- Critério de pronto: Restore e rollback executados com integridade/tenant conferidos; RPO/RTO medidos versus metas aprovadas; nenhuma migration real feita; scan só é declarado após artefato existir.
- Evidência registrada ou pendente: registro REM-25 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-26 — Auditar integrações e operação em ambiente sintético

- Onda / prioridade / tamanho: R4 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: QA + security + operação.
- Origem: AUD-F03/F06.
- Dependências: REM-18, REM-21, REM-22, REM-23, REM-24, REM-25; gates CVG e externos aplicáveis conforme convenções.
- Onde: Ambiente integrado e docs/04_audit.
- O que / como: Consolidar jornadas, gates, custos medidos quando houver sandbox e matriz de dependências; identificar explicitamente tudo ainda mock.
- Critério de pronto: Gate R4 diferencia integração local, sandbox aprovado e operação real; segredos/redaction/isolamento/falhas passam; mocks não contam como readiness externa.
- Evidência registrada ou pendente: registro REM-26 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-27 — Medir carga, disponibilidade e SLAs

- Onda / prioridade / tamanho: R5 / P2 / L.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: QA/performance + operação.
- Origem: AUD-F06; RNF P01/P02/C05.
- Dependências: REM-26; gates CVG e externos aplicáveis conforme convenções.
- Onde: Harness de carga e runtime controlado.
- O que / como: Aprovar perfil de carga, amostra e duração antes de medir; ensaiar falhas, fila, concorrência e dependências indisponíveis.
- Critério de pronto: p95 persistência ≤2s e resposta ≤10s sob condições registradas; meta externa só validada com provider saudável autorizado; zero perda/dupla decisão no ensaio; RPO/RTO atendidos ou gap registrado.
- Evidência registrada ou pendente: registro REM-27 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-28 — Validar operação humana e acessibilidade

- Onda / prioridade / tamanho: R5 / P2 / M.
- Estado atual: `COMPLETED_CONTROLLED`. Owner proposto: Produto + QA + operação.
- Origem: AUD-F06; RF-080..084.
- Dependências: REM-26; gates CVG e externos aplicáveis conforme convenções.
- Onde: Console e roteiros de validação.
- O que / como: Executar roteiros com participantes autorizados usando casos fictícios; registrar sucesso, tempo, erro, teclado/foco e recuperação.
- Critério de pronto: Operador consegue assumir, decidir, investigar e recuperar erro; nenhum bloqueio grave de acessibilidade no escopo declarado; falhas viram backlog; não alegar certificação integral sem avaliação correspondente.
- Evidência registrada ou pendente: registro REM-28 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-29 — Emitir parecer de qualificação e decisão de piloto

- Onda / prioridade / tamanho: R5 / P1 / M.
- Estado atual: `NO_GO_CONTROLLED`. Owner proposto: Auditoria + responsáveis de negócio/security/operação.
- Origem: AUD-F01..07.
- Dependências: REM-27, REM-28; gates CVG e externos aplicáveis conforme convenções.
- Onde: docs/04_audit e checklist de piloto.
- O que / como: Reauditar achados e matriz RF/RNF; compor dossiê de evidências e plano de interrupção; submeter proposta concreta de piloto com tenant/canal/volume/horário e responsáveis.
- Critério de pronto: Sem P0/P1 e sem F05/F07 abertos; gates de dados/fonte/canal/identidade aprovados para qualquer piloto real; decisão humana registrada. Se negar ou faltar evidência, manter NO-GO e backlog explícito.
- Evidência registrada ou pendente: registro REM-29 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

### REM-30 — Refatorar hotspots conforme evidência de manutenção

- Onda / prioridade / tamanho: POST / P3 / M.
- Estado atual: `DEFERRED_OPTIONAL`. Owner proposto: Tech lead.
- Origem: AUD-F06.
- Dependências: REM-08, REM-02; gates CVG e externos aplicáveis conforme convenções.
- Onde: apps/api/src/server.ts e painel platform.
- O que / como: Selecionar um módulo por vez com dor mensurada, extrair responsabilidades sem alterar contratos; trabalho opcional, sem bloquear correções prioritárias.
- Critério de pronto: Diff limitado, contratos e regressão preservados; benefício demonstrado em revisão; não há reescrita ampla nem substituição automática da arquitetura.
- Evidência registrada ou pendente: registro REM-30 em `docs/04_audit/` ou seção identificável da evidência da onda, com resultados e limitações; atualizar task, runtime state e execution log após execução.

## Controle de mudanças e encerramento

O detalhamento aqui é autoridade das propostas REM-01..30; o backlog master mantém referência e estado agregado, evitando copiar fichas em vários arquivos. Preservar IDs ao decompor; usar subtasks REM-XX-A/B na SPEC e registrar dependências novas. Não reutilizar IDs S48 para remediações novas nem marcar tasks históricas como pendentes só porque a auditoria encontrou um novo caso.

Antes de iniciar cada task, conferir se código/documentação mudaram desde o baseline do relatório. Atualizar origem e aceite se necessário, com justificativa. As notas da auditoria permanecem históricas até nova avaliação. O programa só pode declarar cada achado encerrado com prova própria; completar um contrato ou uma task de planejamento não encerra um defeito de runtime.

Referências: [plano executivo](0311_plano_executivo_pos_auditoria.md), [roadmap](0312_roadmap_pos_auditoria.md), [backlog master](../30_backlog_master.md), [AGENTS](../07_agents/AGENTS.md).
