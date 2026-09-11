# 0311 — Plano executivo de evolução pós-auditoria

Data: 2026-09-05. Programa: `REM-0539`. Fonte: [auditoria 0539](../04_audit/0539_documentation_implementation_review.md). Estado: **EXECUÇÃO CONTROLADA — R1–R4 CONCLUÍDAS / R5 NO-GO CONTROLADO**; REM-04–28 concluídas no escopo local controlado, REM-29 registrou NO-GO e REM-30 ficou opcional/deferida. Produção e piloto real permanecem NO-GO. [Dossiê R3](../04_audit/0546_rem0539_r3_evidence.json), [R4](../04_audit/0547_rem0539_r4_evidence.json) e [R5](../04_audit/0548_rem0539_r5_qualification_evidence.json).

## Recomendação executiva

Concentrar o próximo ciclo em corrigir segurança e integridade, tornar o processamento durável e completar as jornadas da secretária em ambiente sintético. Preservar Control Plane, versões imutáveis, PostgreSQL/RLS, Test Lab e painel já construídos. Integrações externas e piloto vêm depois de provas de funcionamento e aprovação específica.

O programa organiza remediação e evolução; o BUILD autorizado nesta rodada permanece controlado por gates, sem contratação, integração externa ou produção. A entrega de execução é incremental e chega a um **dossiê de qualificação para decisão de piloto**, com lacunas e riscos explicitados; não promete produção irrestrita ao final de um calendário.

## Ponto de partida

| Dimensão                | Nota auditada /100 | Implicação                                                                       |
| ----------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Geral                   | 69                 | Boa base técnica, produto incompleto                                             |
| Funcional PRD           | 61,4               | Cadastro, agenda e integrações têm lacunas centrais                              |
| Plataforma controlada   | 85                 | Evoluir incrementalmente o que já funciona                                       |
| Segurança operacional   | 60                 | Três correções prioritárias antes de ampliar exposição                           |
| Testes e engenharia     | 88                 | Manter gates e acrescentar casos que revelaram falhas                            |
| Documentação/governança | 72                 | Conciliar fontes atuais e históricas                                             |
| Operação real           | 25                 | Piloto depende de identidade, retenção, integração, recuperação e decisão humana |

Os números e resultados de testes são históricos da auditoria de 2026-09-05, não reexecutados para este planejamento. O programa não tem como objetivo apenas elevar uma nota: fechamento exige comportamento e evidência. A confiança no proxy tem impacto condicionado ao acesso direto à origem; a sobrescrita de approval foi demonstrada em snapshots do repositório, sem dupla decisão reproduzida na tentativa HTTP. Preservar essas distinções nas comunicações.

## Resultados de negócio e entregas

| Resultado esperado                        | Entrega verificável                                                     | Responsável sugerido                     |
| ----------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| Encaminhamento humano seguro              | Risco prevalece sobre agendamento; preflight bloqueia regressão         | Runtime/policy + responsável operacional |
| Decisões confiáveis                       | Uma decisão vencedora por approval de atendimento e trilha consistente  | Persistence/API                          |
| Nenhuma mensagem aceita perdida no ensaio | Outbox/worker com recuperação e deduplicação demonstradas               | Backend + QA                             |
| Atendimento investigável e útil           | Cadastro/drafts, coleta, agenda controlada, handoff e tarefa integrados | Produto + backend + web                  |
| Conexões governadas                       | Identidade, canal/modelo e knowledge por contratos e gates próprios     | Security + integração + operação         |
| Decisão de piloto baseada em fatos        | Carga, restore, operação humana e auditoria com riscos residuais        | Auditoria + sponsor                      |

## Escopo e escolhas propostas

Prioridade inicial: AUD-F01 (P1), AUD-F05 (P2) e AUD-F07 (P2). A ordem executiva não altera a severidade original: proxy e concorrência entram na primeira onda porque são pré-requisitos de exposição e operação multiusuário.

No núcleo estão fila/outbox, tutor/pet, drafts de agenda, triagem operacional, handoff, tarefas, UX e rastreabilidade. Nas integrações, iniciar por mocks locais e dados sintéticos; qualquer sandbox externo exige autorização própria, mesmo sem dados reais. O catálogo de fonte não substitui aprovação do conteúdo; o catálogo de plugin não instala código.

Ficam fora: marketplace aberto, billing, diagnóstico/prescrição, prontuário definitivo, confirmação/cancelamento/reagendamento real automático e produção irrestrita. A decisão sobre RF-011/LangGraph será registrada antes da evolução de workflows; este plano não escolhe reintroduzir biblioteca nem remover requisito silenciosamente. Refatoração de hotspots é opcional e orientada por evidência.

## Sequência e horizonte

| Onda | Objetivo                         | Duração indicativa | Gate de saída                                                         |
| ---- | -------------------------------- | ------------------ | --------------------------------------------------------------------- |
| R0   | Alinhar baseline e decisões      | 0,5–1 semana       | G0: escopo e gates das correções registrados                          |
| R1   | Corrigir segurança e integridade | 2–3 semanas        | G1: F01/F05/F07 fechados por regressão e audit                        |
| R2   | Garantir processamento durável   | 2–3 semanas        | G2: aceitação, crash/retry e entrega controlada comprovados           |
| R3   | Completar jornadas em fixtures   | 3–4 semanas        | G3: cadastro, coleta, drafts, tarefas e handoff integrados            |
| R4   | Preparar integrações e operação  | 4–6 semanas        | G4: identidade, contratos externos, conteúdo e operação auditados     |
| R5   | Qualificar e decidir piloto      | 2–3 semanas        | G5: carga, operação humana e parecer; piloto só por decisão explícita |

Estimativa inicial de ordem de grandeza: **14–20 semanas de execução**, arredondando a soma sequencial de 13,5–20 semanas. Hipótese: dois profissionais de engenharia dedicados, QA com disponibilidade parcial e acesso regular a produto, security e operação. Não há equipe ou capacidade confirmada. Os intervalos incluem detalhamento, implementação e validação ordinária; esperas por decisões, contratos, credenciais e disponibilidades de usuários ficam fora. Piloto real e refatoração opcional também ficam fora desse horizonte.

Reestimar ao fechar R0 e após medir a primeira onda; datas só podem ser fixadas com capacidade, escopo e gates confirmados. O roadmap explicita sobreposições possíveis, sem descontar ganhos hipotéticos no compromisso. Com menos capacidade, ajustar escopo e prazo; não inferir proporcionalidade exata.

## Recursos, custo e governança

Responsabilidades são papéis propostos, não pessoas alocadas. Sponsor/produto decide escopo e aceita valor; tech lead mantém arquitetura e dependências; engenharia implementa; QA/auditoria verifica; security/operação valida acesso, recuperação e risco; responsável institucional aprova fontes e encaminhamento humano.

Não há orçamento financeiro estimado sem taxas, capacidade e fornecedores. Fórmula para orçamento futuro: esforço aprovado × custo diário por papel + infraestrutura de teste + consumo externo aprovado + reserva de risco explícita. Definir teto de consumo antes de qualquer sandbox e registrar realizado versus previsto por onda.

Reunião semanal curta: entregas aceitas, riscos, bloqueios, consumo e previsão. Demo e gate ao fim da onda. Limitar trabalho em execução à capacidade disponível, preferencialmente duas tarefas de engenharia e uma validação; correções críticas não disputam prioridade com novas integrações. Alteração de escopo/autonomia requer decisão registrada e reavaliação de risco.

## Indicadores e critérios de decisão

| Indicador           | Meta proposta / origem                                                      | Como provar                                                                                  |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Risco composto      | 100% do corpus crítico aprovado encaminhado; zero tools em casos bloqueados | Corpus versionado com exemplos benignos e adversariais; não representa precisão populacional |
| Decisão concorrente | Uma transição final por approval de atendimento                             | Barreira de leitura e transações concorrentes em PostgreSQL                                  |
| Mensagem aceita     | Zero perda e zero efeito duplicado no ensaio controlado                     | Falhas antes/depois de commit, efeito e ack; conciliação de registros                        |
| Desempenho          | p95 persistência ≤2s; resposta ≤10s nas condições do PRD                    | Perfil de carga/amostra pré-definido; provider saudável autorizado para meta externa         |
| Engenharia          | Gates verdes e coverage ≥80% em cada dimensão                               | Verify, PG, browser, worker conforme escopo; skips declarados                                |
| Recuperação         | RPO/RTO a aprovar em R4, sem valores inventados                             | Restore/rollback cronometrados e integridade conferida                                       |
| Qualificação        | Zero P0/P1 e F05/F07 fechados; demais riscos aceitos explicitamente         | Auditoria nova e decisão humana de piloto                                                    |

Nenhuma taxa operacional ou economia foi comprovada na auditoria. Metas novas de usabilidade, custo e disponibilidade serão fixadas antes dos ensaios; não podem ser escolhidas depois de observar resultados para declarar sucesso.

## Decisões pendentes e riscos

| Decisão/risco                      | Quando resolver              | Tratamento                                                             |
| ---------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| Equipe, capacidade e orçamento     | R0                           | Sponsor confirma responsáveis; reestimar roadmap                       |
| RF-011 e fonte documental atual    | R0/R3                        | Decisão de produto/arquitetura explícita, preservando histórico        |
| Escopo das três correções          | Antes de R1 BUILD            | Discovery→PRD→SPEC e revisão humana exigida pelo AGENTS                |
| Fila, IdP, provider, canal e fonte | R2/R4                        | Escolher por contrato e evidência; não comprar/conectar por este plano |
| Falsos negativos de risco          | R1 e toda mudança do runtime | Corpus adversarial, preflight e handoff; não confiar só em cobertura   |
| Duplicação/perda em falha externa  | R2/R4                        | Semântica de entrega e idempotência explícitas; testes de crash        |
| Espera por acessos e aprovações    | R4/R5                        | Manter caminhos locais úteis; não considerar espera como aprovação     |
| Dados, conteúdo e piloto           | Antes de qualquer uso real   | Retenção/acesso/fonte/destinatários e signoff específicos              |

## Primeira ação e conclusão

REM-01 e REM-03 foram revalidadas/contratadas; REM-04–08 fecharam R1, REM-09–12 fecharam R2, REM-13–18 fecharam R3 e REM-19–26 fecharam R4 no escopo controlado. REM-27/28 foram medidos localmente, REM-29 registrou NO-GO e REM-30 permanece opcional. REM-02 continua pendente de decisão humana sobre RF-011; nenhuma decisão de produção ou piloto real foi inferida.

Documentos complementares: [roadmap](0312_roadmap_pos_auditoria.md) e [backlog](0313_backlog_pos_auditoria.md). O programa encerra quando o dossiê de qualificação é entregue e a decisão de piloto é registrada, inclusive se for NO-GO; o produto somente é declarado apto quando todos os aceites do escopo aprovado forem atendidos.

## Estado de execução em 2026-09-05

- **G1–G4:** concluídos no escopo controlado, com evidências específicas e revisão independente.
- **G5:** parecer controlado `NO-GO`; p95 local de persistência 45 ms e resposta 420 ms, mas identidade, provider, canal, fonte institucional, signoff humano e metas RPO/RTO ainda não têm gate aprovado.
- **Próxima decisão:** responsável humano deve resolver RF-011 e os gates externos; depois repetir a qualificação com perfil e metas aprovados.
- **Limite:** não houve dado real, deploy, provider/canal externo, fonte institucional aprovada, participante humano ou ação sensível.

## Evidência da entrega documental

Validação documental de PLAN-0539-001: 30 IDs únicos, dependências existentes e sem ciclos, sete achados mapeados, links locais válidos, Prettier e git diff --check PASS; testes docs-readiness/construction-readiness: 2 arquivos e 11 testes PASS. Nenhum gate de produto foi reexecutado ou aprovado por esses checks.
