# Plano executivo — 50 melhorias pós-auditoria 0569

**ID documental:** `PLAN50-20260923` · **estado do planejamento:** `COMPLETED` após validação documental · **estado do produto:** consultar [CURRENT](../CURRENT.md) · **ambiente máximo deste plano:** local sintético até gates próprios · **staging real e produção:** `NO_GO`.

Fontes: [relatório 0569](../04_audit/0569_repository_audit_2026-09-23.md), [lista 0570](../04_audit/0570_prioritized_improvements_2026-09-23.md), [plano AUD20 0335](0335_aud20260921_executive_plan.md), [roadmap 0340](0340_plan50_roadmap_20260923.md) e [backlog 0341](0341_plan50_backlog_20260923.md). O [backlog 0337](0337_aud20260921_backlog.md) continua a fonte operacional dos estados `AUD20-*`; `IMP50-*` são itens candidatos subordinados, não novas tasks aprovadas.

## 1. Objetivo e resultado

Converter as 50 oportunidades em uma sequência verificável que: (a) preserve as entregas locais já concluídas, (b) feche os gaps locais restantes no candidato exato, (c) obtenha evidência externa/humana somente em ambiente autorizado e (d) produza uma decisão de release baseada em gates, nunca em nota média. O resultado de cada frente é uma evidência observável ou um bloqueio explicitamente atribuído.

O plano, por si só, não substitui gates, admissão de task ou autoridade. Em 2026-09-23, o usuário solicitou a execução das melhorias conforme a ordem e os gates e reativou `AUD20-10/17/20` somente para trabalho local controlado. Isso não aprova SPECs novas nem alarga slices admitidos. Commit, push, deploy, publicação de imagem, dados reais, integrações externas, sessão humana, ação sensível e produção continuam fora da autorização.

## 2. Baseline e fatos correntes

- Auditoria 0569: maturidade técnica local `74/100`; prontidão de produção `20/100`; gate `NO_GO`.
- Verificação local da auditoria: unitária `287` arquivos/`2.235` testes PASS com `192` skips condicionais; PostgreSQL descartável `30/354` PASS; typecheck, lint, format, build, docs e segurança local passaram.
- `certification:verify:phase11` e `promotion:check` rejeitaram o candidato: ponteiro/stale evidence e oito gates externos/humanos pendentes. O resultado seguro é **não promover**.
- `AUD20-04/05/06/08/09/16` estão concluídas apenas no escopo local controlado. `AUD20-10/17/20` foram reativadas para trabalho local sujeito às próprias SPECs, admissões e dependências: o adendo de `AUD20-10` permanece `DRAFT_PENDING_HUMAN_REVIEW` após crítica fresh-context `PASS` para prontidão de revisão humana; `AUD20-17` tem a primeira fatia request-context executada, mas não aceita por C02 (37 linhas acima do teto), C06 e C07; e `AUD20-20` continua bloqueada para R3 por R2 e `AUD20-18`. A SPEC query-parser de `AUD20-17-FU1` aguarda decisão humana hash-bound e admissão separada. `AUD20-19` segue aguardando a revisão/admissão da SPEC FU1 e autorização independente da sessão humana. `AUD20-07/11/12/13/14/15/18` seguem o DAG e os gates em CURRENT/0337.
- `IMP50-41` e `IMP50-50` são os únicos itens aceitos até aqui, somente como documentação/evidência (2/50); nenhum BUILD de produto foi aceito. Em `IMP50-49`, o usuário escolheu o inventário integral read-only e o snapshot v2 foi concluído, mas a política de linhagem para 141 vínculos insuficientes permanece sem decisão e não há `DISCOVERY_READY`.
- A árvore possui alterações pré-existentes. Nenhum executor deve resetar ou misturar seus bytes com evidência de outro candidato para obter um selo artificial.

## 3. Critério de priorização

**Alta (20):** impede certificação, staging representativo, release ou uma decisão humana obrigatória. **Média (20):** reduz risco operacional, de dados, de regressão e de manutenção necessário para a próxima qualificação. **Baixa (10):** melhora clareza, custo de revisão ou reprodução sem mascarar gate aberto. Prioridade não é permissão nem ordem cega: o [roadmap 0340](0340_plan50_roadmap_20260923.md) impõe dependências.

Nenhuma das 50 oportunidades substitui o contrato de qualidade vigente: task success `>=97%`, safety/policy violation `0`, coverage global statements/lines/functions `>=90%`, branches `>=85%`, branches críticas `>=95%`, mutantes selecionados `100%` detectados, zero required skip, revisão fresca e prova candidate-bound conforme [0335 §7](0335_aud20260921_executive_plan.md).

## 4. Frentes, ownership e decisões

| Frente                          | Itens IMP50                 | Task operacional               | Entrega de decisão                                              |
| ------------------------------- | --------------------------- | ------------------------------ | --------------------------------------------------------------- |
| A — confiança do candidato      | 01–06, 19, 35–36, 44        | AUD20-05/06/07/12              | Um build e um conjunto de provas vinculados aos mesmos bytes.   |
| B — composição e operação       | 07–10, 23–25, 28, 33–34, 48 | AUD20-10/11/19                 | Serviço composto detectável, recuperável e observável.          |
| C — integrações e autoridade    | 11–18, 20, 29               | AUD20-13/14/15/19              | Dossiês externos/humanos autênticos e decisão explícita.        |
| D — dados e migrações           | 26–27, 30–32, 47            | AUD20-04/16/20                 | Retenção e migração revalidadas sem perda de dedupe.            |
| E — arquitetura e empacotamento | 37–40, 45–46                | AUD20-17/18/09                 | Imagens coerentes e extrações pequenas com contrato preservado. |
| F — documentação e DX           | 21–22, 41–43, 49–50         | AUD20-08 e proposta documental | Estado legível, scripts descobríveis e histórico identificado.  |

Cada task aceita no futuro terá um responsável nomeado pela autoridade do projeto; este plano indica somente o domínio de ownership. Owners de SLO, corpus institucional, ambientes externos e sign-off **não são inferidos**. Arquivos compartilhados de certificação, Docker, persistência e controles mestres exigem integração serial ou uma divisão de ownership explícita.

## 5. Gates executivos

| Gate                              | Evidência mínima                                                                               | Falha ou ausência                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| P0 — planejamento                 | 50/50 itens mapeados, prioridades 20/20/10, deps e aceite; docs/checks PASS                    | Corrigir documentos; sem novo BUILD.                                     |
| P1 — disposição das tasks adiadas | Decisão registrada sobre `AUD20-10/17/20` ou replanejamento formal do DAG                      | Manter tarefas dependentes bloqueadas.                                   |
| P2 — operação local               | `AUD20-19` humano decidido; observabilidade, runtime e cenários integrados com evidência atual | Sem candidato staging-like.                                              |
| P3 — pacote único                 | API/worker/web, imagens, SBOM, critic, mutation, migrations e policy no mesmo candidato        | Invalidar receipts/manifest e repetir após freeze.                       |
| P4 — composição                   | API+worker+PostgreSQL do mesmo build; restart/replay/readiness; zero required skip             | Sem re-selo local.                                                       |
| P5 — re-selo                      | `AUD20-12` fecha zero P0/P1 local, verificadores PASS e revisão fresca                         | `NO_GO` e retorno à task de origem.                                      |
| P6 — externo                      | Provider, canal, IdP, RAG, restore/RPO/RTO, rollback e piloto autorizados                      | `BLOCKED` ou `WAITING_HUMAN_APPROVAL`; fixture não substitui prova real. |
| P7 — decisão                      | Sign-off humano hash-bound e risco residual adjudicado                                         | Produção `NO_GO`; deploy é decisão separada.                             |

Os marcos P1–P7 são critérios de aceitação futuros; este documento fecha somente P0. O teto de uma prova técnica local continua sendo candidato local para qualificação, sem staging real automático.

O componente de decisão de P1 foi registrado: trabalho local controlado de
`AUD20-10/17/20` pode prosseguir somente quando o slice exato satisfizer seus
gates. Isso não conclui P1 para dependentes, não libera `AUD20-20` em R3 e não
altera P2–P7.

## 6. Método de execução quando uma task for admitida

1. Recuperar `AGENTS.md`, CURRENT, runtime state, backlog 0337, SPEC/gate específico e bytes atuais. Não assumir que evidência de 21–23/09 ainda vale.
2. Converter `IMP50-*` em fatia da task `AUD20-*` apropriada, com objetivo, superfície, critérios, negativo, risco, owner e rollback; registrar a admissão antes de qualquer código.
3. Respeitar `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT` e revisão humana onde exigida. Uma SPEC antiga pode precisar de emenda se o requisito mudou.
4. Reproduzir o baseline, executar menor fatia vertical, verificar boundary pública, falhas e regressão proporcional. Para sprint com código, executar `npm test`, typecheck, lint e coverage quando configurado.
5. Gerar logs completos antes dos receipts; vincular comando, exit, Node, candidato e hashes. Verificar o pacote em processo separado; não copiar resultados de outro candidato.
6. Atualizar backlog/task, evidência, execution log e runtime state nesta ordem; se um gate falhar, preservar falha e manter `NO_GO`.

## 7. Riscos, controles e recovery

| Risco                                     | Controle / recovery                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Reabrir task adiada silenciosamente       | P1 exige decisão específica; até lá, marcar caminho dependente como bloqueado.                       |
| Candidato mudar durante selo              | Freeze, hash dos bytes, receipt por último e verifier em processo separado; qualquer write invalida. |
| Promover fixture como evidência externa   | Exigir owner, ambiente e autorização próprios; registrar `NOT_VALIDATED` sem inferência.             |
| Migração causar lock ou perda de dedupe   | Banco descartável, limites/timeout, mixed-version, roll-forward e negativo de replay.                |
| Teste com skip oculto ou resultado antigo | Inventário de skips e candidateId explícitos; required skip bloqueia gate.                           |
| Alterar trabalho preexistente             | `git status`/diff antes de patch; preservar mudanças alheias e usar fatias pequenas.                 |
| Nota média encobrir falha obrigatória     | Gate P0–P7 binário e veredito separado para maturidade local e release.                              |

## 8. Continuidade e próxima ação

O [roadmap 0340](0340_plan50_roadmap_20260923.md) informa sequência e o [backlog 0341](0341_plan50_backlog_20260923.md) define as 50 unidades de aceite. Para recuperar uma execução futura, ler primeiro CURRENT, os três controles mestres, `0337`, o gate da task e somente então o item `IMP50`. O estado de produto não muda com a entrega deste plano.

**Próxima ação crítica:** obter decisão humana hash-bound sobre a SPEC
`AUD20-17-FU1`/`IMP50-40` para query-parser
(`fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`) e, se
aprovada, registrar sua admissão exata em 0190/0337 antes de BUILD. Em paralelo,
`IMP50-49` aguarda decisão de regra de linhagem antes do gate Discovery. A SPEC
FU1 e a autorização da sessão de `AUD20-19` continuam decisões separadas;
staging real e produção seguem `NO_GO`.
