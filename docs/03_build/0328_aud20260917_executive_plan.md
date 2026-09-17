# Plano executivo — evolução Triple AAA pós-auditoria de 17/09/2026

**Programa:** `AUD17-AAA` · **estado:** planejamento documental · **fonte:** [auditoria 0565](../04_audit/0565_recent_implementations_audit_2026-09-17.md) · **execução:** [roadmap 0329](0329_aud20260917_roadmap.md) e [backlog 0330](0330_aud20260917_backlog.md).

## Resultado e fronteira

Elevar os nove itens auditados até um candidato Triple AAA com evidência executável, reproduzível e atual. A meta existente do programa de produção é **≥97/100 em cada dimensão exigida**, sem compensação por média e com **zero P0/P1 aberto**. A nota não substitui critério obrigatório. O resultado tem quatro estados separados: qualidade de engenharia local; integração externa validada; piloto supervisionado; garantia de produção. Somente o primeiro pode avançar integralmente com fixtures e ambiente local controlado.

Este plano não implementa código nem concede `G_SPEC`, `G_QUALITY`, `G_EXTERNAL` ou `G_RELEASE`. Preserva proibições atuais: sem dados reais, RAG sem fonte institucional aprovada, confirmação/cancelamento/reagendamento automático de consulta real, ação clínica/financeira/prontuário definitivo, efeito externo ou produção irrestrita. Trabalho sensível exige approval ou handoff. A autorização aplicável deve ser conferida por task antes do BUILD; validação externa, piloto e deploy exigem escopo e ambiente próprios.

## Baseline recuperado

- Candidato histórico selado: `c8e514d`. Pacote Phase 11.2: 34 gates locais PASS; unit 1.772 PASS/117 skips; PostgreSQL descartável 201 PASS; E2E 9/9; coverage 89,49% statements, 82,59% branches, 88,50% functions, 90,03% lines. Esses números pertencem ao candidato selado, não à árvore atual.
- A árvore atual contém relatório e atualizações de estado/log/backlog não selados; `phase11-verify` falhou por candidato stale/dirty/hash drift. Nenhum executor pode herdar o `PASS` de `c8e514d` para bytes novos.
- Auditoria: orquestração 88; persistência 85; efeitos 88; segurança 84; certificação 88; testes 84; console 82; controle 65; produção 15. Achados estáveis `AUD-20260917-01..04`.
- O preflight de produção é declarativo: verifica env e fontes locais. Entrypoints têm travas próprias, mas o preflight não comprova banco, RLS, migrações aplicadas ou aprovações externas.
- Oito gates externos/humanos seguem sem validação; `promotion-check --requested PRODUCTION` devolveu `eligible=false`.

## Estratégia de execução

Manter monólito modular e o caminho vigente identidade→HTTP→PostgreSQL/outbox→worker→runtime→policy/approval→journal→adapter controlado→audit/console. Não criar serviço ou fila nova sem requisito medido. Para cada task: congelar expectativa e negativo; reproduzir baseline; implementar a menor mudança conectada; testar sucesso e falha na fronteira pública/persistente; revisar diff; obter crítica distinta; integrar; atualizar evidência, backlog, log e estado. Mudança de PRD ou contrato arquitetural retorna ao gate respectivo; não adaptar o gate para acomodar a implementação.

### Regras técnicas que não podem regredir

1. Tenant, ator confiável, capability, risco, idempotency key e correlação acompanham todo percurso; entrada não confiável nunca escolhe autoridade.
2. Mutação e audit local compartilham transação quando exigido; efeito externo só após commit, por outbox/journal, com `UNCERTAIN` e reconciliação explícita no resultado ambíguo.
3. Lease/fencing/CAS impedem worker vencido, retry duplicado, aprovação concorrente e settlement obsoleto.
4. Budget, deadline, limite de iterações e loop sobrevivem a restart; replan aponta para avaliação persistida e não reaproveita efeito.
5. Preflight de produção falha fechado no bootstrap e no pipeline de promoção, mas sua checagem declarativa não é prova de aprovação humana ou estado real da infraestrutura.
6. Console é leitura tenant-scoped; evidência visual inclui estados reais ou fixtures claramente rotuladas, erros, vazio, loading, retry, teclado e 375/768/1440.

## Barra de qualidade e evidência

Os alvos existentes do programa de produção permanecem: coverage global statements/lines/functions ≥90%, branches ≥85%, branches críticos ≥95%, mutantes críticos selecionados 100% detectados; ≥97/100 por área quando houver rubrica aprovada. Baseline Phase 11.2 fica abaixo de parte desses pisos. Não elevar nota com fórmula binária. Para cada dimensão, a rubrica deve publicar subcritérios, pesos, amostra, evidência atual, `NOT_EXECUTED` e regra de bloqueio. `PASS` requer execução no candidato, ambiente identificado e controle negativo. Skips devem ser inventariados e justificados; skip de critério obrigatório bloqueia o gate.

Gates de saída por marco:

| Gate                     | Prova exigida                                                                                                                                       | Se falhar                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| G0 — baseline/contrato   | hashes, dirty state, requisitos→tasks→testes, negativos e task com WHAT/WHERE/HOW/DoD                                                               | manter candidato não qualificado; voltar a AUDIT/SPEC |
| G1 — integridade local   | orquestração, SQL, efeitos e segurança com falhas injetadas, restart, concorrência e tenant                                                         | corrigir task de origem; sem promoção                 |
| G2 — qualidade integrada | Node 22, instalação limpa, format/typecheck/lint/build, unit, coverage, PG, E2E, evals/chaos, security/supply e crítica distinta no mesmo candidato | `NO_GO`; não suavizar metas                           |
| G3 — operação externa    | provider/canal/IdP/RAG aprovados, RPO/RTO, rollback e piloto medidos com donos e ambiente autorizados                                               | permanecer `CONTROLLED_LOCAL`/`STAGING` condicionado  |
| G4 — release             | dossiê hash-bound, zero P0/P1, alertas/runbooks/on-call, signoff humano para digest/config exatos                                                   | produção `NO_GO`; deploy requer autorização própria   |

## Decisões e riscos

- **D-17-01, proposta:** onde o preflight vira obrigatório (entrypoint, deploy pipeline ou ambos). A task `AUD17-07` compara os caminhos e congela a escolha na SPEC; nenhum env flag isolado vira atestado externo.
- **D-17-02, pendente de dono de operação:** workload, SLO, hardware, janela de soak e RPO/RTO. O laboratório mede sem transformar alvo proposto em compromisso.
- **D-17-03, pendente dos donos externos e segurança:** provider, canal, identidade, corpus RAG aprovado, credenciais/egress e ambiente de homologação. Até decisão, usar adapters falsos.
- **D-17-04, pendente de autoridade humana:** piloto, rollback operacional, risco residual e signoff por candidato. Não inferir aprovação de um teste ou deste plano.

Risco dominante: o selo muda a cada arquivo no escopo candidato, inclusive documentação. Congelar o candidato somente após a última alteração aplicável, executar certificação em checkout limpo, commitar o pacote pela rota existente e verificar ponte/descendência. Mudança posterior reabre o selo. A reconciliação inicial não exige repetir 34 gates até existir candidato final; teste focado proporcional prepara a correção, certificação completa fecha o marco.

## Estado e retomada

Em 17/09/2026, somente o planejamento foi produzido; nenhuma task `AUD17` está implementada ou verificada. O agente começa por `AUD17-01`: ler AGENTS, estado/log/backlog, relatório, SPEC Phase 11.2 e status Git; preservar alterações não commitadas da auditoria; registrar snapshot e negativos do certificado stale. Depois segue o DAG do backlog, um gate por vez. O backlog 0330 é a fonte operacional deste programa; o backlog mestre apenas aponta para ele. Ao fechar uma task, registrar evidência do candidato exato e atualizar os três controles CVG. A próxima ação segura é preparar o contrato e baseline `AUD17-01`; nenhuma integração real é necessária para isso.
