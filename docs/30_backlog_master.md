# Decisões 2026-09-25

- [x] R2 solicitado; PostgreSQL e mutation admitidos; fluxos aprovados; sessão adiada — ver recibo.
- [ ] Executar R2 → mutation → PostgreSQL com evidência própria. Staging/produção `NO_GO`.

# Dossiês C06 — 2026-09-25

- [x] 3 pedidos preparados (coverage, mutante, desbloqueio) — `WAITING_HUMAN_APPROVAL`.
- [ ] Aguardar decisões. Staging/produção `NO_GO`.

# Item A concluído — 2026-09-25

- [x] Binding HEAD-anchored remediado (`5b93ff3` + testes); re-certificação com verify PASS estável; errata de proveniência.
- [ ] Item B: dossiês dos 8 gates externos/sign-off (owners/credenciais). Staging/produção `NO_GO`.

# Reseal AAA concluído — 2026-09-25

- [x] Correções aplicadas (e2e, pin, critic fresh); reseal com PostgreSQL: `CONDITIONAL_GO`/`AAA_CANDIDATE`, todos os gates locais PASS; verify PASS no snapshot.
- [ ] Decidir rota de release: binding HEAD-anchored, dossiês externos/sign-off ou owner/SLO. Staging/produção `NO_GO`.

# Reseal executado — 2026-09-25

- [x] Pin do manifesto corrigido; pacote novo `phase11-06e1477ebe76b2f5-muh112ux` (`NO_GO` fail-closed) substitui o stale.
- [ ] Remediação: e2e do harness AUD20-19, critic report Phase 11, certify com PostgreSQL descartável. Staging/produção `NO_GO`.

# AUD20-10 C02/C04/C05 aceito — 2026-09-25

- [x] Latência real + ledger de entrega + exercício fechando ciclo; crítica delta `PASS`; gates verdes (mutation `26/26`).
- [ ] C01–C07 abertos (owner/SLO); pin do manifesto a reconciliar no reseal. Staging/produção `NO_GO`.

# Preflight do reseal executado — 2026-09-25

- [x] Read-only: verify FAIL fail-closed (25 falhas) e promotion inelegível (8 gates externos); delta registrado.
- [ ] Decisão humana para reseal/regeneração do pacote; demais frentes aguardam decisão. Staging/produção `NO_GO`.

# R0 concluído — 2026-09-25

- [x] Worktree consolidado em 4 commits; 5 deleções de `.gauntlet` commitadas; **SEALED** em `25c8222` (v3).
- [ ] Preflight read-only do reseal (R4). Staging/produção `NO_GO`.

# AUD20-10/IMP50-09 aceito — 2026-09-25

- [x] Crítica delta `PASS`; mutation final `22/22`; suíte `2.647 PASS`/192 skips; condições registradas.
- [ ] C01–C07 abertos (alertas/delivery ledger, owner/SLO) exigem decisão/admissão próprias. Staging/produção `NO_GO`.

# AUD20-10 BUILD executado — 2026-09-25

- [x] Slice IMP50-09 executado na allowlist; gates PASS (suíte 2.647/192, coverage 4/4 ≥90%, mutation dirigida 22/22).
- [x] Crítica v1 `CONDITIONAL` remediada (F1–F6); manifesto de mutantes v2.
- [ ] Crítica delta e disposição do slice. Staging/produção `NO_GO`.

# Aceite limitado de AUD20-17 — 2026-09-25

- [x] C06/C07 `PASS` por crítica final; aceite limitado registrado (condições de reabertura).
- [x] "Sem redução" reference-only (0 regressões/210); `AUD20-11` desbloqueada; `AUD20-10` liberada.
- [ ] Executar `AUD20-10` (collector admitido). Staging/produção `NO_GO`.

# Crítica de coverage PASS — 2026-09-25

- [x] Pilar de coverage adjudicado por crítica (4/4 pisos; inventário v2 após MINOR).
- [ ] Disposição formal de C06/C07 (governança/humano). Staging/produção `NO_GO`.

# Coverage 4/4 pisos — 2026-09-25

- [x] Branches 90,19%; functions 91,35%; statements 92,99%; lines 93,49%; binding por inventário/log/resumo.
- [ ] Crítica independente para adjudicar C06. Staging/produção `NO_GO`.

# C06 avança — 2026-09-25

- [x] Coverage admitido executado (functions 90,04%, request-context 100%).
- [x] Mutante refrescado (`DETECTED`); `AUD20-11` desbloqueada condicionalmente.
- [ ] Branches global 87,62% + binding para fechar C06. Staging/produção `NO_GO`.

# PostgreSQL executado — 2026-09-25

- [x] Gate admitido: 30/354, zero skip, teardown comprovado, contêiner destruído.
- [ ] Dispor C06 restante + desbloqueio próprio de `AUD20-11`. Staging/produção `NO_GO`.

# Mutation executada — 2026-09-25

- [x] Sentinel admitido: 15/16 detected, 1 N/A (`mutation_target_stale`, sem PASS); relatório registrado.
- [ ] PostgreSQL admitido a executar. Staging/produção `NO_GO`.

# R2 concluído — 2026-09-25

- [x] R2 de FU1: `PASS` (harness local); parecer registrado; sem aceite de produto.
- [ ] Mutation admitida e PostgreSQL admitido a executar. Staging/produção `NO_GO`.

# Pedidos B25-08/B25-09 — 2026-09-25

- [x] Dossiês de re-selo e 8 gates preparados — `WAITING_HUMAN_APPROVAL`.
- [ ] Preparação documental esgotada; aguardar humanos. Staging/produção `NO_GO`.

# Pedidos de decisão/admissão — 2026-09-25

- [x] 4 dossiês preparados (R2, sessão humana, PostgreSQL, mutation) — `WAITING_HUMAN_APPROVAL`.
- [ ] Aguardar respostas hash-bound; nada executa sem elas. Staging/produção `NO_GO`.

# AUD-20260925-REPO — itens executáveis concluídos; gates seguem bloqueados — 2026-09-25

- [x] B25-01/R0: selagem com manifesto v2 (`NOT_SEALED_FOR_RELEASE`, worktree 77/5/274); evidência em `04_audit/evidence/AUD-20260925-REPO/`.
- [x] B25-02/R1: reconciliação read-only (binding `INCOMPLETO`, 339/348, `REPORT_ONLY`); sem fabricar prova.
- [x] B25-03/R1: diagnóstico de gap (functions 89,27% ≈ 17; top-10); sem código/threshold alterado.
- [x] B25-10/D: drift D1–D4 encontrado e corrigido nos masters; `AUD20-08` não reaberto.
- [x] B25-04–09: bloqueios formais registrados (`BLOCKED`/`WAITING_HUMAN_APPROVAL`); nada executa sem gate próprio.
- [ ] Próxima ação: recuperar binding candidate-bound + gates C06 (R1/R2); R2 de FU1; admissões `AUD20-11`/mutation; sessão humana e dossiês externos por autoridade própria. Staging/produção `NO_GO`.
- Ver [auditoria 0573](04_audit/0573_repository_audit_2026-09-25.md), [roadmap 0344](03_build/0344_post_audit_roadmap_20260925.md) e [backlog 0345](03_build/0345_post_audit_backlog_20260925.md).

# AUD20-19-FU1 — BUILD local verificado — 2026-09-24T13:01Z

- AUD20-19-FU1/IMP50-18 BUILD local passou unit `21/21`, verify isolado
  `2/2`, suíte integral `2.256 PASS`/192 skips, coverage 90,84% statements,
  87,00% branches, 89,27% functions e 91,43% lines; typecheck, lint,
  Prettier, docs-check (1.875 links/634 JSONs) e diff-check passaram.
- A primeira rodada full-test com duas falhas de nextAction documental foi
  preservada separadamente; após sincronizar runtime, a repetição passou.
- Não houve sessão humana, participante, consentimento, mídia ou binding de
  candidato limpo. IMP50-18 permanece sem aceite até crítica independente R2;
  sessão separada não autorizada. `AUD20-17` continua a ação primária com Q1
  decidida, C06/C07 `FAIL`, 92% `REPORT_ONLY`; AUD20-10 enfileirada. Os 141
  vínculos IMP50-49 permanecem sem adjudicação, snapshots v1/v2 intactos.
  Staging/produção `NO_GO`.
- Ver [relatório BUILD](04_audit/evidence/AUD20/AUD20-19-FU1-build-report-20260924.md),
  [decisão Q1](04_audit/evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md)
  e [recibo de admissão](04_audit/evidence/AUD20/AUD20-19-FU1-human-approval-admission-20260924.md).

# AUD20-19-FU1 BUILD local e decisão Q1 — 2026-09-24T12:41Z

- A resposta humana mais recente de AUD20-17/Q1 confirma que o piso crítico de
  95% se aplica a `apps/api/src/server/request-context.ts`; não altera threshold
  ou registry, nem torna os 92% `REPORT_ONLY` uma prova de C06. C06/C07 seguem
  `FAIL` e AUD20-17 continua sem aceite.
- AUD20-19-FU1/IMP50-18: o BUILD local controlado foi executado após a admissão
  por hash. Unit focal `21/21 PASS`, Playwright isolado `2/2 PASS`, typecheck,
  lint e Prettier `PASS`. A primeira suíte integral encontrou duas falhas de
  estado documental por nextAction desatualizada; runtime foi sincronizado e a
  repetição/coverage/docs-check final ainda estão pendentes.
- A sessão headed não foi iniciada; não houve participante, consentimento,
  mídia ou pacote humano. A task-mãe permanece `WAITING_HUMAN_APPROVAL`; R2
  independente continua necessária antes da aceitação. Staging/produção
  `NO_GO`.
- Ver [relatório BUILD](04_audit/evidence/AUD20/AUD20-19-FU1-build-report-20260924.md),
  [recibo Q1](04_audit/evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md)
  e [admissão](04_audit/evidence/AUD20/AUD20-19-FU1-human-approval-admission-20260924.md).

# PLAN50 / IMP50-49 — suplemento Git dos 42 alvos — 2026-09-24T10:10Z

- Revisão metadata-only dos 42 alvos fora do conjunto AUD19/raw: 38 caminhos
  PROD e um digest AUD19-11 têm membership em árvores Git; três arquivos AUD20
  estão apenas no worktree atual. Isso não prova conteúdo do snapshot nem
  composição dos runs. Nesta rodada houve leitura de texto não-raw do relatório
  PROD-04 e resumos co-localizados; nenhum payload raw/blob foi lido.
- Crítica fresh-context v1: `PASS_WITH_SCOPE_LIMITS`; delta-review v2 da
  Discovery final: `PASS`. Nenhum dos 141 casos foi adjudicado; classes,
  snapshot v1 e suplemento v2 permanecem intactos. Discovery 0022 está em
  `IN_PROGRESS`, sem `DISCOVERY_READY`, PRD, SPEC, checker ou BUILD.
- A resposta sobre aprovação da SPEC amendment request-context corresponde ao
  recibo hash-bound já registrado; o BUILD local já foi executado e não foi
  repetido. Estado primário continua AUD20-17 `WAITING_HUMAN_APPROVAL`, Q1 como
  próxima ação, C06/C07 `FAIL`, AUD20-10 enfileirada, staging/produção `NO_GO`.
- Ver [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-audit-20260924.md),
  [receipt](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-receipt-20260924.json),
  [crítica v1](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-critic-v1-20260924.md)
  e [crítica v2](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-critic-v2-20260924.md).
- Verificação documental sob Node `v22.23.2`: `docs:check` PASS (1.809 links,
  zero quebrados, 630 JSONs, estado/semântica/nextAction válidos); Prettier e
  `git diff --check` PASS. Nenhum teste de produto.

# PLAN50 / IMP50-49 — verificação documental final — 2026-09-24T09:52Z

- `docs:check` PASS sob Node `v22.23.2`: 1.772 links, zero quebrados; 629
  JSONs válidos; estados, semântica e nextAction válidos. Prettier nos
  documentos tocados e `git diff --check` PASS. Nenhum teste de produto.
- Os arquivos revisados pela crítica permanecem nos hashes declarados no
  [parecer](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-critic-v1-20260924.md);
  Discovery 0022 não foi alterada depois do review.

# PLAN50 / IMP50-49 — crítica independente do vínculo Git — 2026-09-24T09:50Z

- A crítica fresh-context deu `PASS_WITH_SCOPE_LIMITS` para integridade e
  limites do relatório/receipt e Discovery revisada. O commit comprova
  membership/OIDs dos 99 caminhos na árvore, sem provar sua participação na
  execução AUD19-10; os outros 42 não são cobertos. Nenhum dos 141 foi
  adjudicado, e v1/v2 permanecem intactas. O parecer SHA-256
  `57e1833b2114651021e4365801824ea211c5027d31a27c3d099dc9b129e4fbf2` revisou
  Discovery `5111e9cf…78c0a14f`, relatório `8fa3adf0…40f59f4e`, receipt
  `9ca97b82…c4d627a33` e mapa `03a077e6…e70a3ba`.
- Discovery continua `IN_PROGRESS`, sem `DISCOVERY_READY`, PRD, SPEC, checker
  ou BUILD; vínculo de origem por item e outros critérios permanecem abertos.
  Ver [parecer](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-critic-v1-20260924.md).
- Estado operacional primário inalterado: `AUD20-17 / WAITING_HUMAN_APPROVAL`,
  Q1 como próxima ação, `AUD20-10` enfileirada, staging/produção `NO_GO`.

# PLAN50 / IMP50-49 — reiteração da regra e membership Git — 2026-09-24T09:43Z

- Decisão humana reafirmada: manter os 141 vínculos sem adjudicação até haver
  evidência suficiente, exigindo referência exata por item em registro
  apropriado; v1 baseline e v2 suplemento imutável.
- A checagem read-only encontrou os 99 caminhos raw exatos na árvore do commit
  AUD19-10 `0bbc3ab0013e5bf25d283c4946f951b0d0275b2a`, 33 por browser. A árvore
  também contém o relatório, agregado e script agregador. O resultado dá
  membership de caminho no Git, mas não vincula os bytes do snapshot nem prova
  composição da execução. Nenhum payload/blob foi lido ou hash de payload
  recalculado. Os 141 seguem sem adjudicação e nenhuma classe mudou.
- Discovery 0022 permanece `IN_PROGRESS`, sem `DISCOVERY_READY`, PRD, SPEC,
  checker ou BUILD. Revisão independente da nova evidência está pendente.
  Ver [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-audit-20260924.md)
  e [receipt](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-receipt-20260924.json).
- Estado operacional primário inalterado: `AUD20-17 / WAITING_HUMAN_APPROVAL`,
  Q1 como próxima ação canônica, `AUD20-10` enfileirada e staging/produção
  `NO_GO`.

# PLAN50 / IMP50-49 — follow-up critic do relatório de escopo — 2026-09-24T09:27Z

- O follow-up review deu `PASS` ao relatório final
  `imp50-49-formatter-path-scope-audit-20260924.md`, SHA-256
  `41dd157fc45c7339e25d0ef522624770d5b37028c112bbe704929b2cbb01427a`, e à
  Discovery 0022 SHA-256
  `1b4f75e899f232ede5d9f0bbc513003f181e7e83a82acb85a57be4a4d198958f`.
- Confirmada a contagem: 12 de 13 alvos do receipt aparecem em
  `full-cert/format.log`; o 13º é referência ao código AUD19-11. Isso corrige a
  observação editorial anterior, sem fortalecer o vínculo dos bytes-alvo ou a
  composição original AUD19-10.
- Discovery segue sem `DISCOVERY_READY`; os 141 vínculos permanecem sem
  adjudicação, snapshot v1 baseline e v2 suplemento imutável. Ver o
  [parecer](04_audit/evidence/PLAN50-20260923/imp50-49-formatter-path-scope-critic-v1-20260924.md).

# PLAN50 / IMP50-40 — disposição request-context e estado AUD20-17 — 2026-09-24T12:13Z

- AUD20-17 permanece `WAITING_HUMAN_APPROVAL` pela decisão Q1 de
  aplicabilidade; request-context permanece aberta e não aceita. A SPEC v2 foi aprovada no hash
  `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c` e o BUILD
  local controlado já foi executado. A confirmação recebida não exige outro
  BUILD.
- Disposição atual: C01–C05 `PASS`, C06/C07 `FAIL`; request-context permanece
  não aceita. O usuário decidiu que o piso crítico de 95% se aplica ao módulo,
  sem alterar o registry congelado. Os 92% continuam `REPORT_ONLY` até binding
  integral candidate-bound; não constituem resultado C06 adjudicado. Ver
  [recibo Q1](04_audit/evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md),
  [errata](04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md)
  e [crítica](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v1-20260924.md).
- Métricas integradas `REPORT_ONLY`; baseline “sem redução”, PostgreSQL e
  mutation `NOT_RUN`. O manifesto citado no BUILD report não corresponde ao
  disponível e faltam os hashes das 301 fontes integradas. Query-parser
  `PASS_LOCAL` permanece atribuído somente à sua subfatia; `AUD20-10` enfileirada.
- Próxima ação: tratar Q1 como resolvida para aplicabilidade, mas não como gate
  C06/C07; recuperar binding candidate-bound válido e obter admissões próprias
  antes de qualquer gate adicional. `AUD20-19-FU1` tem BUILD local controlado
  admitido em paralelo, mas não autoriza sessão humana. Q2 segue enfileirada.
  Preservar os 141 vínculos IMP50-49 sem adjudicação, o baseline v1 e o
  suplemento v2. Staging/produção `NO_GO`.
- Revisões da disposição: I1 rejeitou a interpretação do piso; I2 rejeitou a
  falta de marcador histórico da entrada 04:42Z do execution log. I3 confirmou
  o estado corrente, mas foi interrompida antes do parecer final após apontar
  checkpoints antigos sem marcador histórico no backlog master, em 0337 e na
  seção Q1 04:42Z de 0342. As marcações e referências foram corrigidas. I3 é
  somente um registro intermediário, sem PASS; ver [I2](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v2-20260924.md)
  e [achados intermediários I3](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v3-interim-20260924.md).
  A crítica I4 deu `REJECT` somente em DOC-03, por snapshots antigos sem
  identificação histórica explícita em runtime, execution log e 0337; DOC-01,
  DOC-02, DOC-04 e DOC-05 passaram. Os marcadores e a errata no snapshot 04:01Z
  foram corrigidos. Ver [parecer I4](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v4-20260924.md).
- A crítica fresh-context I5 rejeitou DOC-02: a rota C06 e a reconciliação
  ainda descreviam como atuais textos de 0190/0337 já corrigidos e vinculavam
  revisões anteriores a bytes diferentes dos atuais. Os novos textos citam os
  hashes revisados e mantêm estado/gates inalterados. A crítica I6 deu `PASS`
  em DOC-01–DOC-05; ver [I5](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v5-20260924.md)
  e [I6](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v6-20260924.md).
- I6 reproduziu `docs:check` PASS sob Node `v22.23.2` (1.668 links/628 JSONs,
  zero links quebrados e estado semântico válido), Prettier e `git diff --check`;
  o veredito fresh-context foi `PASS` em DOC-01–DOC-05. Nenhum teste de produto
  ou BUILD foi executado nesta auditoria documental. Após registrar I6 e atualizar
  os ponteiros, `docs:check` final validou 1.676 links e 628 JSONs; Prettier e
  `git diff --check` passaram.

# PLAN50 / IMP50-49 — estado Discovery após crítica v2 — 2026-09-24T07:19Z

- IMP50-49/`AUD20-08-FU3` permanece em `DISCOVERY` / `IN_PROGRESS`, sem gate
  `DISCOVERY_READY`, PRD, SPEC, checker ou BUILD. A crítica independente v2
  conferiu os hashes finais e não encontrou base para avançar.
- Os 141 vínculos insuficientes ficam sem adjudicação; v1 segue baseline de
  referência e v2, suplemento read-only imutável. A busca literal encontrou
  27 ocorrências para 13 caminhos em 3.245 caminhos filtrados; os hits são
  candidatos, sem prova de bytes-alvo/membership na execução original. Receipt:
  [JSON](04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-search-receipt-20260924.json).
- A comparação intermediária de 2.428 arquivos não tem manifesto de caminhos
  preservado; a diferença de cinco em relação ao snapshot v2 (2.433) permanece
  explicitamente sem reconciliação item a item, sem inferência de classes.
- Critérios pendentes: suporte autoritativo por item, autoridade/cobertura da
  linhagem, cutoff e escritas posteriores, regras de falha/distinção das seis
  classes, fixtures e comportamento read-only determinístico. Ver
  [Discovery 0022](00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md),
  [parecer](04_audit/evidence/PLAN50-20260923/imp50-49-discovery-critic-v2-20260924.md)
  e [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-followup-20260924.md).
- A ação crítica única do programa continua a decisão Q1 sobre o piso de 95%
  em request-context; Q2/AUD20-10 segue enfileirada e staging/produção `NO_GO`.
- Verificação documental: `docs:check` PASS sob Node `v22.23.2` (1.602
  links/628 JSONs); Prettier dos dez documentos e `git diff --check` PASS. Sem
  testes de produto.

# AUD20-19-FU1 — preflight e aprovação pendente — 2026-09-24T06:55Z

- A SPEC do harness permanece `DRAFT_PENDING_HUMAN_REVIEW`, hash-bound a
  `decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688`; a
  crítica fresh-context v4 (`4942f6fbbb096a92f3e0c465cd6217373e8bfa0e127c907cd72a610b063cd723`)
  deu `PASS` somente para prontidão de revisão humana.
- O preflight de ambiente confirmou namespace `unshare` sem rota externa,
  ferramentas e versões requeridas instaladas e Chromium presente sem execução.
  O worktree está sujo e não pode servir como candidato de sessão.
- Aprovação da SPEC e admissão do BUILD local controlado foram solicitadas; não
  há admissão ou BUILD até a resposta. A sessão humana continua sem autorização
  separada; sem participante, consentimento, mídia, UI/API, staging ou produção.
- **Próxima ação crítica única:** receber a decisão humana pendente de Q1 sobre
  a aplicabilidade do piso de 95% a `request-context`; Q1 continua bloqueando
  Q2/AUD20-10. O FU1 é uma preparação H paralela e só avança após aprovação
  hash-bound própria. Evidência: [preflight](04_audit/evidence/AUD20/AUD20-19-FU1-environment-preflight-20260924.md).
- `docs:check` passou sob Node `v22.23.2` (1.582 links/627 JSONs); Prettier dos
  sete documentos e `git diff --check` passaram. A primeira tentativa sob Node
  24 foi bloqueada corretamente pelo guard de runtime. Nenhum teste de produto.

# AUD20-17 / IMP50-40 — crítica da reconciliação C06 (registro histórico) — 2026-09-24T06:36Z

- A crítica independente fresh-context deu `PASS` somente para precisão do
  [relatório de reconciliação](04_audit/evidence/AUD20/AUD20-17-manifest-baseline-reconciliation-20260924.md),
  revisado no SHA-256
  `a7869131debf4f4c618672a1fbf27de38377ea002af3ba1b5d7ab3d3b3eb67c4`. Parecer:
  [crítica v1](04_audit/evidence/AUD20/AUD20-17-manifest-baseline-reconciliation-critic-v1-20260924.md),
  SHA-256 `84bbc37c9d2e88c55b4b647de8af494e4b1e8897c02b9f4e72830ffe6f37dd5a`.
- A consistência do manifesto continua parcial: 8/8 fontes integradas, 34/34
  recibos/evidências e listas v1 conferem em seus escopos; o BUILD report cita
  `11f061f4…`, enquanto o manifesto atual é `6b86eb90…`, sem inventário
  hash-bound de todas as 301 fontes do run integrado. Não há baseline
  candidate-bound para “sem redução”; a disposição fica `NOT_RUN`.
- Métricas permanecem `REPORT_ONLY`; C06/C07 `FAIL`; a aplicabilidade do piso
  de 95% a `request-context` aguarda decisão humana. Recomendação: manter sem
  adjudicação até binding candidate-bound válido. `AUD20-17` aguarda essa
  decisão; NQP-02/AUD20-11 bloqueado, mutation separada, IMP50-49 com 141
  vínculos sem adjudicação e v1 baseline/v2 suplemento. Staging/produção `NO_GO`.
- Próxima ação: obter a decisão humana; não iniciar BUILD/PostgreSQL/mutation
  nem alterar registry/threshold.
- verification: `docs:check` PASS sob Node `22.23.2` (1.576 links, 627 JSONs,
  zero links quebrados e estado/ação semânticos válidos); Prettier check nos
  nove documentos tocados e `git diff --check` PASS. Nenhum teste de produto
  ou execução foi realizado.

# AUD20-17 / IMP50-40 — crítica v4 PASS e reconciliação C06 (registro histórico) — 2026-09-24T06:20Z

- A crítica fresh-context v4 deu `PASS` somente para prontidão documental da
  rota C06 SHA-256
  `4d20e67ab6f4e93bda7405f85a8e7c4c5e953930228453bb1939a283041652f2`;
  parecer em
  [evidência](04_audit/evidence/AUD20/AUD20-17-C06-gate-route-critic-v4-20260924.md).
- C06/C07 continuam `FAIL`, request-context não aceita e AUD20-17
  `IN_PROGRESS`. IMP50-49 mantém os 141 vínculos sem adjudicação, v1 como
  baseline e v2 como suplemento. NQP-02/AUD20-11 segue bloqueado;
  `AUD20-10` enfileirada; staging/produção `NO_GO`. Nenhuma aprovação de
  Discovery, produto, BUILD, PostgreSQL ou mutation decorre do parecer.
- Próxima ação: reconciliar em leitura o manifesto citado pelo BUILD report, o manifesto disponível e os hashes das fontes/resultados; verificar se a baseline “sem redução” é candidate-bound; registrar binding verificável ou preservar métricas/comparações como não vinculadas, sem reescrever relatórios históricos; manter C06/C07 `FAIL`, a aplicabilidade 92%/95% e os 141 vínculos IMP50-49 sem adjudicação; manter `AUD20-11`/NQP-02 bloqueados e a admissão mutation separada; não executar BUILD/PostgreSQL/mutation nem alterar registry/threshold; Q1 não libera o DAG, `AUD20-10` segue enfileirada e staging/produção `NO_GO`.
- verification: `docs:check` passou após persistir a crítica v4, Node
  `22.23.2` (1.543 links/627 JSONs, estado semântico válido); Prettier check e
  `git diff --check` também passaram. Sem testes de produto ou execução.

# AUD20-17 / IMP50-40 — correção da crítica v3 C06 (registro histórico) — 2026-09-24T06:15Z

- A crítica v3 revisou a rota SHA-256
  `528bf5007b695f78975d772432ec8f48caa36befaedb6a0fdd8dd48c5b046036` e deu
  `REVISE`: topo de 0337 stale e crítica NQP-01 não vinculada aos bytes atuais
  da Discovery 0024. Corrigi ambos; a rota atual é
  `4d20e67ab6f4e93bda7405f85a8e7c4c5e953930228453bb1939a283041652f2`.
- Discovery 0024 permanece intacta no hash
  `db2493fde811e6b135360f38fcb6eaac10400660f2fb492ef04b2eae6ae8250d`; a
  crítica NQP-01 (`25513893261b71f73d1b290bbe5ef3a4741355836509c79b59159c56508978e0`)
  revisou bytes anteriores `cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`.
  Nova crítica da rota atual pendente; nenhuma aprovação de Discovery ou
  execução decorre desta correção documental.
- C06/C07 seguem `FAIL`, request-context não aceita, AUD20-17 `IN_PROGRESS`;
  141 vínculos IMP50-49 sem adjudicação, v1 baseline e v2 suplemento intactos.
  `AUD20-11`/NQP-02 bloqueado, `AUD20-10` enfileirada, staging/produção
  `NO_GO`. Gauntlet segue stale; rebaseline oficial falhou fechado sem edição
  manual.
- Próxima ação: obter crítica independente final da rota C06 revisada; preservar a Discovery 0024 existente e exigir crítica vinculada ao hash atual `db2493fde811e6b135360f38fcb6eaac10400660f2fb492ef04b2eae6ae8250d` (o parecer NQP-01 cobre bytes anteriores `cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`); reconciliar por leitura o binding do manifesto e da baseline; manter sem adjudicação a aplicabilidade do piso crítico e os 141 vínculos IMP50-49; manter `AUD20-11`/NQP-02 bloqueados até gates próprios; recuperar o estado Gauntlet por mecanismo suportado; não iniciar BUILD/PostgreSQL/mutation; Q1 não libera o DAG, `AUD20-10` segue enfileirada e staging/produção `NO_GO`.
- verification: `docs:check` passou sob Node `22.23.2` (1.533 links/627 JSONs,
  estado e próxima ação semânticos válidos); Prettier check dos nove documentos
  e `git diff --check` passaram. Sem teste de produto, banco, BUILD, mutation
  ou ação externa.

# AUD20-17 / IMP50-40 — rota C06 revisada e Gauntlet stale (registro histórico) — 2026-09-24T06:01Z

- A crítica fresh-context v1 da rota C06 foi `REVISE`: separar admissão de
  mutation, reavaliar a Discovery 0024 já existente e vincular a baseline “sem
  redução” ao candidato/fonte/denominador/run exatos. A rota v2 foi revisada no
  hash `528bf5007b695f78975d772432ec8f48caa36befaedb6a0fdd8dd48c5b046036`.
- A crítica fresh-context v2 julgou a lógica adequada, mas manteve `REVISE`
  porque 0343, log e runtime state ainda apontavam a versão anterior; os
  ponteiros foram sincronizados. Solicitar nova crítica independente antes de
  considerar a rota pronta para decisão. Nenhuma execução foi autorizada.
- A aplicabilidade dos 92% de branches de request-context ao piso crítico 95%
  continua sem adjudicação: o registry congelado não enumera o caminho, apesar
  dos resumos 0190/0337. Threshold e registry permanecem intactos. C06/C07
  seguem `FAIL`; request-context não aceita e AUD20-17 `IN_PROGRESS`.
- O rebaseline oficial do run `IMP50-NQP-20260923` recusou validar hashes dos
  itens 13/17/20/21 no manifesto histórico. State, bar, artifacts e history
  ficaram intactos; não houve edição manual de `.gauntlet`. Ver
  [recibo](04_audit/evidence/AUD20/AUD20-17-gauntlet-rebaseline-attempt-20260924.md).
- IMP50-49 mantém os 141 vínculos sem adjudicação, v1 baseline e v2 suplemento
  intactos; nenhuma reclassificação foi feita.
- Sem testes, banco, serviço, mutation, BUILD, commit, push, staging ou
  produção nesta rodada. `docs:check` passou com Node `22.23.2` (1.522 links,
  627 JSONs, estado semântico válido); Prettier check e `git diff --check`
  passaram. A execução inicial com Node 24 foi corrigida, sem efeito sobre o
  produto.
- Próxima ação: obter crítica independente final da rota C06 v2; reconciliar
  por leitura o binding do manifesto e da baseline e manter sem adjudicação a
  aplicabilidade do piso crítico até decisão da autoridade; manter
  `AUD20-11`/NQP-02 bloqueados; recuperar o estado Gauntlet por mecanismo
  suportado; não iniciar BUILD/PostgreSQL/mutation. `AUD20-10` segue enfileirada,
  staging/produção `NO_GO`.

# AUD20-17 / IMP50-40 — auditoria request-context v2 — 2026-09-24T04:42Z

> Registro histórico da auditoria naquele momento. A interpretação posterior
> da cobertura e o estado Q1 vigente estão na
> [errata](04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md)
> e no registro NQP mais recente no topo deste backlog.

- [x] Crítica fresh-context read-only terminou após BUILD v2. C01–C05 `PASS`;
      C06/C07 `FAIL`; request-context não aceita. Fingerprint repository+state
      pré/pós idêntico: `7ea35b982dfd962ac8f7fde4e68252711651413e9e7dcb872aec0d5d7a0079b5`.
- [x] Estado operacional reconciliado; `docs:check` 1.458 links/627 JSONs e
      estado semântico válido; `format:check` e `git diff --check` passaram.
- [x] Suíte completa no candidato integrado: 301 arquivos, 2.256 PASS, 192
      skips, 0 falhas. Coverage reportada: statements 90,84%, branches 87,00%,
      functions 89,27%, lines 91,43%; request-context branches observados em
      92%. O binding incompleto mantém as métricas `REPORT_ONLY`; a aplicabilidade
      do piso crítico de 95% não está adjudicada. Ver a errata acima; skips não
      contam como aprovados.
- [ ] C06 permanece `FAIL`: sem baseline válida demonstrada, mutation
      selecionada 100% ou gate PostgreSQL com zero required skip. Nenhum gate
      PostgreSQL foi iniciado; NQP-02/AUD20-11 continuam `BLOCKED`.
- [x] Crítica independente fresh-context concluiu C01–C05 `PASS` e C06/C07
      `FAIL`; request-context não foi aceita. Ver o parecer abaixo e o resumo
      corrente no topo deste backlog.
- [ ] Q1 não liberou o DAG; `AUD20-10` continua enfileirada. A próxima decisão
      humana é sobre aplicabilidade do piso de 95%; ela não aprova C06/C07 nem
      libera execução adicional. Staging e produção `NO_GO`.
- Evidência: [BUILD](04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md),
  [crítica](04_audit/evidence/AUD20/AUD20-17-request-context-v2-independent-critic-20260924.md),
  [manifesto](04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-candidate-manifest-20260924.json),
  [fingerprint](04_audit/evidence/AUD20/AUD20-17-request-context-v2-review-fingerprint-20260924.json).

# AUD20-17 / IMP50-40 — resultado BUILD request-context v2 (registro histórico) — 2026-09-24T04:01Z

> O relatório de então tratou 92% de branches como abaixo do piso e tinha C07
> pendente; a [errata](04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md)
> corrigiu a interpretação de 92%, e a crítica independente concluiu C07
> `FAIL`. O estado e próximo passo atuais estão no registro do topo.

- [x] SPEC v2 aprovada e BUILD local controlado admitido por hash
      `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`;
      admissão registrada em 0190/0337 antes do código.
- [x] Reconstrução v1 fail-closed passou: `server.ts=4.707`; parsers restaurados
      uma vez cada; hashes pre-edit conferidos; testes de rotas FU1 atribuídos a
      cópias `HEAD`; assertion request-context de JSON inválido preservada.
- [x] BUILD controlado e matriz executados dentro da allowlist. Caps integrados:
      `server.ts=4.584`, request-context `328`, request-query `138`, total
      `5.050`; C02 `PASS_LOCAL`.
- [x] Matriz: 13 arquivos/113 PASS/9 skips/0 falhas. Suíte: 300 arquivos,
      2.248 PASS/192 skips/0 falhas. Coverage: statements 90,83%, branches
      86,97%, functions 89,27%, lines 91,42%; request-context branches 92%.
      Typecheck, lint e Prettier `PASS`.
- [x] `docs:check` `PASS` (1.424 links, 625 JSONs, estado semântico válido),
      `format:check` final e `git diff --check` `PASS`.
- [x] Reporter JSON por arquivo confirma os 192 casos condicionais em 29 fontes
      e corresponde à tabela NQP-02. Evidência: [relatório](04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md),
      [manifesto](04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-candidate-manifest-20260924.json),
      [inventário](04_audit/evidence/AUD20/AUD20-17-request-context-v1-test-inventory-20260924.json).
- [ ] C06 `FAIL`: functions abaixo de 90%, branches request-context abaixo do
      piso crítico 95%, mutation selecionada e PostgreSQL não executados; 192
      casos condicionais skipped não contam como PASS.
- [ ] C07 aguarda crítica independente fresh-context após o último write; a
      fatia segue não aceita e `AUD20-17` permanece `IN_PROGRESS`.
- [ ] NQP-02/AUD20-11 continua sem PostgreSQL descartável/teardown; não executar
      esse gate sem sua autorização própria. `AUD20-10` segue enfileirada.
- [x] Sem API/schema, dados reais, PostgreSQL, serviço externo, commit, push,
      deploy, staging ou produção; staging/produção `NO_GO`.
- [ ] Próxima ação histórica: decisão humana Q1 sobre a aplicabilidade do piso
      de 95%; manter C06/C07 `FAIL` e sem novo BUILD ou gate PostgreSQL sem
      autorização própria.

# NQP-20260924 — BUILD request-context v2 admitido — 2026-09-24T01:56Z

- [x] SPEC request-context v2 aprovada e BUILD local controlado admitido para
      SHA-256 `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`;
      registros em 0190, 0337 e recibo hash-bound.
- [ ] Executar reconstrução v1 isolada conforme a transformação rollback
      query-parser e validar todos os hashes/contagens e atribuições FU1 antes
      de editar fontes. Qualquer divergência interrompe BUILD.
- [ ] Implementar apenas a allowlist da emenda e executar critérios focados,
      matriz/regressão/coverage e revisão independente conforme a SPEC.
- [ ] C06/C07 e aceite final pendem dos pisos AAA, gates obrigatórios e crítica
      fresh-context; NQP-02 continua sem PostgreSQL/teardown, AUD20-11 `BLOCKED`.
- [ ] Não alterar API/schema, usar dados reais, integrar serviços externos,
      fazer commit/push/deploy ou executar staging/produção. Staging/produção
      `NO_GO`.
- [x] IMP50-49: manter os 141 vínculos sem adjudicação até evidência suficiente;
      v1 baseline e v2 suplemento intactos.

# NQP-20260924 — verificação final e pendências abertas — 2026-09-24T01:47Z

- [x] NQP-02 unitário: 30 arquivos/354 testes, 162 PASS, 192 skipped, 0 falhas;
      crítica independente `CONDITIONAL`; nenhuma conclusão de PostgreSQL.
- [x] Checks documentais sob Node `22.23.2`: `docs:check` 1.378 links/620
      JSONs, `format:check`, manifesto 38/38 e `git diff --check` PASS. Recibos
      em `docs/04_audit/evidence/PLAN50-20260923/nqp02-final-*-20260924.log`.
- [x] IMP50-49: manter os 141 vínculos sem adjudicação até evidência suficiente;
      baseline v1 e suplemento v2 preservados, sem reclassificação.
- [ ] NQP-02/AUD20-11: gate PostgreSQL descartável, zero required skips e
      teardown continuam pendentes; atribuição por arquivo ao run histórico não
      foi provada.
- [ ] Request-context v2 continua à espera de decisão humana hash-bound e
      admissão BUILD separada. Nenhum código novo autorizado por esta rodada.
- [ ] Nenhum dado real, commit, push, staging ou produção; staging/produção
      `NO_GO`.

# NQP-20260924 — decisão humana pendente da emenda request-context — 2026-09-24T01:05Z

- [x] NQP-03: crítica C01–C07 concluiu sem aceite da primeira fatia; C02/C06/C07 permanecem `FAIL`.
- [x] Proposta de emenda SPEC v1 recebeu `CONDITIONAL`; v2 hash
      `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`
      recebeu `PASS_FOR_HUMAN_REVIEW` e aguarda decisão humana e admissão BUILD separada.
- [x] NQP-02: unit run com URL vazia passou 30 arquivos/354 testes (162 PASS,
      192 skipped, 0 falhas) e confirmou por arquivo a reconstrução atual de 29
      fontes; o 30º arquivo usou client em memória. Receipt anterior sem hashes
      das fontes; atribuição daquele run não comprovada. PostgreSQL não executado,
      sem aceite.
- [x] NQP-02 evidence: relatório, JSON por arquivo e receipt unitário registrados;
      manifesto de fontes/evidências v2 (38 entradas) verificado integralmente.
- [x] NQP-02 critic: fresh-context `CONDITIONAL`; hashes e 29/29 contagens
      unitárias confirmados, PostgreSQL continua não executado.
- [ ] `AUD20-11`/`IMP50-07`: gate PostgreSQL e teardown seguem pendentes, pois a
      task está `BLOCKED` e não há execução contra banco descartável neste round.
- [ ] NQP-01/02: atingir pisos AAA completos e executar gates obrigatórios sem
      required skip; coverage functions observada em 89,25%.
- [ ] Q2/AUD20-10 segue enfileirada até Q1 liberar DAG. AUD20-17 permanece
      `IN_PROGRESS`; IMP50-49 mantém 141 vínculos sem adjudicação por decisão humana.
- [ ] Nenhum novo BUILD, commit/push, staging ou produção autorizado por esta
      disposição. Staging/produção `NO_GO`.
- [ ] Reconciliar o manifesto histórico `.gauntlet` sem sobrescrever hashes de
      0337/0342/0343; `validate --check-drift` e `rebaseline` falham fechados.

# NQP-20260923 — nova rodada incremental — 2026-09-23T23:16Z

- [x] Revisão [0571](04_audit/0571_implementation_state_review_2026-09-23.md):
      22/22 hashes do manifesto conferidos, teste focal Node 22 com 14/14 PASS,
      gaps de coverage/functions, skips, estado e gates identificados.
- [x] [Melhorias 0572](04_audit/0572_next_improvement_round_2026-09-23.md),
      [roadmap 0342](03_build/0342_post_query_roadmap_20260923.md) e
      [backlog 0343](03_build/0343_post_query_backlog_20260923.md) criados; 12
      propostas vinculadas aos itens IMP50 existentes, sem admissão de BUILD.
- [x] NQP-06/NQP-11: resumos vivos reconciliados; checkpoints históricos e
      snapshots IMP50-49 preservados. `docs:check` (1.295 links/615 JSONs),
      Prettier e `git diff --check` passaram; nenhum item IMP50 de produto foi
      fechado por esta edição.
- [ ] NQP-03 / `AUD20-17`: disposição documental própria de request-context
      C01–C07; manter não aceito até parecer suficiente. Query-parser FU1 segue
      `PASS_LOCAL` limitado.
- [ ] NQP-04 / `AUD20-10`: BUILD local aprovado e admitido, enfileirado sem
      execução nova; seguir somente depois da ação crítica AUD20-17.
- [ ] NQP-01/02: provar piso functions ≥90% e zero required skip para a
      qualificação; a suite anterior reportou 89,25% e 192 skips condicionais.
- [ ] IMP50-49: v1 baseline e v2 suplemento imutável; 141 vínculos sem
      adjudicação. Sessão humana AUD20-19 e oito gates externos permanecem
      pendentes. Staging real e produção `NO_GO`.

# PLAN50 — resultado do BUILD query-parser e decisões humanas — 2026-09-23T21:53Z

- **AUD20-17-FU1 / IMP50-40 query-parser:** BUILD local controlado auditado
  `PASS` para AC01–AC06 da PRD 0033. Relatório e critérios:
  [BUILD query-parser](04_audit/evidence/AUD20/AUD20-17-query-build-report-20260923.md)
  e [crítica final](04_audit/evidence/AUD20/AUD20-17-query-final-critic-v3-20260923.md).
- Caps: `server.ts=4622/4708`, `request-context.ts=258/450`,
  `request-query.ts=138/160`, total `5018/5050`. Regressão, coverage, checks
  estáticos e hashes finais estão no manifesto de evidência. Rollback foi
  ensaiado apenas em cópia isolada, não aplicado ao worktree.
- A fatia request-context continua não aceita pelo registro próprio; este
  resultado não conclui `AUD20-17` nem aprova retrospectivamente aquela fatia.
  Ação seguinte é revisar documentalmente sua disposição com o C02 do candidato
  integrado dentro do cap. Nenhum novo BUILD está autorizado por essa ação.
- IMP50-49: v1 (2.412 caminhos) permanece baseline; v2 é suplemento imutável.
  Os 141 vínculos insuficientes permanecem sem adjudicação até evidência
  suficiente, sem reclassificação automática. `AUD20-10` fica enfileirado;
  staging/produção `NO_GO`.

# PLAN50 — aprovações e decisões humanas — 2026-09-23T20:44Z

- **AUD20-17-FU1 / IMP50-40 query-parser:** usuário aprovou SPEC e BUILD local
  controlado no SHA-256
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`.
  Admissão registrada antes do código em [0190](02_spec/0190_spec_validation.md),
  [0337](03_build/0337_aud20260921_backlog.md) e recibo hash-bound.
- **AUD20-10 / IMP50-09:** usuário aprovou SPEC e BUILD local controlado no
  SHA-256 `83130cdf8930fa3639a116cc63ab4c2e0c3486ff40a349105d3423f44c91b685`;
  admissão registrada, execução enfileirada após a ação crítica AUD20-17.
- **Request-context:** o usuário orientou revisar a SPEC expandindo somente
  essa fatia para atingir C02. É direção para revisão documental, sem nova
  autorização de BUILD; C02/C06/C07 permanecem não aceitos no candidato v1.
- **IMP50-49:** o usuário escolheu preservar v1 (2.412 caminhos) como baseline;
  v2 continua íntegro como suplemento. Os 141 casos continuam sem adjudicação
  até evidência suficiente. Nenhuma classificação foi alterada; Discovery não
  está `DISCOVERY_READY`.
- Próxima ação crítica: BUILD local query-parser segundo a allowlist aprovada e
  revisão independente dos bytes finais. Staging/produção `NO_GO`.

# PLAN50 — decisões humanas pendentes — 2026-09-23T20:21:37Z

- A SPEC mantém 7.398 bytes e SHA-256
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`; os
  gates Discovery 0023/PRD 0033 e a crítica v2 estão conferidos. A aprovação
  humana hash-bound e a admissão BUILD continuam pendentes em 0190/0337.
- `server.ts=4.745`, `request-context.ts=258`; C02 falha por 37 linhas e
  C06/C07 não aceitos. O inventário IMP50-49 continua no hash esperado e seus
  141 vínculos aguardam regra explícita.
- Conferência read-only do mapa IMP50-49: 141 linhas, SHA-256
  `03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`, sendo
  99 `aggregate_only` e 42 `basename_only`; nenhum raw foi aberto nem classe
  alterada. As opções de linhagem estão em
  [Discovery 0022](00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md).
- Próxima ação única: pedir decisão sobre a SPEC exata e só então registrar a
  admissão controlada. O estado segue `WAITING_HUMAN_APPROVAL`, com
  staging/produção `NO_GO`.
- `docs:check` PASS sob Node `v22.23.2` (1.205 links, 614 JSONs, semântica);
  Prettier e `git diff --check` PASS. Nenhum teste de produto foi executado.
- A revisão/aprovação da SPEC query-parser e a regra de linhagem IMP50-49
  foram solicitadas separadamente; nenhuma decisão foi recebida ou inferida.

# PLAN50 — revalidação de gates e linhagem — 2026-09-23T20:17:00Z

- O usuário repetiu a escolha do inventário integral read-only IMP50-49 e a
  aprovação do BUILD request-context de IMP50-40. Ambas já estavam satisfeitas:
  snapshot v2 preservado; BUILD v1 não repetido, C02 37 linhas acima do limite,
  C06/C07 sem aceite.
- Varredura independente de 0340/0341 e da disposição viva não encontrou outra
  lane IMP50 admitida sem novo gate ou decisão humana. Registro:
  [relatório](04_audit/evidence/PLAN50-20260923/imp50-independent-lane-scan-20260923.md).
- Próxima ação crítica permanece a decisão humana hash-bound da SPEC
  query-parser `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`.
  Staging e produção permanecem `NO_GO`.
- `docs:check` PASS sob Node `v22.23.2` (1.200 links, 614 JSONs, semântica);
  Prettier e `git diff --check` PASS. Nenhum teste de produto foi executado.

# PLAN50 — draft IMP50-21 e decisão request-context — 2026-09-23T19:50:11Z

- O usuário aprovou novamente somente BUILD local controlado de request-context
  `IMP50-40`, já executado no BUILD v1; não houve repetição. C02 permanece 37
  linhas acima do limite, C06/C07 sem aceite, e a allowlist congelada.
- Foi preparado o draft SPEC documental IMP50-21 no hash
  `7edfc5b4c6647f6064d3e62498552f20816181b57e8f9ceea7db12d530c795fd`. A
  crítica delta fresh-context `PASS` cobre apenas prontidão para revisão humana;
  o follow-up segue sem registro/admissão e espera a liberação da ação crítica
  AUD20-17/IMP50-40. Nenhum master foi editado.
- `docs:check` PASS (1.189 links, 614 JSONs, semântica), Prettier nos sete
  documentos tocados e `git diff --check` PASS sob Node `v22.23.2`. Nenhum teste
  de produto foi executado; staging/produção `NO_GO`.
- A próxima ação crítica permanece a decisão humana hash-bound da SPEC
  query-parser `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`.

# PLAN50 — reafirmações de decisões já registradas — 2026-09-23T19:07:02Z

- `IMP50-49`: a escolha repetida de inventário integral read-only já está
  satisfeita pelo snapshot v2; não houve nova captura nem decisão de linhagem
  para os 141 vínculos insuficientes.
- `IMP50-40`: a aprovação request-context reafirma o mesmo hash e allowlist; o
  BUILD v1 continua não aceito por C02 (37 linhas acima do teto) e C06/C07. Sem
  repetição ou expansão do BUILD.
- Nenhum código, teste de produto ou evidência sob `docs/04_audit/evidence/`
  foi alterado; 2/50 aceitos somente em escopo documental/evidencial, 0 BUILDs
  de produto aceitos, staging/produção `NO_GO`.
- `docs:check` passou em Node `v22.23.2` (1.183 links, 614 JSONs, estado
  semântico válido); `format:check` e `git diff --check` passaram.
- Próxima ação crítica: decisão humana hash-bound sobre query-parser
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`.

# PLAN50 — revisão de decisão e SPEC IMP50-42 — 2026-09-23T18:51:16Z

- A resposta request-context reafirma o mesmo BUILD local já executado; C02
  permanece 37 linhas acima do cap e C06/C07 sem aceite. Não houve repetição
  nem expansão de allowlist.
- A crítica fresh-context `PASS` da SPEC IMP50-42 (7.020 bytes, SHA-256
  `2b8f3464bf6e21174ccd41cf65011a61455396698843e5c0a6222f0f58e5ada6`) a deixa
  pronta para revisão humana somente. Continua sem admissão de BUILD.
- 2/50 itens seguem aceitos apenas em escopo documental/evidencial; 0 BUILDs de
  produto aceitos. Staging/produção `NO_GO`; snapshot v2 IMP50-49 preservado.
- `docs:check` passou sob Node `v22.23.2` (1.183 links, 614 JSONs, semântica
  válida); Prettier nos documentos tocados e `git diff --check` passaram.
- Próxima ação crítica: decisão humana hash-bound sobre a SPEC query-parser
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`.

# PLAN50 — SPEC AUD20-10 pronta para revisão humana — 2026-09-23T18:30:47Z

- A crítica independente v1 do adendo AUD20-10/IMP50-09 foi `CONDITIONAL` no
  hash `952e40664cd0ac559cb32e1a05080d65a2990d7559a417ecb2d07dd2607565d2`;
  apontou falta de caminho integrado API→worker e de enforcement para o perfil
  sintético. O draft foi refinado para especificar esses seams, com hash
  `78435c810bdecb918754943321f28bc91b88e8bebd11b2f249be3d67536b6623`.
- A crítica v2 final deu `PASS` para prontidão de revisão humana no hash exato
  `83130cdf8930fa3639a116cc63ab4c2e0c3486ff40a349105d3423f44c91b685`
  (10.763 bytes). `AUD20-10` permanece `WAITING_HUMAN_APPROVAL`; sem aprovação
  hash-bound e admissão registrada não iniciar BUILD. Apenas documentação foi
  alterada; sem código/testes de produto.
- Snapshot v2 IMP50-49 preservado; nenhum arquivo de `evidence/` foi alterado.
  Estado do release: staging/produção `NO_GO`. `docs:check` (1.183 links,
  614 JSONs, semântica), `format:check` e `git diff --check` passaram em Node
  `v22.23.2`; nenhum teste de produto foi executado.

# PLAN50 — revalidação de decisão e lanes — 2026-09-23T18:01:25Z

- As respostas recebidas para IMP50-49 e request-context repetem decisões já
  registradas: inventário integral read-only v2 concluído e aprovação do mesmo
  BUILD request-context/hash/allowlist, cuja execução continua sem aceite. Não
  alteram gate, critério, scope ou status.
- Revalidação read-only não encontrou outra fatia IMP50 admitida. O C02 de
  request-context permanece 37 linhas acima do limite sem extração adicional
  dentro da allowlist congelada. Não houve alteração de código ou teste de
  produto.
- Verificação documental: `docs:check` PASS sob Node `v22.23.2` (1.183 links,
  614 JSONs, semântica PASS); `format:check` e `git diff --check` PASS. O
  primeiro `docs:check` com Node `v24.20.0` falhou apenas por incompatibilidade
  de runtime, antes da repetição sob o Node pinado.
- Estado: 2/50 aceitos somente em documentação/evidência; 0 BUILDs de produto
  aceitos; staging/produção `NO_GO`.
- Próxima ação: revisão/aprovação hash-bound e admissão da SPEC query-parser
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`;
  IMP50-49 aguarda decisão independente da regra de linhagem dos 141 casos.

# PLAN50 — baseline v2 registrado — 2026-09-23T17:32:03Z

- `IMP50-49`: captura integral read-only v2 concluída às 17:22:44Z: 2.433
  arquivos regulares / 28.970.553 bytes; JSONL SHA-256
  `89c0bb3747dcb31f38db8ec94b9fff1ab0efd68cb522a3088e78bdc26ec06a56`.
  Revarredura separada PASS sem diferenças. Comparação com v1 preservada: 21
  adições, 0 ausentes e 1 alterado (`imp50-status-20260923.md`); três sidecars
  v2 estão fora dos membros. Overlay e os 141 vínculos insuficientes permanecem
  sem adjudicação; sem mudança de classes ou `DISCOVERY_READY`.
- `IMP50-18`: crítica v4 da SPEC = `PASS` somente para prontidão de revisão
  humana; sem BUILD ou sessão autorizada.
- Resposta humana reafirmou o BUILD local request-context já executado; C02,
  C06 e C07 continuam sem aceite, sem repetição de código/testes.
- Estado: 2/50 aceitos somente em escopo documental/evidencial, 0 BUILDs de
  produto aceitos; staging/produção `NO_GO`.
- Verificação documental: Node `v22.23.2`; `docs:check` (1.179 links, 614
  JSONs, semântica), `format:check` e `git diff --check` passaram. Nenhum teste
  de produto foi executado.
- Próxima ação crítica: decisão hash-bound sobre SPEC query-parser
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`, seguida
  de registro de gate/admissão em 0190/0337. A regra de linhagem IMP50-49 segue
  pendente separadamente.

# PLAN50 — manifesto candidato, revisão e decisão — 2026-09-23T16:00Z

- `IMP50-49`: derivado somente do inventário v1 um índice review-only com os 99 caminhos que casam com o glob AUD19-10, 33 por browser, com tamanhos/SHA-256. A crítica fresh-context deu `PASS` para integridade e limites; não há vínculo provado com a execução original, adjudicação ou `DISCOVERY_READY`.
- Evidência: [manifesto](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-candidate-20260923.jsonl), [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-candidate-report-20260923.md), [crítica](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-critic-v1-20260923.md). Nenhum payload raw foi aberto e nenhuma classe mudou.
- A resposta do usuário às 15:51Z reafirmou apenas o BUILD request-context já executado; C02/C06/C07 continuam sem aceite e nenhum código/teste foi repetido. Query-parser segue pendente de decisão separada.
- Estado PLAN50: 2/50 aceitos somente em escopo documental/evidencial, 0 BUILDs de produto aceitos; staging/produção `NO_GO`. Próxima ação crítica: decisão humana hash-bound sobre query-parser; IMP50-49 aguarda regra de linhagem e baseline.

# PLAN50 — checkpoint IMP50-49 e gates de execução — 2026-09-23T15:31Z

- `IMP50-49`: inspeção somente do agregado AUD19-10 confirmou que ele não lista membros raw por caminho; os 99 vínculos agregados continuam insuficientes. O mapa de 141 casos não adjudica classes.
- Discovery 0022 registra, sem escolher, as opções de linhagem (referência exata, manifesto fechado com membros/hash/contagem/origem, ou manter sem adjudicação) e baseline (snapshot v1 de 2.412 caminhos ou novo v2 após congelar escritas). Não emitir `DISCOVERY_READY` sem decisão, evidência e crítica independente.
- Inventário atual de evidências: 2.425 arquivos, 13 adições, 0 ausências e 1 alterado em relação à v1. O agregado JSON não fecha a lacuna; nenhum raw foi aberto.
- Nenhuma nova lane de BUILD local está admitida. `IMP50-40` request-context permanece não aceito (C02 excede 37 linhas); query-parser e `IMP50-42` aguardam revisão humana. Não repetir código/testes nem ampliar allowlists. Staging/produção `NO_GO`.
- Verificação documental: Node `v22.23.2`; `docs:check` PASS (1.111 links, 613 JSON válidos, semântica PASS), Prettier nos oito documentos pertinentes e `git diff --check` PASS. Nenhum teste de produto foi executado.
- Próxima ação crítica: decisão humana separada e hash-bound sobre a SPEC query-parser `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`; sem aprovação e registro de gate/admissão exatos em 0190/0337, não iniciar BUILD.

# PLAN50 — reafirmação request-context e mapa IMP50-49 — 2026-09-23T15:11Z

- `IMP50-40`: o usuário reafirmou BUILD local controlado somente para request-context, no mesmo hash e limites já registrados. A fatia já foi executada; segue não aceita por C02 (4.745 > 4.708 em 37 linhas), C06 e C07. Nenhum código/teste foi repetido. A SPEC query-parser continua sem aprovação/admissão própria.
- `IMP50-49`: mapa não vinculante cobre os 141 candidatos HISTORICAL sem suporte suficiente: 99 agregados e 42 basename/nome não resolvente. Classes permanecem propostas; Discovery segue sem gate. Árvore atual: 2.425 arquivos, 13 adições, 0 ausências, 1 alterado.
- Evidência: [mapa por caminho](04_audit/evidence/PLAN50-20260923/imp50-49-historical-reference-map-v2-20260923.jsonl); [parecer v2](04_audit/evidence/PLAN50-20260923/imp50-49-overlay-review-v2-20260923.md).
- Estado global: 2/50 aceitos apenas em escopo documental/evidencial, 0 BUILDs de produto aceitos; staging/produção `NO_GO`.
- Próxima ação única: obter decisão humana, separada e hash-bound, sobre a SPEC query-parser `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`; sem aprovação e registro do gate/admissão exatos em 0190/0337, não iniciar seu BUILD local. O slice request-context permanece não aceito e sua allowlist congelada.

# PLAN50 — próxima ação AUD20-17-FU1 (registro histórico) — 2026-09-23T14:17:02Z

- `IMP50-40` segue `IN_PROGRESS`, não aceito: o BUILD request-context excede
  C02 em 37 linhas. A aprovação registrada cobre somente aquela primeira
  fatia.
- Uma segunda fatia com os parsers de query foi definida em Discovery 0023,
  PRD 0033 e SPEC separada. A SPEC permanece `DRAFT_PENDING_HUMAN_REVIEW` e não
  autoriza código. Crítica independente v2: sem bloqueador de SPEC, com a
  obrigação de testar mensagens HTTP exatas durante BUILD.
- Caps propostos: `server.ts <=4708`, `request-context.ts <=450`,
  `request-query.ts <=160`, soma `<=5050`. Allowlist e comportamentos negativos
  estão enumerados na SPEC.
- Próxima ação única: revisão humana da SPEC final e decisão de admissão. Até a
  aprovação hash-bound, nenhuma alteração de código/teste para FU1.
- IMP50-49 permanece com overlay read-only proposto, sem adjudicação ou gate.
  Estado global: 2/50 aceitos apenas por documentação/evidência; 0 BUILDs de
  produto aceitos; P0–P7 sem promoção; staging/produção `NO_GO`.

# PLAN50 — triagem IMP50-49 e decisão C02 — 2026-09-23T13:37:30Z

- A proposta de triagem read-only de IMP50-49 cobre os 339 itens não
  resolvidos no snapshot original: 190 HISTORICAL, 23 INHERITED, 107
  UNCLASSIFIED e 19 ORPHAN candidatos. Nada foi adjudicado ou gravado no JSONL;
  126 casos ainda exigem revisão se o overlay for aceito.
- Os 339 tamanhos e hashes conferem; o overlay linha a linha corresponde ao
  inventário. A árvore atual tem 2.420 arquivos: oito adições ao snapshot,
  nenhuma ausência e um arquivo alterado. As adições são três sidecars do
  inventário, três evidências IMP50-40 e dois artefatos de triagem. Ver
  [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.md)
  e [overlay JSONL](04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.jsonl).
- IMP50-40 continua não aceito: C02 excede o cap em 37 linhas e o parecer
  independente mantém C02/C06/C07 sem aceite. Não houve expansão da allowlist.
- Estado do programa: 2/50 aceitos apenas por documentação/evidência; nenhum
  BUILD de produto aceito. P0–P7 sem promoção; staging/produção NO_GO. O
  Gauntlet PLAN50 isolado permanece ACTIVE/DECOMPOSE, 0 rounds, STALE.
- Próxima ação única: decisão humana sobre a revisão SPEC de C02 para
  IMP50-40. Manter a allowlist congelada; IMP50-49 permanece em Discovery sem
  gate de produto.

# PLAN50 — admissão controlada e inventário — 2026-09-23T11:40:43Z

- `AUD20-17`/`IMP50-40`: aprovação humana exata registrada; BUILD local
  controlado em andamento somente para request-context. O slice não está aceito;
  C02 e C01–C07 continuam abertos.
- `IMP50-49`: inventário completo read-only concluído: 2.412 arquivos; 339
  itens `UNCLASSIFIED`/`ORPHAN` aguardam triagem. Sem gate Discovery, política
  aprovada, PRD/SPEC, checker ou BUILD. Ver relatório
  [IMP50-49](04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-report-20260923.md).
- Mantidos 2/50 aceites somente documentais/evidenciais e 0 aceites de produto.
  Staging/produção seguem `NO_GO`.
- Resultado: extração request-context em andamento local, sem aceite; C02
  falha por 37 linhas (`server.ts` 4.745; alvo `<=4708`).
- Evidência: [relatório BUILD AUD20-17 v1](04_audit/evidence/AUD20/AUD20-17-v1-build-report-20260923.md).
- Crítica independente não aprova v1 enquanto C02 falhar; C06 não tem
  resultado de coverage aprovado. Ver
  [parecer](04_audit/evidence/AUD20/AUD20-17-independent-critic-v1-20260923.md).
- Próxima ação única: obter decisão humana sobre a revisão da SPEC de C02 para
  `IMP50-40`; manter o BUILD local não aceito e a allowlist congelada até nova admissão.

# PLAN50 — disposição de execução — 2026-09-23T07:37:38Z

- **Done:** 2/50 melhorias aceitas somente em escopo documental/de evidência:
  `IMP50-41` (reconciliação AC05/C05/C06) e `IMP50-50` (`AUD20-08-FU2`). Isso
  não é aceite de produto.
- **In progress:** nenhum BUILD de produto; 0 slices de produto admitidos.
- **Blocked/waiting:** os outros 48 candidatos permanecem subordinados aos gates parentais;
  próxima fatia `IMP50-40` / `AUD20-17` aguarda revisão humana da SPEC. Ver
  [gate review](04_audit/evidence/PLAN50-20260923/gate-review-20260923.md).
- Lane independente R8: a proposta de follow-up `AUD20-08-FU1` / `IMP50-42`
  e a SPEC estão registradas para revisão; não admitidas para BUILD. Ver
  [preparação](04_audit/evidence/PLAN50-20260923/imp50-42-spec-preparation-20260923.md).
- `IMP50-50` está concluído como catálogo documental, revisão independente
  `PASS`; [recibo](04_audit/evidence/PLAN50-20260923/imp50-50-command-catalog-report-20260923.md).
- `IMP50-41` foi aceito por evidência existente AUD20-08 AC05/C05/C06, após
  revisão independente e negativo focal fresco; a aceitação não qualifica
  candidato nem release. Veja a
  [auditoria](04_audit/evidence/PLAN50-20260923/imp50-41-phase10-metadata-audit-20260923.md).
- `AUD20-10` segue aguardando SPEC; `AUD20-20` segue `BLOCKED` por R2/R3 e
  `AUD20-18`; `AUD20-19` segue aguardando autorização de sessão. `IMP50-21`
  requer follow-up formal antes de corrigir ponteiros em masters de `AUD20-08`.
- Critérios congelados: P0 `PASS` documental somente; P1 `BLOCKED`; P2
  `NOT_RUN`; P3 `PASS` limitado ao envelope/preservação da rodada; P4/P5
  `NOT_RUN`; P6 `BLOCKED/NOT_RUN`; P7 `BLOCKED`.
- Próxima ação única: revisar/aprovar `AUD20-17`/`IMP50-40`, depois registrar a
  fatia exata antes do BUILD. Candidato não congelado; staging/produção `NO_GO`.
- Revalidação gate-only em 06:46Z não identificou slice R8 independente
  admissível antes da revisão; `AUD20-08` permanece concluída e sem extensão de
  autorização. Ver [evidência](04_audit/evidence/PLAN50-20260923/imp50-next-action-gate-review-20260923.md).
- Revalidação de `IMP50-42` confirmou uma proposta SPEC completa para revisão,
  mas ainda sem admissão de BUILD. O ponteiro PLAN50 divergente em `0300` fica
  com `IMP50-21` não admitido; a ação crítica única segue `AUD20-17`/`IMP50-40`.
- `IMP50-49` agora tem proposta Discovery `AUD20-08-FU3` em
  `DRAFT_PENDING_HUMAN_REVIEW`. A escolha de cobertura do inventário aguarda
  revisão; não há PRD/SPEC ou gate de BUILD. O pai `AUD20-08` não foi reaberto.
  Ver [proposta](00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md) e
  [preparação](04_audit/evidence/PLAN50-20260923/imp50-49-policy-preparation-20260923.md).
- Gauntlet isolado continua em DECOMPOSE, 0 rounds e evidence freshness STALE;
  validação sem drift é somente do espelho e não qualifica o workspace atual.

### Revalidação de lanes PLAN50 — 2026-09-23T07:56:51Z

- Não há lane local elegível: os candidatos remanescentes não atendem
  simultaneamente registro na task-mãe, SPEC aprovada, gate, precedências e
  admissão. O detalhe por candidato está na
  [evidência](04_audit/evidence/PLAN50-20260923/ready-lane-revalidation-20260923.md).
- IMP50-40/AUD20-17 continua sendo a próxima ação única, aguardando decisão
  humana sobre o adendo; IMP50-09/10 e IMP50-42 também aguardam revisão de SPEC;
  IMP50-49 aguarda escolha de escopo. IMP50-21 não foi registrado;
  IMP50-33/AUD20-19 aguarda R4 e AUD20-11, e AUD20-19/20 preservam seus gates
  humano e de dependência.
- Nenhuma task foi admitida ou reclassificada. Permanecem 2/50 aceitações
  documentais/de evidência, 0 BUILDs de produto e staging/produção `NO_GO`.
- Rechecagem independente às 08:10:48Z confirmou que não houve avanço de gate
  nem nova admissão. A próxima ação única não muda; consulte a mesma
  [evidência atualizada](04_audit/evidence/PLAN50-20260923/ready-lane-revalidation-20260923.md).

# PLAN50-20260923 — trio executivo das 50 melhorias

- [x] [Plano executivo 0339](03_build/0339_plan50_executive_plan_20260923.md),
      [roadmap 0340](03_build/0340_plan50_roadmap_20260923.md) e
      [backlog 0341](03_build/0341_plan50_backlog_20260923.md) registrados;
      [evidência](04_audit/evidence/PLAN50-20260923/verification.md) cobre
      50/50 IDs e critérios de planejamento.
- [ ] `IMP50-01..50` são candidatos subordinados às tasks `AUD20-*`; admitir
      execução somente pelo gate da task-mãe. `AUD20-10/17` foram reativadas
      para escopo local e aguardam revisão SPEC; `AUD20-20` segue bloqueada por
      dependência R3/R2 e `AUD20-18`.
- [ ] Próxima ação operacional: revisar e aprovar a SPEC de `AUD20-17` v2026-09-23
      para a primeira fatia `IMP50-40`; staging real e produção `NO_GO`.

# PLAN-50-20260923 — oportunidades priorizadas

- [x] [Lista de 50 melhorias](04_audit/0570_prioritized_improvements_2026-09-23.md)
      registrada como proposta: 20 alta, 20 média e 10 baixa; IDs de task e
      gates existentes prevalecem.
- [ ] O encaminhamento de cada proposta segue o DAG AUD20-REM v2 e as
      decisões humanas próprias; reativação local de 10/17/20 registrada,
      com gates e dependências preservados.
- [ ] Próxima ação única: revisar a SPEC `AUD20-17`/`IMP50-40`; a sessão humana
      de `AUD20-19`, staging real e produção seguem pendentes/`NO_GO`.

# AUD-20260923-REPO — reauditoria e encaminhamento

- [x] Auditoria transversal [0569](04_audit/0569_repository_audit_2026-09-23.md)
      concluída com 18 notas e [logs locais](04_audit/evidence/AUD-20260923-REPO/README.md).
- [ ] `A23-01/05`: preservar `AUD20-18/07/12` para rebuild, SBOM, critic e
      certificação do mesmo candidato; promoção permanece `NO_GO`.
- [ ] `A23-02/03`: preservar `AUD20-10/11/13..15` e os gates externos/humanos;
      tasks adiadas não foram reabertas nesta auditoria.
- [ ] `A23-04/07`: reconciliar ponteiros executivos e hotspots quando
      `AUD20-08/17` forem retomadas; não alterar status de produto por esta
      avaliação documental.
- [ ] `A23-06`: próxima ação corrente permanece obter autorização específica
      para a sessão humana de acessibilidade de `AUD20-19`.
- staging real e produção: `NO_GO`.

# AUD20-REM v2 — pacote executivo pós-auditoria 0568

- fonte: [0568](04_audit/0568_full_repository_audit_2026-09-21.md); execução: [plano 0335](03_build/0335_aud20260921_executive_plan.md), [roadmap 0336](03_build/0336_aud20260921_roadmap.md), [backlog 0337](03_build/0337_aud20260921_backlog.md) e [prompt 0338](03_build/0338_aud20260921_codex_execution_prompt.md).
- cobertura: matriz [F01–F30](03_build/tracking/aud20_v2_findings_matrix.json) registra 30/30 achados; AUD20-01..06 e AUD20-16 `COMPLETED` em escopo local controlado; demais tasks seguem o DAG ou autoridade externa.
- checkpoint: AUD20-08 reconciliou estado corrente, Node exato e namespaces de certificação com checker fail-closed.
- [ ] próxima ação única: obter autorização específica para a sessão humana de
      acessibilidade de AUD20-19; manter staging e produção bloqueados.
- [ ] caminho local: AUD20-16 → 05 → 06 → 08 → 20 → 09 → 17 → 10 → 19 → 18 → 07 → 11 → 12.
- [ ] caminho externo/humano: AUD20-13 → 14 → 15, somente com ambiente, owners e autorização reais.
- staging real e produção: `NO_GO`; nenhum planejamento ou prompt substitui gates obrigatórios.

### Fechamento AUD20-05 — 2026-09-22T03:10:00Z

- `COMPLETED_LOCAL`: PostgreSQL `30/342`, regressão `285/2213`, cobertura,
  static/docs/security e binding `17/17` passaram.
- Candidato `83f2aa69…`; crítica independente confirmou C01–C05/C07 e deixou
  apenas o seal, concluído depois do parecer. `releaseEligible=false`.

### Preparação AUD20-06 — 2026-09-22

- Discovery/PRD/SPEC e seus gates documentais foram concluídos; mutation deve
  entrar na lista requerida/decisão/verifier e critic deve permanecer externo,
  fresco e ligado ao candidato exato.
- `WAITING_HUMAN_APPROVAL`: nenhum código do certificador foi alterado.

### Fechamento AUD20-06 — 2026-09-22

- `COMPLETED_LOCAL`: critic e mutation sentinel são gates requeridos; manifesto
  de mutantes possui digest canônico ancorado no código e reports são
  revalidados semanticamente pelo verifier.
- Negativos cobrem candidato/commit divergente, alteração pós-review, catálogo
  alterado/vazio, report forjado, gap/sobrevivente e exit code não propagado.
- Regressão final: `285` arquivos / `2.217` testes; cobertura
  `90,83%/86,99%/89,16%/91,42%`; staging/produção seguem `NO_GO`.

### Preparação AUD20-08 — 2026-09-22

- Discovery/PRD/SPEC concluídos para índice canônico, checker semântico, pin
  Node `22.23.2` e classificação explícita de findings Phase 10.
- Docker digest/rebuild permanece em AUD20-18/07; nenhum código ou workflow foi
  alterado nesta preparação.
- opção A confirmada; BUILD local controlado `IN_PROGRESS`.

### Fechamento AUD20-08 — 2026-09-22

- `COMPLETED`: índice canônico, checker semântico e pin Node `22.23.2`
  passaram nos negativos, regressão e crítica independente C01–C07.
- `AUD20-20` foi liberada como `READY_FOR_NEXT_STEP`; staging e produção
  permanecem `NO_GO`.

### Preparação AUD20-09 — 2026-09-22

- Por instrução explícita do usuário, `AUD20-20` foi adiada sem claim de
  conclusão e a sequência avançou para `AUD20-09`.
- Discovery/PRD/SPEC definem holdout sintético separado, adapter do boundary
  público, métricas por categoria, safety zero, binding e negativos.
- `WAITING_HUMAN_APPROVAL`: BUILD local ainda não autorizado; staging e
  produção permanecem `NO_GO`.

### Fechamento AUD20-09 — 2026-09-22

- `COMPLETED`: holdout integrado 19/19, métricas por 18 categorias, safety e
  efeitos zero; mutation 16/16 e crítica independente C01–C07 PASS.
- Regressão Node 22: 286 arquivos / 2.230 testes; cobertura
  `90,78%/86,89%/89,24%/91,38%`; `releaseEligible=false`.
- `AUD20-17` avança para `READY_FOR_NEXT_STEP`; staging/produção seguem
  `NO_GO`.

### Preparação AUD20-17 — 2026-09-22

- Discovery/PRD/SPEC selecionam a primeira fatia incremental: extrair contexto
  de request (identidade, permissão e tenant) de `apps/api/src/server.ts`.
- Meta: reduzir ao menos 250 linhas, preservar default deny/contratos HTTP e
  provar owner único, ausência de ciclo e negativos no boundary público.
- `WAITING_HUMAN_APPROVAL`: nenhum código desta task foi alterado; BUILD local
  exige confirmação explícita e staging/produção seguem `NO_GO`.

### Preparação AUD20-10 — 2026-09-22

- `AUD20-17` foi adiada por instrução do usuário, sem claim de conclusão.
- Discovery/PRD/SPEC de F10 definem collector local opt-in, emissão real de
  `approval_latency_ms`, delivery ledger e exercício correlacionado.
- Owner e SLO não foram inventados; BUILD local está
  `WAITING_HUMAN_APPROVAL`, staging/produção seguem `NO_GO`.

### Preparação AUD20-19 — 2026-09-22

- `AUD20-10` foi adiada por instrução do usuário, sem claim de conclusão.
- Discovery/PRD/SPEC definem perfis e skips fail-closed, workload PostgreSQL
  sintético e dossiê verificável para sessão humana de acessibilidade.
- BUILD de tooling está `WAITING_HUMAN_APPROVAL`; sessão humana, staging e
  produção não estão autorizados.

### Fechamento local AUD20-19 — 2026-09-22

- Tooling C01–C07 recebeu `PASS_LOCAL` candidate-bound: perfis
  candidate-bound, skips fail-closed, receipts SHA-256, carga PostgreSQL real
  do worker, terminação/recuperação, cleanup e mutation `4/4` passaram.
- Regressão PostgreSQL: `30/354`; focused: `5/5`; crítica independente final:
  `PASS_LOCAL`, sem P0/P1.
- A task permanece `WAITING_HUMAN_APPROVAL`: sessão humana não executada,
  `releaseEligible=false`, staging e produção `NO_GO`.

### Preparação AUD20-05 — 2026-09-21

- A SPEC de attestation, recursos observados, grants CRUD e replay distribuído
  foi registrada em
  [aud20_05_resource_attestation_replay_20260921.md](02_spec/aud20_05_resource_attestation_replay_20260921.md).
- A opção A foi registrada como orientação de desenho escolhida pelo usuário,
  sem preencher owner formal, autoridade/ação de review ou validade da decisão
  de `AUD20-16`.
- O mapeamento confirmou as fronteiras existentes em
  `production-preflight-core`, `operator-identity`, `operator-replay-store`,
  bootstrap da API e preflight PostgreSQL do worker. Nenhum arquivo de produto,
  schema ou migration foi alterado; `AUD20-05` permanece bloqueada até o gate.

### AUD20-05 — tooling offline verificado — 2026-09-21T23:26:20Z

- Foi entregue o checker read-only de attestation/recurso/grants em
  `scripts/aud20-05-resource-attestation-check.mjs`, com focused `8/8` e
  negativos para digest observado, candidato trocado, attestation expirada ou
  adulterada, grants CRUD incompletos/permissivos, RLS bypass, segredo bruto e
  input não sintético.
- Regressão local passou `284` arquivos / `2.192` testes / `188` skips; coverage
  passou com `91,16%` statements, `87,24%` branches, `89,30%` functions e
  `91,76%` lines. Typecheck, lint, format, docs `789/582` e diff passaram.
- A evidência está em
  `docs/04_audit/evidence/AUD20/AUD20-05-tooling-report-20260921.md`.
  Isso é `PASS_LIMITED` de tooling: não prova grants PostgreSQL efetivos,
  startup/bind/claim do produto e não libera `AUD20-05`, staging ou produção.

### AUD20-05 — grants efetivos em PostgreSQL descartável — 2026-09-22T00:18:15Z

- O probe `scripts/aud20-05-replay-grants-probe.mjs` aceitou somente loopback,
  criou schema/roles/tabela sintéticos com nomes únicos, confirmou CRUD efetivo,
  ausência de DDL/ownership/membership administrativo e removeu o fixture com
  cleanup `PASS`.
- Focused dos dois toolings passou `12/12`; regressão passou `285` arquivos /
  `2.196` testes / `188` skips; coverage permaneceu
  `91,16%/87,24%/89,30%/91,76%`; typecheck, lint e format passaram.
- Evidência:
  `docs/04_audit/evidence/AUD20/AUD20-05-postgres-grants-probe-20260921.md`.
  C03 avança somente como `PASS_LIMITED`; o probe declara
  `notRuntimeProof=true` e não libera produto, `AUD20-05`, staging ou produção.

### AUD20-05 — matriz adversarial de grants — 2026-09-22T00:41:12Z

- Seis known-bad variants PostgreSQL foram rejeitadas pelo motivo esperado:
  CRUD incompleto, `CREATE`, `TRUNCATE`, ownership runtime, bypass-RLS e
  membership. O caso mínimo válido passou.
- Todos os sete cenários tiveram cleanup `PASS`; o catálogo terminou com `0`
  schemas/roles sintéticos residuais.
- Focused do probe `6/6`; regressão `285/2.198/188`; typecheck, lint e format
  passaram. Coverage não foi reexecutada nesta subrodada; vale o último run
  V1.12 já registrado.
- Escopo permanece tooling local: C03 `PASS_LIMITED`, runtime não exercitado,
  `AUD20-05` bloqueada e staging/produção `NO_GO`.

### Checkpoint AUD20-16 — receipts reconciliados — 2026-09-21T19:45:13Z

- Os oito comandos do receipt foram vinculados aos artefatos brutos por SHA-256;
  `docs:check` final passou com `778` links e `582` JSONs, além de
  `format:check` e `git diff --check`.
- A regressão full registrada permanece `283` arquivos, `2182` testes e `188`
  skips condicionais; o focused do calculador permanece `3/3`.
- O estado oficial não muda: `AUD20-16=WAITING_HUMAN_APPROVAL`,
  `AUD20-05` bloqueada e staging/produção `NO_GO`. Nenhum código de schema,
  migration ou archive foi iniciado para AUD20-16.

### Checkpoint AUD20-16 — crítica parcial — 2026-09-21T19:57:38Z

- A crítica independente fresh-context confirmou o gate humano e classificou
  C03 como a única fatia local concluível neste momento.
- C07 foi corrigido de `PASS` para `WAITING_HUMAN_APPROVAL`: checks mecânicos
  não substituem o binding semântico de policy/owner/review trigger.
- Os receipts serão regenerados após logs finais, pois o `observedAt` anterior
  precedia os artefatos de 19:38Z. O estado continua `WAITING_HUMAN_APPROVAL`;
  `AUD20-05` e staging/produção permanecem bloqueados/`NO_GO`.

### Checkpoint AUD20-16 — receipt final — 2026-09-21T20:07:31Z

- A integridade foi fechada: `11/11` artefatos brutos e `8/8` vínculos de
  comando conferem em bytes/SHA-256; dois typos herdados foram corrigidos.
- O estado segue `WAITING_HUMAN_APPROVAL`; C07 não é PASS semântico, C03 é a
  única fatia local concluída, `AUD20-05` está bloqueada e staging/produção
  permanecem `NO_GO`.

### Checkpoint AUD20-16 — interpretação D05 — 2026-09-21T20:22:34Z

- Parecer independente classificou o horizonte pós-tombstone como
  `AMBIGUOUS`, owner formal como `BLOCKED` e review trigger como `BLOCKED`.
- Foi criado o [pedido de decisão](02_spec/aud20_16_human_decision_request_20260921.md),
  sem valor padrão. D05-3/4 não será reinterpretado silenciosamente.
- `AUD20-16` segue `WAITING_HUMAN_APPROVAL`; `AUD20-05` e staging/produção
  permanecem bloqueados/`NO_GO`.

### Checkpoint AUD20-16 — origem sintética fail-closed — 2026-09-21T21:01:56Z

- A calculadora de capacidade offline passou a exigir `dataOrigin: "synthetic"`;
  ausência e origem não sintética falham fechado. O horizonte continua input
  ilustrativo `PENDING_HUMAN_APPROVAL`, sem escolha de política.
- RED/GREEN e negativos foram renovados: focused `4/4`, full `283` arquivos,
  `2183` testes e `188` skips; lint, format, docs `782/582` e diff passaram.
- Receipts foram regenerados e o binding verifier separado confirmou `11/11`
  artefatos e `8/8` links. C03 é a única fatia local; C01/C02/C04–C06/C07
  continuam dependentes do gate humano/crítica fresh.
- Próxima ação: preencher o [pedido de decisão](02_spec/aud20_16_human_decision_request_20260921.md);
  AUD20-05 permanece bloqueada e staging/produção `NO_GO`.

### Checkpoint AUD20-16 — PostgreSQL descartável e regressão final — 2026-09-21T21:50:41Z

- O tooling neutro agora mede em PostgreSQL `16.15` local descartável os
  `pg_*` de linha/relation/índice/total, p50/p95 e sweep em três volumes
  sintéticos; o schema temporário é removido ao final. C03 fica localmente
  `PASS` limitado ao escopo de planejamento.
- A validação final passou focused `5/5`, full `283` arquivos/`2184` testes/
  `188` skips, negativos de origem/horizonte/taxa/p95 e checks mecânicos a
  serem registrados no reseal. Nenhum dado real ou efeito externo foi usado.
- Foi adicionado `AUD20-16-binding-verifier.mjs`; o candidate binding e os
  receipts ainda serão fechados após os últimos logs, seguidos de crítica
  independente fresh-context. C01/C02/C07 continuam sem liberação semântica;
  C04–C06 não foram executados.
- Estado: `AUD20-16=WAITING_HUMAN_APPROVAL`; `AUD20-05` bloqueada;
  staging/produção `NO_GO`. Próxima ação única: decisão humana explícita para
  horizonte pós-tombstone, owner formal e review trigger.

### Checkpoint AUD20-16 — crítica fresh e chronology reconciliada — 2026-09-21T22:18:02Z

- A crítica independente fresh-context v2 deu `PASS_LIMITED_NOT_COMPLETION`:
  C03 `PASS` com medição PostgreSQL, binding/receipts íntegros; C01/C02/C07
  `WAITING_HUMAN_APPROVAL`; C04–C06 `NOT_RUN`.
- O gap apontado — checkpoints operacionais anteriores ao receipt de
  `22:01:54Z` — foi corrigido neste bloco final. Nenhum hash, código, schema ou
  política foi alterado para isso.
- Estado permanece `AUD20-16=WAITING_HUMAN_APPROVAL`; `AUD20-05` bloqueada;
  staging/produção `NO_GO`. Próxima ação única: decisão humana explícita para
  horizonte pós-tombstone, owner formal e review trigger.

### Checkpoint AUD20-16 — reseal final alinhado — 2026-09-21T22:24:43Z

- Runtime state, execution log, backlog e `CURRENT.md` foram alinhados ao
  fechamento final sem alterar código, policy, source digest ou evidência.
- Candidate binding, verifier e receipts permanecem íntegros; o veredito da
  crítica v2 segue `PASS_LIMITED_NOT_COMPLETION`. C03 passa no escopo de
  planejamento; C01/C02/C07 aguardam decisão humana; C04–C06 `NOT_RUN`.
- Estado: `AUD20-16=WAITING_HUMAN_APPROVAL`; `AUD20-05` bloqueada;
  staging/produção `NO_GO`. Próxima ação única: decisão humana explícita para
  horizonte pós-tombstone, owner formal e review trigger.

# AUD-20260921-REPO — backlog derivado da auditoria profunda

- [ ] **P0 / AUD20-04:** implementar batelamento limitado e concorrente no tombstone, testar múltiplos lotes/restart/backpressure e ensaiar migration sem lock não limitado.
- [ ] **P0 / AUD20-04:** congelar outputs antes dos receipts, regenerar binding depois do último write e obter crítica fresca; o receipt atual diverge em 8 artefatos.
- [ ] **P0 / AUD20-07/12:** rebuild candidate-bound de imagens, SBOM, migration/policy digests e certificação no mesmo run.
- [ ] **P1 / AUD20-05/06:** vincular attestation/grants aos recursos reais e tornar crítico/mutation gates obrigatórios do certificador.
- [ ] **P1 / AUD20-08/09:** reconciliar matriz/estado/Node e adicionar checker semântico e holdout integrado por categoria.
- [ ] **P1 / AUD20-10/11:** fechar observabilidade operacional e composição staging-like do mesmo build.
- [ ] **P2:** definir lifecycle/capacidade dos tombstones, corrigir semântica `deletedCount`, reduzir hotspots/branch chasing e endurecer Docker/healthcheck/pinning.
- [ ] **P0 release / AUD20-13..15:** validar somente em ambiente autorizado provider, canal, IdP, RAG institucional, RPO/RTO físico, rollback, piloto e sign-off humano.
- evidência e inventário completo: [auditoria 0568](04_audit/0568_full_repository_audit_2026-09-21.md); maturidade local `72/100`, produção `20/100`, staging/produção `NO_GO`.

# GIT-SYNC-20260915 — versionamento autorizado e push concluído — 2026-09-15

- task: `GIT-SYNC-20260915`; status: `COMPLETED`.
- autorização: commit e push solicitados explicitamente para
  `https://github.com/ricardoakinaga-dev/cvg-agent-secretary-v2`.
- entrega: 10 commits locais pendentes e o commit
  `07ed0459690e62b5c1a501d3e9f1e57cd4d031fe` dos artefatos de certificação
  foram publicados em `origin/main`.
- evidência: remoto avançou de `22b0887` para `07ed045`; os JSONs alterados
  são válidos, não há arquivos não rastreados ou acima de 20 MiB e a árvore
  ficou sincronizada (`HEAD...origin/main = 0 0`) antes deste registro.
- next_action: retomar a revisão independente e os gates externos/humanos de
  AAA-21; produção permanece `NO-GO`.
- limite: nenhum deploy, integração real, dado real ou efeito externo foi
  autorizado nesta tarefa; testes não foram reexecutados.

# AAA-21-HARDEN-20260915 — backlog após hardening de recovery e lineage — 2026-09-15

## Concluído nesta rodada

- [x] Ligar recovery de Goals runnable ao sweep periódico do worker, com métricas de inspeção, retomada, conclusão e falha.
- [x] Fazer a conclusão depender de `successCriteria` e evidência persistida/verificada.
- [x] Persistir deadline absoluto, runtime/version e planner context para restart antes do primeiro plano.
- [x] Aplicar timeout abortável por Step e reconciliar approvals expiradas antes de deixar Goals em espera órfãos.
- [x] Validar lineage Goal/Plan/Step/Attempt em memória e PostgreSQL, incluindo effect journal e outbox.
- [x] Entregar inspeção read-only tenant-scoped na API/console e telemetria bounded para transições e recovery.
- [x] Executar unit `249/1.743/116 skips`, PostgreSQL `23/199`, build, startup, lint, typecheck, security, licenses e focused hardening sob Node `22.23.2`.

## Bloqueios restantes

- [x] Reexecutar certificação Phase 10/11 candidate-bound depois do commit e verificar os manifests no mesmo candidato (Node `22.23.2`; todos os gates mecânicos PASS).
- [ ] Conectar o inbound público ao orquestrador com rollout controlado e handoff explícito, depois de revisão independente.
- [ ] Validar provider, canal, identidade, RAG institucional, piloto supervisionado, durabilidade física/RPO-RTO e signoff humano em ambientes autorizados.
- [ ] Manter produção `NO-GO` até os gates externos e humanos serem satisfeitos; nenhuma ação clínica, financeira, de prontuário ou consulta real é automatizada.

# AAA-21 — backlog atualizado após BUILD de orquestração — 2026-09-15

## Concluído neste incremento

- [x] Criar contrato durável de Goal/Plan/Step com estados de aprovação, handoff, espera externa, incerteza, budget e loop.
- [x] Validar DAG, dependências, capacidades, risco, timeout e fingerprint antes da ativação.
- [x] Persistir Goal/Plan/Step/Attempt/Observation/Evaluation em PostgreSQL com tenant, RLS, versão e fencing.
- [x] Executar fixture controlada pelo kernel governado e provar approval pendente/restart sem duplicação.
- [x] Expor inbound opt-in com `CVG_DURABLE_KERNEL_ORCHESTRATOR=true` e retomar aprovação com CAS persistido.
- [x] Registrar testes e evidências sem dados reais.

## Próximos itens bloqueantes

- [ ] Conectar o inbound público ao orquestrador com flag de rollout controlada e handoff explícito.
- [ ] Persistir `goal_id`, `plan_id` e `step_id` no effect journal, outbox e audit chain.
- [ ] Adicionar métricas, spans, read model e ações da console para pending/approval/recovery/uncertain.
- [ ] Registrar reconciliadores para efeitos externos e prova de restart/crash com RPO/RTO físico.
- [ ] Validar provider, canal, identidade, RAG institucional, piloto supervisionado e signoff humano em ambiente autorizado.

Os manifestos candidate-bound correntes registram `CONDITIONAL_GO / AAA_CONTROLLED` após a execução sob Node `22.23.2`. Nenhum item externo foi inferido como concluído; produção continua `NO-GO`.

# AAA-21-PHASE11-FINAL-20260915 — certificação controlada encerrada — 2026-09-15

- validade: `HISTORICAL`; supersedido pelo BUILD de orquestração e pelo commit `b02a493`; não certifica o candidato atual.
- status: `CONDITIONAL_GO` / `AAA_CONTROLLED`; produção `NO-GO`.
- concluído: o candidato commit-bound atual foi certificado sob Node `22.23.2`, com identidade e hashes registrados nos manifestos correntes; Phase 10 e Phase 11 passaram todos os gates locais e os verificadores pós-run. PostgreSQL descartável foi encerrado.
- próxima ação: revisão independente fresca, fechar adjudicação dos requisitos `PARTIAL` e executar somente em ambientes autorizados os gates de provider, canal, IdP, piloto, RPO/RTO físico e signoff humano. Não promover `AAA_CONTROLLED` a produção.
- bloqueios: `modelProvider/channel/externalIdentity=NOT_VALIDATED`, `humanSignoff=PENDING`, P11-GOVERNANCE/ORCHESTRATION/DURABLE-EFFECTS/RECOVERY/PUBLIC-VERTICAL/OBSERVABILITY/SECURITY/UX-CONSOLE=`PARTIAL` e P11-EXTERNAL-HUMAN=`BLOCKED`.
- evidência: `certification/phase11-result.json`, `certification/phase11-manifest.json`, `certification/phase10-result.json`, `certification/manifest.json`, `tests/phase11-certification.test.js`, `scripts/phase11-verify.mjs` e `docs/11_phase11/phase11_execution_contract.md`.

# AAA-21-PHASE11-HARDEN-20260915 — pré-selo final — 2026-09-15

- status: `REVIEW`; produção `NO-GO`; Node 22.23.2 e format ativo qualificados localmente.
- concluído: cadeia de certificação agora compara commit/manifest/candidate head e estado dirty real; outputs gerados não contaminam o candidato; regressões de dirty candidate e manifest sem commit passaram.
- próxima ação: criar o commit do candidato, executar Phase 10 e Phase 11 completos sob Node 22, validar evidência e preservar gates externos/humanos como bloqueios explícitos.
- evidência: `tests/phase11-certification.test.js`, `scripts/lib/certification-rules.mjs`, `scripts/phase10-verify.mjs`, `scripts/phase11-verify.mjs` e `docs/11_phase11/phase11_execution_contract.md`.

# AAA-21-PHASE11-CERT-20260915 — estado após certificação final — 2026-09-15

- status: `REVIEW/BLOCKED`; produção `NO-GO`; certificação candidate-bound atual `NO_GO`.
- concluído: matriz/contrato/prompts preservados; fencing de claim, trace vertical, persistência PostgreSQL direta, console responsivo e E2E atualizados; gates locais técnicos principais PASS, incluindo cobertura e PostgreSQL; verificador pós-run PASS.
- bloqueios: format global, Phase 10 current verification, árvore alterada e Node 24 versus target Node 22; gates externos/humanos, provider/canal/IdP/RAG, piloto e durabilidade física/RPO-RTO continuam pendentes.
- próxima ação: repetir a qualificação em Node 22 após fechar os bloqueios locais e obter revisão/signoff independentes; nenhuma promoção para `VERIFIED`, `DONE`, `AAA_CANDIDATE` ou produção.
- evidência: `certification/phase11-result.json`, `certification/phase11-manifest.json`, `certification/phase11-logs/` e `docs/11_phase11/PHASE11-ROUND-20260914.md`.

# AAA-21-PHASE11-EXEC-20260914 — pacote Phase 11 em AUDIT controlado — 2026-09-14

- task canônica: `AAA-21`; status `REVIEW/BLOCKED`; produção `NO-GO`.
- last_completed_action: 14 prompts arquivados e hasheados; matriz/contrato/certificador Phase 11 criados; correção PostgreSQL direta; migration `0018_outbox_lease_fencing` e token de claim propagado em heartbeat/ack/fail; teste de takeover com `workerId` reutilizado; trace público e console responsivo verificados.
- evidência corrente: PostgreSQL `21 arquivos / 193 testes`, web `23 / 81`, E2E `8 / 8`, typecheck/lint/build/startup PASS. O resultado candidate-bound e a verificação mecânica devem ser gerados no fechamento da rodada.
- next_action: executar `certify:phase11` + `certification:verify:phase11`; em seguida fechar Node 22, format global, cobertura crítica e revisão fresca. Não promover `AAA-21` a `VERIFIED`/`DONE`.
- limites preservados: somente dados sintéticos e banco descartável; provider/canal/IdP/RAG institucional, produção, deploy, piloto, durabilidade física, RPO/RTO e signoff humano continuam bloqueados.
- evidência: [`PHASE11-ROUND-20260914.md`](11_phase11/PHASE11-ROUND-20260914.md), [`requirements-matrix.json`](11_phase11/requirements-matrix.json), [`phase11_execution_contract.md`](11_phase11/phase11_execution_contract.md) e `certification/phase11-{result,manifest}.json`.

# AAA-21-EXEC-20260914 — task em execução controlada — 2026-09-14

- task canônica: `AAA-21`; execução: `AAA-21-EXEC-20260914`; status: `IN_PROGRESS`.
- contrato congelado: [SPEC](02_spec/aaa21_build_execution_contract_20260914.md) sha256 `fd5c4214…`; [bar](04_audit/evidence/AAA/AAA-21/quality-bar-v1.json) sha256 `181b218b…`.
- aceite desta rodada: caminho sintético público API→worker→kernel com trace/correlation preservados, replay sem efeito duplicado, fail-closed em identidade/tenant/approval/journal e regressão completa disponível.
- lanes descobertas: aprovação pública/runtime continuation; status de inbound; observabilidade/ledger; identidade da composição; console DLQ/contexto/erro; acessibilidade/visual QA.
- autorização: somente BUILD local controlado por solicitação atual do usuário; produção, provider/canal/IdP/RAG/dados reais/deploy e side effects continuam `NO-GO`.
- próxima ação: RED focado e implementação mínima; nenhuma task é promovida a `VERIFIED` antes de crítico independente.

# AAA-21 — evidência controlada candidate-bound — 2026-09-14

- status canônico: `READY`; evidência atual: `CANDIDATE_PENDING_INDEPENDENT_REVIEW` no recorte controlado; o parecer vigente está no manifesto; produção `NO-GO`.
- last_completed_action: candidato canônico de 895 arquivos resealed (IDs no manifesto); self-test antes do selo; 15/16 gates PASS, `format` FAIL; verificador confirmou 29 hashes e zero drift.
- bloqueios: format reporta 276 arquivos; branches críticos abaixo de 95%; task success `0.9464285714285714` abaixo do alvo AAA `0.97`; Node 24 versus alvo 22; holdout/mutação/Docker/durabilidade física/RPO-RTO/provider/canal/identidade/signoff não validados.
- next_action: obter autorização explícita de BUILD e ambiente Node 22 para remediação; repetir `certify`, `certification:verify` e revisão fresca. `buildAuthorization=NOT_GRANTED_BY_THIS_PLANNING_DELIVERY`; não marcar `VERIFIED`/`DONE`.
- evidência: [manifesto](04_audit/evidence/AAA/AAA-21/manifest.json), [checks](04_audit/evidence/AAA/AAA-21/CHECKS.md), `certification/phase10-result.json`.

# PROD-20260913 — rodada 4 — 2026-09-13

- D02 (draft-only), D03 (alvos de laboratório), D04 (integrações reais bloqueadas), D05-3/4 (retenção/TTL aprovados) registradas; D05-SIG adiada. [Pacote](02_spec/prod20260913_decision_packet.md).
- **PROD-04 `VERIFIED`**: ApprovalStore durável com CAS SQL sob FOR UPDATE, migration 0015, revisão fresca PASS; gates 248 arquivos/1.775 testes/0 skips e PostgreSQL 20/174/0.
- Próxima ação: AAA-21 (fronteira/composição HTTP→SQL→worker→kernel→efeito falso→audit), depois PROD-07/08/09. D04=A mantém AAA-37/38/39 bloqueados; produção NO-GO. [Relatório](04_audit/0563_prod_round3_2026-09-13.md).

# PROD-20260913 — rodada 3 — 2026-09-13

- M1 encerrado com crítico fresco **PASS**; D01 registrada (opção C); [contrato de composição v2](02_spec/aaa_composition_contract.md) congelado; AAA-19/20 `VERIFIED`; WAVE3-01 P1 corrigido e verificado.
- `READY`: AAA-21 (composição) e PROD-04 (ApprovalStore durável; SPEC rota A + migration 0015). Próxima execução: PROD-04 → AAA-21 → PROD-07/08/09.
- Gates finais: 247 arquivos/1.764 testes/0 skips; PostgreSQL 19/163/0; typecheck/build/startup PASS. D02–D05 seguem PENDING; produção NO-GO. [Relatório](04_audit/0563_prod_round3_2026-09-13.md).

# PROD-20260913 — reauditoria M1 round2 — 13/09/2026

- status: `WAITING_HUMAN_APPROVAL` para D01–D05; lote técnico com revisão `CONDITIONAL PASS`, produto `NO-GO`.
- last_completed_action: oito achados reproduzidos (seis P1/dois P2) corrigidos; readiness, sessão/formulário, tarefa+audit/replay, cleanup e preflight. Regressão independente:69 testes e77 perturbações de grants; sentinel2.659 arquivos limpo. Qualificação Node22: npm test1.645 passes/88 skips condicionais; cobertura1.733 testes sem skips, PostgreSQL163 sem skips, typecheck/lint/build/startup e E2E6/6; npm ci + build limpo PASS.
- next_action: obter revisão com contexto novo para fechar M1; registrar D01 no pacote de decisões para iniciar ADR/PROD-04/AAA-06/21. Preparar contratos PROD-07/08/09 conforme dependências; seguir D03–D05 para operação/homologação/release.
- Tarefas PROD-02/03/05/06 e AAA-22: `REVIEW`; histórico VERIFIED anterior preservado, não promovido nos bytes novos. PROD-14: `REVIEW`, pacote preparado, decisões PENDING.
- [Relatório atual](04_audit/0562_prod_m1_reaudit_2026-09-13.md), [pacote D01–D05](02_spec/prod20260913_decision_packet.md), [evidência](04_audit/evidence/PROD-20260913/reaudit-round2/manifest.json).
- Limites: crítico final independente dos builders mas sem contexto totalmente novo; Docker sem permissão, nenhum restore físico/SLO aprovado/mutação integral/holdout/homologação/signoff novo. Nenhuma nota global AAA/State of Art. O baseline2525/2531 do registro anterior era pré-BUILD M1.

# PROD-20260913 — execução do lote M1 — 2026-09-13

- [Contrato M1](02_spec/prod20260913_m1_corrections_contract.md) congelado `7cff313d…`; [PROD-01](04_audit/evidence/PROD-20260913/PROD-01/manifest.json) revalidou o baseline (0 fontes de produto alteradas vs auditoria) e o mapa 80/80+156/156.
- `VERIFIED` no [delta](03_build/tracking/production_delta_backlog.json): PROD-01/02/03/05/06, com [revisão](04_audit/evidence/PROD-20260913/independent-review/REVIEW.md), [resposta](04_audit/evidence/PROD-20260913/independent-review/RESPONSE.md) e [revalidação](04_audit/evidence/PROD-20260913/independent-review/revalidation.md) independentes. PROD-04 `BLOCKED` por D01/AAA-06. AAA-22 segue `REVIEW` (D13-04 verificado; composição consumer pendente).
- Próximos passos: `PROD-14` (decisões D01–D05), `PROD-04` após D01, `PROD-07/08/09` (console/jornadas) e comprovação de composição AAA-06/21. Nenhuma capacidade real ou autorização de produção foi criada.

# PLAN-PROD-20260913 — plano para produção — 2026-09-13

- Entrega de planejamento `COMPLETED`. [Backlog consolidado](BACKLOG_PRODUCAO.md): 42 IDs AAA existentes + 14 IDs PROD complementares. Status AAA preservados no JSON existente; status PROD no [JSON delta](03_build/tracking/production_delta_backlog.json). Pré-requisitos novos de fechamento são cumulativos, sem renumerar histórico.
- Cobertura planejada: D13-01..09, A01..20, 80 critérios e 156 linhas de requisitos identificados. Mapeamento não é prova de implementação. [Plano](PLANO_EXECUTIVO_PRODUCAO.md), [roadmap](ROADMAP_PRODUCAO.md), [validação](04_audit/evidence/PLAN-PROD-20260913/validation.json).
- `next_action`: PROD-01 — revalidar candidato e preparar contratos/revisão das correções P1; conferir autorização aplicável antes de código. Programa PLANNED; nenhum BUILD/qualificação/release concedido por estes documentos.

# AUD-20260913-DOCS — comparação docs × implementação — 2026-09-13

- Task de auditoria: `COMPLETED`; artefato canônico [relatório 0560](04_audit/0560_docs_implementation_audit_2026-09-13.md). Código preservado; sem BUILD ou gate de produção concedido.
- Achados novos/atuais D13-01..09 registrados no relatório com fonte, prioridade, responsável sugerido e aceite. D13-01 atomicidade SQL e D13-02 estado UI: P1, pendentes de correção revisada. D13-03 composição/D01, D13-04 readiness e D13-05 ApprovalStore durável permanecem impeditivos da qualificação integrada.
- `next_action`: registrar/revisar task de correção D13-01 (mutação de jornada + audit na mesma transação), incluindo reprodução preservada e teste rollback/replay; executar BUILD somente no gate aplicável. D13-02 é frente independente possível. Tasks AAA não recebem DONE por esta auditoria.
- Nota61/100; produção20/100 e NO-GO. Evidências e limites no relatório; não herdar o PASS histórico de P1 para código posterior.

# AAA-20260912 — próxima tarefa do Agente 3

- status: `IN_PROGRESS`; last_completed_action: verificação isolada da imagem runtime Node22 registrada em AAA-14, ainda REVIEW; nenhum resultado novo de imagem alegado.
- next_action: **Agente 3 / imagem runtime AAA-14**, [prompt](04_audit/evidence/AAA/AAA-14/runtime-image-assignment/next-task-agent-3.md). Build explícito target runtime, instalação prod-only e smoke sintético; se Docker indisponível, preservar bloqueio sem equiparar fallback à imagem. Evidências somente, sem alterar produto/publicar imagem.
- coordenação: Agente 1 mantém cobertura crítica AAA-07; Agente 2 mantém mutação dirigida AAA-12. Ensaio AAA-13 aprovado permanece histórico daquele snapshot; sem full certify novo ou gates/DONE concedidos.

# AAA-20260912 — próxima tarefa do Agente 2

- status: `IN_PROGRESS`; last_completed_action: tarefa de mutação dirigida AAA-12 registrada após cobertura aprovada; seleção deve ser congelada antes da execução, conforme AAA-04 v2 §9.1.
- next_action: **Agente 2 / guards críticos do canal**, [prompt](04_audit/evidence/AAA/AAA-12/mutation-assignment/next-task-agent-2.md). Mutantes somente em cópia isolada; origem permite testes/evidências próprios. Nenhum resultado de mutação ainda medido ou aprovado.
- coordenação: Agente 1 mantém cobertura crítica AAA-07; Agente 3 aguarda atribuição. AAA-12 REVIEW, sem DONE/G_QUALITY/SQL/AAA-21; não repetir cobertura já aceita como tarefa nova.

# AAA-20260912 — auditoria das três entregas / próxima ação única — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: AAA-07 C6-F01/F02 fechados; AAA-12 subset/branches críticos medidos aprovados; AAA-13 ensaio isolado aprovado. Três tasks em REVIEW, sem DONE. [Parecer](04_audit/evidence/AAA/coordinator-batch-review/REVIEW.md).
- evidência independente: hashes AAA07 3/3, testes canal4/4+pinados14/14, ensaio52/52; approval+canal153 PASS; canal isolado105 PASS e coverage98,39/96,18/96,11/99,61; probe C6 exit0; verifier do snapshot exit0/27hashes. Full certify e suites globais não reexecutados.
- next_action: **somente Agente 1 / cobertura crítica AAA-07**, [prompt](04_audit/evidence/AAA/coordinator-batch-review/next-task-agent-1.md). Agentes 2/3 aguardam atribuição do coordenador, sem repetir entregas aceitas nem iniciar outra task. AAA-09 não iniciada.
- limites: shared-before/after têm metadados diferentes, linhas de hashes iguais. Snapshot Node24 não qualifica árvore atual/Node22 alvo. Cobertura global/mutação/durabilidade/composição/gates externos continuam pendentes; nenhum gate de produção ou G_QUALITY concedido.

# AAA-20260912 — aceite AAA12-C4-F01 / cobertura do canal — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: C4-F01 fechado independentemente; 14 hashes/digest 70311445… conferidos, canal 7/57 PASS; probe de 6 versões rejeita sem alterar bytes/permitir claim. AAA-12 **REVIEW**, sem DONE.
- next_action: somente **Agente 2 / cobertura comportamental AAA-12**, [prompt](04_audit/evidence/AAA/AAA-12/review-coordinator-c4/next-task-agent-2.md), testes/evidências próprios e código do produto preservado. Frentes 1/3 mantidas.
- evidência: [parecer](04_audit/evidence/AAA/AAA-12/review-coordinator-c4/REVIEW.md), checks/logs/probe adjacentes. Subset functions 79,61% FAIL e branches críticos abaixo da barra permanecem abertos; PASS global não compensa. Coverage e suites globais não reexecutados nesta auditoria focada.
- limites: sem SQL/migrations/AAA-21, durabilidade física, produção ou gate concedido; nenhum código do produto alterado pelo coordenador.

# AAA-20260912 — aceite AAA-13 R4 / ensaio isolado — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: R4 aprovado no recorte corrigido; C5-F01/F02 fechados, C3-F01 continua fechado. 3 hashes conferidos; 37/37 checks + R1/R2 do coordenador PASS (39/39 no harness estendido); histórico 27 hashes PASS. AAA-13 **REVIEW**, sem DONE/qualificação atual.
- next_action: somente **Agente 3 / ensaio integrado AAA-13**, [prompt](04_audit/evidence/AAA/AAA-13/review-coordinator-r4/next-task-agent-3.md). Full certify autorizado exclusivamente em cópia consistente/isolada com dependências sintéticas, seguido do verificador; sem editar produto/certificados compartilhados. Frentes 1/2 preservadas.
- evidência: [parecer](04_audit/evidence/AAA/AAA-13/review-coordinator-r4/REVIEW.md), hashes/logs/reprodução adjacentes. 37 checks incluem 9 helpers e 28 CLI; C0 sintético não comprova integração do produtor completo. Chaos obrigatório conferido com suíte real.
- limites: full certify, suites globais, Docker e benchmark não executados nesta auditoria. Nenhuma autoridade de produção, signoff ou G_QUALITY inferida. Débitos declarados dos demais parsers permanecem registrados.

# AAA-20260912 — auditoria AAA-07 lifecycle — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: 4 hashes conferidos e pacote 4/42 PASS. AAA-07 **REWORK** por AAA07-C6-F01/F02 P1: sweep antigo modifica reserva nova; token liberado pode ser reutilizado para EXECUTING. Probes públicos sintéticos, zero efeitos.
- next_action: somente **Agente 1 / fencing entre gerações AAA-07**, [prompt](04_audit/evidence/AAA/AAA-07/review-coordinator/next-task-agent-1.md). AAA-09 aguarda correção revisada. Frentes 2/3 preservadas.
- evidência: [parecer](04_audit/evidence/AAA/AAA-07/review-coordinator/REVIEW.md), hashes/logs/probe no mesmo diretório. Suítes globais do executor não reexecutadas nesta revisão; coverage crítica 84,48% abaixo da barra congelada 95%, sem dispensa. Store local não prova durabilidade.
- limites: nenhum código de produto ou artefato antigo alterado pelo coordenador; sem SQL/ação real/commit/push/deploy, gate ou DONE.

# AAA-20260912 — auditoria AAA-13 rework R3 — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: três hashes conferidos, self-test 19/19 PASS, histórico 27 hashes PASS. AAA13-C3-F01 fechado no recorte de evidência ausente.
- AAA-13: **REWORK** por AAA13-C5-F01/F02 P1. CLI público aceita coverage sem pct e chaos com 14 assertions skipped; ambos exit 0 sem failures em fixtures isoladas. [Parecer](04_audit/evidence/AAA/AAA-13/review-coordinator-rework-r3/REVIEW.md).
- next_action: somente **Agente 3 / validação dos resultados brutos AAA-13**, [prompt](04_audit/evidence/AAA/AAA-13/review-coordinator-rework-r3/next-task-agent-3.md). Frentes 1/2 e locks preservados. Nova hipótese com RED executado, sem relaxar barra/limite de tentativas.
- limites: nenhum produto/certificado compartilhado alterado nesta revisão; full certify, Docker e suites globais não executados. Nenhum gate, DONE ou qualificação atual concedido.

# AAA-20260912 — auditoria AAA-12 canonicalização/versionamento — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: candidato 8d49cb2a… conferido (13 hashes/digest), regressão canal 6/51 PASS. Core canonicalização corrigido; **AAA-12 REWORK** por AAA12-C4-F01 P2: versão explícita malformada interpretada como legado permite reserva/mutação/claim na API pública do journal com caller legado.
- next_action: somente **Agente 2 / AAA12-C4-F01**, [prompt](04_audit/evidence/AAA/AAA-12/review-coordinator-hash-version/next-task-agent-2.md). Corrigir ausência vs versão inválida, preservar bytes e provar falha fechada. Frentes 1/3 não redistribuídas.
- limites: gateway shared atual rejeita esses registros, sem envio externo na prova; subset coverage FAIL preservado, global PASS não o compensa. SQL/migrations/actor/AAA-21 continuam fora do recorte. Nenhum gate ou DONE concedido.
- evidência: [parecer](04_audit/evidence/AAA/AAA-12/review-coordinator-hash-version/REVIEW.md), probe/log/checks no mesmo diretório. Suites completas/PostgreSQL não reexecutadas na revisão focada; código do produto não alterado pelo coordenador.

# AAA-20260912 — aceite do rework AAA-08 / próximo AAA-07 — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: AAA08-C1-F01 fechado; correção funcional aprovada independentemente. Cinco hashes conferidos, 6 arquivos/62 testes PASS; probe de aceite DENY/action_capability_mismatch/0 nos três casos, exit 0. AAA-08 REVIEW de qualificação integral, sem DONE.
- contrato: AAA-03 rev2 + adendo AAA03-R-ACT-v1 aprovados e congelados tecnicamente por hash; AAA-03 VERIFIED documental. Coverage/qualificação integrada e negação de adapter real (AAA-09/T-19) não foram declaradas concluídas.
- next_action: somente **Agente 1 / AAA-07 lifecycle de aprovação local**, [prompt](04_audit/evidence/AAA/AAA-08/review-coordinator-rework/next-task-agent-1.md). Insumos AAA-03/04/05 disponíveis; READY restrito a fixture sintética/correção local, sem autoridade para SQL/BUILD real/produção. Outras frentes preservadas.
- evidência: [parecer](04_audit/evidence/AAA/AAA-08/review-coordinator-rework/REVIEW.md), checks/log/probe no mesmo diretório. Suíte global do autor mantida como histórica; sem reexecução de gates globais nesta auditoria focada, nenhum código de produto alterado pelo coordenador.

# AAA-20260912 — revisão independente AAA-05 v3 — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: v3 `cebeddab…` aprovada tecnicamente, **AAA-05 VERIFIED documental**, C2-F01/F02/F03 fechados no contrato. Congelamento técnico por hash registrado; nenhuma aprovação humana, SQL, produção ou DONE concedida.
- validação: hashes de artefatos e v1/v2 conferidos, patch reproduz bytes exatos da v3 em cópia descartável, prettier do contrato PASS; 12 hashes AAA-12 intactos. Gap de canonicalização de código permanece aberto; suíte produto não reexecutada para revisão documental.
- next_action: somente **Agente 2 / AAA-12 canonicalização e versão de hash**, [prompt](04_audit/evidence/AAA/AAA-05/review-coordinator-v3/next-task-agent-2.md). Recorte de rework local e locks registrados, sem SQL/migrations/composição. Agentes 1/3 preservam suas tarefas vigentes.
- evidência: [parecer](04_audit/evidence/AAA/AAA-05/review-coordinator-v3/REVIEW.md), checks.json e log de formato no mesmo diretório. Dependências/gates completos seguem exigidos para promoção; nenhuma autorização inferida por status.

# AAA-20260912 — auditoria do handoff Agente 3 — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: auditoria direta das quatro entregas. **AAA-13 REWORK**, AAA13-C3-F01 P1: CLI público qualificou fixture sem gates executados/logs/artefatos; N1–N9 passaram apesar do contraexemplo.
- AAA-04 v2: VERIFIED documental e congelamento técnico por hash, condições F01/F02 atendidas; nenhuma aprovação humana/G_SPEC/produção concedida. AAA-14: REVIEW, licenças isoladas 372/21 internos/0 bloqueadas; imagem NOT_RUN. AAA-15: REVIEW, prettier do arquivo PASS e equivalência AST completa revalidada; gate global pendente.
- next_action: somente **Agente 3 / rework AAA-13**, [prompt](04_audit/evidence/AAA/AAA-13/review-coordinator-r3/next-task-agent-3.md). Agentes 1/2 preservam AAA-08 e AAA-05 v3 respectivamente. Não iniciar full certify antes de correção revisada e janela estável.
- evidência: [parecer](04_audit/evidence/AAA/AAA-13/review-coordinator-r3/REVIEW.md), probe CLI isolado, hashes, logs de barra/licenças/histórico/AST no mesmo diretório. Docker, full certify, audit de rede atual e suites completas não reexecutados. Nenhum arquivo de produto/certificado anterior alterado pelo coordenador.

# AAA-20260912 — auditoria do retorno Agente 1 / rodada 2 — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: hashes AAA-08 conferidos, suíte policy 3/29 PASS e reprodução F15 DENY/0 reexecutadas. Novo contraexemplo: modify + draft + action confirm/reschedule/cancel retorna ALLOW com 1 ferramenta falsa por caso. **AAA-08 REWORK**, AAA08-C1-F01 P1.
- next_action: somente **Agente 1 / rework AAA-08**, [prompt](04_audit/evidence/AAA/AAA-08/review-coordinator-r2/next-task-agent-1.md). Outras frentes preservadas; Agente 2 continua AAA-05 v3. Coordenador integra registros comuns após o retorno.
- reconciliação: AAA-03 rev2 `9df1a05f…` já tem APPROVE independente estático; AAA-04 v2 já publicada, 6 hashes conferidos, revisão específica pendente. Não transferir parecer de v1 nem inventar freeze/BUILD. AAA-05 permanece REWORK; aprovação local AAA-16 já registrada não equivale a DONE.
- evidência: [parecer](04_audit/evidence/AAA/AAA-08/review-coordinator-r2/REVIEW.md), logs/probes/checks no mesmo diretório. Suíte completa, coverage e gates globais não reexecutados nesta auditoria; números anteriores permanecem históricos. Nenhum código de produto alterado, nenhum efeito real ou gate concedido.

# AAA-20260912 — auditoria do retorno Agente 2 / v2 — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: auditoria direta de AAA-05 v2 e handoffs; **AAA-05 REWORK** por C2-F01..F03. Probe executado comprova divergência de hashes com metadata válida; release ausente na porta e plano SQL divergente das decisões existentes.
- AAA-12: REVIEW, APPROVE independente limitado ao host-local; 12 hashes intactos e errata do digest reproduzida (AAA12-R3-F01 fechado). AAA12-R3-F02 aberto, critério persistido em AAA-21; cobertura/canonicalização pendentes. AAA-16: REVIEW, APPROVE independente funcional local confirmado no log 84/84 exit 0; promoção depende dos gates/dependências existentes.
- next_action: **somente Agente 2 / AAA-05 v3 documental**, conforme [prompt](04_audit/evidence/AAA/AAA-05/review-coordinator-v2/next-task-agent-2.md). Outras frentes não redistribuídas. O coordenador integra registros; executor entrega evidência própria.
- evidência: [parecer](04_audit/evidence/AAA/AAA-05/review-coordinator-v2/REVIEW.md), probe executado e checks.json no mesmo diretório. Suítes completas não reexecutadas nesta rodada documental; logs independentes inspecionados. Nenhum código do produto alterado, nenhum gate ou DONE concedido. Fsync desligado não comprova durabilidade física; produção permanece NO-GO.

# AAA-20260912 — recebimento documentado da frente 2 — 2026-09-12

- status: `IN_PROGRESS`; last_completed_action: manifestos AAA-05/12/16 recebidos e hashes declarados conferidos; três entregas `IMPLEMENTED`, revisão independente pendente, promoção bloqueada. Não equivale a DONE ou fechamento de achados.
- next_action: Agente 3 revisa as três entregas; Agente 1 revisa AAA-04 e integra contratos/pareceres; Agente 2 prepara respostas e desenho SQL. Instruções vigentes: [adendo e prompts 0327](03_build/0327_aaa_round2_coordination.md).
- coordenação: migration 0012 reservada ao Agente 2 para planejamento; paths/task dos adapters SQL e gates ainda necessários. Integração outbox/postgres/runtime permanece com Agente 1. Registros comuns retornam ao owner Agente 1 após esta atualização solicitada pelo usuário.
- limites: journal single-host sem fsync; PG 84/84 reportado em cluster descartável com fsync desligado; cobertura crítica abaixo da barra. Testes do produto não reexecutados neste recebimento. Nenhum gate, nota AAA ou autorização de produção concedido.
- evidências: `docs/04_audit/evidence/AAA-20260912-AGENT2-RECEIPT/manifest.json`. Os registros abaixo são históricos e preservados.

# AAA-20260912 — rodada 2: estado reconciliado — 2026-09-12

- fonte canônica: [JSON](03_build/tracking/aaa_program_backlog.json); ledger: [execução](03_build/tracking/aaa_execution_ledger.json); instruções/prompts: [0327](03_build/0327_aaa_round2_coordination.md).
- AAA-01: VERIFIED para baseline histórico, sem qualificar working tree atual. AAA-03: REVIEW com APPROVE técnico condicionado; AAA-04: REVIEW com manifesto presente; AAA-05: REVIEW para reconciliação; AAA-16: REVIEW da prova 84/84; AAA-12: BLOCKED para promoção até contratos/dependências/aceite, sem descarte do código produzido.
- próximos responsáveis: Agente 1 revisa AAA-04 e coordena 03/05; Agente 2 entrega mapping e manifestos 12/16; Agente 3 revisa hashes finais e evidência, avança 14/15/13 após gates. Suas alterações exigem outro revisor.
- prontidão granular: AAA-08 exige 03/04; AAA-07 exige 03/04/05; AAA-09 exige 07/08/04; AAA-10 exige também 05/16; AAA-11 segue 10/04. Nenhum gate BUILD ou final concedido pela atualização de status.
- configuração corrente: três agentes, revisão alternada, recurso compartilhado com owner único. Planejamento original de quatro slots permanece baseline.
- achados permanecem abertos até fechamento específico. Snapshot, logs e pareceres históricos preservados.

# AAA-20260912 — rodada 2: revisão, reconciliação e AAA-08 — 2026-09-12

- `AAA-04` revisada independentemente pelo agent-1: `APPROVE_WITH_CONDITIONS` (F01 cobertura/mutação e F02 performance exigem barra v2; escopo de AAA-08 liberado). Evidência: `docs/04_audit/evidence/AAA/AAA-04/review-agent-1/`.
- `AAA-03` revisão 2 `9df1a05f…`: reconciliada com AAA-05 (identidade de operação, payload, journal, outbox, exemplos de retry/colisão) e condições do parecer fechadas; revisão final pendente.
- `AAA-08` implementada e em `REVIEW`: draft×real separados, `confirm`/`reschedule` negadas, `modify` restrito a draft; reprodução F15 `ALLOW`+1 → `DENY`+0; suíte 176 arquivos/895 testes PASS. Evidência: `docs/04_audit/evidence/AAA/AAA-08/`.
- `AAA-05`/`AAA-12`/`AAA-16` entregues pelo agent-2 (`IMPLEMENTED`, revisão pendente); decisões de migration/ownership `D05-1`/`D05-2` e composição `idempotencyKey=operationKey` no [ledger](03_build/tracking/aaa_execution_ledger.json). `AAA-07` aguarda AAA-05; `AAA-10` aguarda AAA-16 + handoff. Produção e integrações externas seguem `NO-GO`.

# AAA-20260912 — rodada 1: baseline e contratos — 2026-09-12

- status: `IN_PROGRESS`; `AAA-01` e `AAA-03` em `REVIEW`; nenhum código de produto alterado.
- `AAA-01`: candidato pinado (858 arquivos, digest `9ed0777a…`), `reproduce.mjs` idêntico à auditoria (`cdb6032a…`), typecheck/lint/`npm test` PASS, `format:check` FAIL (F13), PostgreSQL 58 PASS/26 skips (F14); 15/15 achados `OPEN`. Evidência: `docs/04_audit/evidence/AAA/AAA-01/manifest.json`.
- `AAA-03`: contrato `docs/02_spec/aaa_execution_contract.md` (sha256 `b8da48a6…`) com proposta imutável, estados de aprovação com reserva/incerteza, matriz de crash, journal de efeito, limites e separação draft×real. Evidência: `docs/04_audit/evidence/AAA/AAA-03/manifest.json`.
- coordenação e bloqueios: [aaa_execution_ledger.json](03_build/tracking/aaa_execution_ledger.json). `AAA-04`/`AAA-05`/`AAA-16` sem artefato atual; `AAA-07`–`AAA-11` bloqueadas por dependência. Produção e integrações externas seguem `NO-GO`.

### Adendo 2026-09-12T20:37Z — execução concorrente detectada

- Agent 2 iniciou AAA-05 (`docs/02_spec/aaa_data_api_contract.md` PROPOSTO), AAA-12 (journal do canal) e AAA-16 (PostgreSQL descartável em `/tmp/opencode/aaa-agent2-pg16`, porta 55432; 84/84 testes PASS exit 0). Tudo aguarda revisão independente; a integração com o `operationKey`/`EffectJournalPort` do AAA-03 precisa ser reconciliada antes de congelar.
- Agent 1 re-hasheou `runtime.ts`, `approval-engine`, `policy-engine` e `persistence/outbox-postgres` sem alteração; o `certification/license-report.json` gerado por `licenses:check` foi restaurado.

# AAA-20260912 — planejamento executivo multiagente

- entrega documental: `COMPLETED`; programa de implementação: planejado, nenhum BUILD executado nesta rodada.
- origem: pedido do usuário para plano executivo, roadmap e backlog de todos os itens da auditoria 0558, visando qualidade State of Art/Triplo AAA demonstrada.
- fonte canônica: [42 tasks e DAG](03_build/tracking/aaa_program_backlog.json); [visão detalhada 0326](03_build/0326_aaa_backlog.md), [plano 0324](03_build/0324_aaa_executive_plan.md), [roadmap 0325](03_build/0325_aaa_roadmap.md).
- cobertura: 20/20 áreas e 15/15 achados; seis fases/sprints; lead + dois builders + crítico fresco, com ownership e gates explícitos.
- próximo item: `AAA-01`, revalidação read-only; preparar AAA-02/03/04 e SPECs antes de BUILD. Todos os gates novos de implementação/externos/humanos continuam não concedidos.
- rastreabilidade: P10-B01–B10, RF-011/REM-02 e limites REM-29 mapeados; histórico preservado. Status mutável das tasks pertence somente ao JSON canônico.

# AUD-20260912-001 — auditoria de código atual

- status: `COMPLETED` para a entrega da auditoria; 15 achados abertos, sem BUILD de correções.
- autorização: pedido do usuário para auditoria completa com notas de 0–100; escopo de inspeção, verificações sintéticas, relatório e atualização operacional.
- task: auditar API/worker/web/pacotes, rastrear entrypoints e invariantes, executar gates disponíveis e registrar evidência; dependência: sistema controlado funcional; aceite: notas justificadas, reprodução dos achados e limitações explícitas.
- resultado: `60/100` consolidado (média 60,45), produção `20/100`; `NO_GO_PRODUCTION_AND_NEW_EXTERNAL_EFFECTS`.
- evidência canônica e critérios de fechamento: [relatório 0558](04_audit/0558_code_audit_2026-09-12.md), [evidência 0559](04_audit/0559_code_audit_evidence_2026-09-12.json).
- próxima lane proposta: F01/F02 binding e estado de aprovação; F03/F04 idempotência; F15 separação draft/ação real. Definir contratos e registrar tasks antes do BUILD.
- demais achados: F05 limites, F06 readiness, F07 observabilidade, F08 composição/identidade, F09 jornadas PostgreSQL, F10 worker contínuo, F11 certificado versus candidato, F12 dependências/licenças, F13 formato, F14 suficiência de testes/evals/operação.
- gates externos/humanos anteriores continuam obrigatórios; este relatório não libera dados reais, integrações reais, piloto ou produção.

# OPS-20260912-002 — Full local CVG chain

- status: `COMPLETED_CONTROLLED`; entrega: `Evolution API -> Gateway -> Connect Desk -> Agent Secretary`, sem Chatwoot.
- aceite observado: HMAC Gateway/Desk, persistência e IDs correlacionados, invocação Secretary bem-sucedida e serviços bindados somente em loopback.
- próximo gate: conexão de um número exclusivamente de teste via QR; para piloto/produção real continuam pendentes TLS/IdP, PostgreSQL RLS, backup/RPO-RTO, observabilidade central, fonte institucional, revisão LGPD/security e signoff humano.

# OPS-20260912 — Local production simulation

- id: `OPS-20260912-001_DOCKER_LOCKFILE_AND_RUNTIME`
- status: `COMPLETED_CONTROLLED`
- owner: `runtime/supply-chain`
- entrega: imagem Docker reproduzivel da Secretary e smoke integrado na suite local isolada.
- aceite: `npm ci` deterministico, build Docker PASS, `/live` e `/ready` observados no runtime; capacidades externas e sensiveis permanecem desligadas.
- evidencia: lockfile deterministico, imagem API/web construida, `/live` e `/ready` observados, suite integral 172/864 PASS e fluxo sintetico Desk -> adapter HMAC -> Secretary PASS.
- proximo gate: TLS/IdP, PostgreSQL e RPO/RTO, provider/canal/fonte institucional e signoff humano continuam obrigatorios antes de piloto ou producao real.

# PHASE 10 — backlog de produção assurance — 2026-09-11

- status: `READY_FOR_NEXT_STEP`; itens rastreáveis em `docs/10_phase10/PHASE10_BACKLOG.json`.
- bloqueadores de produção: `P10-B01` gate PostgreSQL real; `P10-B04` RPO/RTO medidos; `P10-B05` provider/canal/identidade validados; `P10-B08` signoff humano.
- itens de evolução: `P10-B02` migrar runtime legado ao kernel governado; `P10-B03` propagação OTel nativa; `P10-B06` load 100k; `P10-B07` audit ledger persistido; `P10-B09` UI de dead letters; `P10-B10` rotação de segredo.
- decisão: `CONDITIONAL_GO`/`AAA_CONTROLLED`; nenhum item deste backlog autoriza produção; P0=0 e P1=0.
- evidência: `certification/phase10-result.json` e `docs/10_phase10/PHASE10_FINAL_AUDIT.md`.

# AUD-20260911-001 — backlog derivado da auditoria atual — 2026-09-11

- status: `COMPLETED_WITH_OPEN_FINDINGS`; fase: `AUDIT`; veredicto: `CONDITIONAL_PASS_CONTROLLED_NO_GO_EXTERNAL`.
- evidência: [relatório 0556](04_audit/0556_project_audit_2026-09-11.md) e [evidência 0557](04_audit/0557_project_audit_evidence_2026-09-11.json).
- notas: consolidada `65/100`; controlado `74/100`; produto real `43/100`; prontidão para piloto/produção `20/100`.
- gates executados: unit 152/657 com 3/25 skips; coverage 85,51/81,02/91,10/86,41; build 159 módulos; E2E 6/6; PostgreSQL incompleto 8/58 com 2/24 skips; `format:check`/`verify` passaram; audit moderado falhou com 3 vulnerabilidades.
- próximos itens: `AUD-20260911-F01` caminho de produção; `F02` journeys no factory PostgreSQL; `F03` worker contínuo; `F04` RAG/integrações; `F05` evidência PostgreSQL; `F06` política de dependências; `F07` safety semântico; `F08` release/documentação; `F09` feature flags sem consumidor.
- decisão: nenhuma integração real ou BUILD de produto é liberada por esta auditoria; produção, piloto real, dados reais e automações sensíveis continuam `NO-GO`.

# AUD-20260905-001 — parecer integral atual — 2026-09-05T21:14:49-03:00

- status: `COMPLETED_WITH_OPEN_FINDINGS`; relatório: `docs/04_audit/0554_project_full_audit_2026-09-05.md`; evidência: `0555_project_full_audit_evidence_2026-09-05.json`.
- notas: consolidada `73/100`; técnico controlado `80/100`; produto real `64/100`; produção/piloto `25/100`.
- findings abertos: `AUD-20260905-F01` caminho de produção; `F02` worker contínuo; `F03` RAG/jornadas reais; `F04` operação/RPO-RTO; `F05` drift/higiene; `F06` limites de evidência; `F07` generalização semântica do safety.
- decisão: manter `REM-29` `NO_GO_CONTROLLED` e não abrir BUILD de integração sem RF-011, owners, identidade/provider/canal/fonte aprovados, signoff humano e RPO/RTO.
- próxima ação autorizada: registrar os gates externos/humanos e repetir REM-27–29 em ambiente aprovado; nenhum dado real, deploy ou efeito externo.

# REM-0539 — backlog pós-R7 — 2026-09-05T20:24:19-03:00

- R7 fechou tecnicamente os blockers de redaction/ack/migration/bridge em escopo controlado; REM-10–12 e REM-28 permanecem `COMPLETED_CONTROLLED_REVALIDATED`.
- Evidência: `docs/04_audit/0552_rem0539_r7_revalidation_evidence.json`; dossiê: `docs/04_audit/0553_rem0539_r7_final_dossier.md`; crítico fresh-context `01a073e0-1d26-7872-a196-3c22d1d39014` capturado com `PASS_CONTROLLED`.
- Gates locais passaram: suíte 152/657, PostgreSQL local 10/82, coverage acima de 80%, E2E 6/6 e gates estáticos/worker pass.
- REM-29 continua `NO_GO_CONTROLLED`: faltam RF-011, identidade/provider/canal, fonte institucional aprovada, signoff humano e RPO/RTO. Produção/piloto real e ações sensíveis continuam bloqueados.
- Próxima ação autorizada: registrar o parecer independente R7 e aguardar gates externos/humanos antes de repetir REM-27–29 em ambiente aprovado.

# REM-0539 — backlog pós-R6 — 2026-09-05T17:46:53-03:00

- Estado: REM-01/03 implementadas; REM-04–28 `COMPLETED_CONTROLLED` após revalidação aplicável; REM-29 `NO_GO_CONTROLLED`; REM-02 `PENDING_HUMAN_DECISION`; REM-30 `DEFERRED_OPTIONAL`.
- R6 revalidou consumer fechado do worker, sanitização de outbox, boundary PostgreSQL e shell web responsiva/semântica em ambiente local. Evidência: `docs/04_audit/0550_rem0539_r6_revalidation_evidence.json`; dossiê: `0551_rem0539_r6_final_dossier.md`.
- Gates automatizados: suíte 150/638 pass com 3/23 skips; E2E 6/6 pass; visual 375/768/1440 pass; PostgreSQL final 7/54 pass com 2/22 skips por ausência de `TEST_DATABASE_URL`.
- Próxima ação: capturar crítica R6, registrar RF-011 e aprovar identidade/provider/canal/fonte institucional, signoff humano e RPO/RTO; só então repetir REM-27–29. Produção, dado real e ações sensíveis continuam bloqueados.

# REM-0539 — backlog após BUILD/AUDIT controlado — 2026-09-05T11:40:00-03:00

- Estado: REM-01/03 implementadas; REM-04–28 `COMPLETED_CONTROLLED`; REM-29 `NO_GO_CONTROLLED`; REM-02 `PENDING_HUMAN_DECISION`; REM-30 `DEFERRED_OPTIONAL`.
- Qualificação: R5 local mediu 45 ms/420 ms p95, zero perda e zero duplicação, mas não concede piloto.
- Evidências: `docs/04_audit/0546_rem0539_r3_evidence.json`, `0547_rem0539_r4_evidence.json`, `0548_rem0539_r5_qualification_evidence.json`; backlog detalhado em `docs/03_build/0313_backlog_pos_auditoria.md`.
- Próxima ação: registrar RF-011 e aprovar gates externos/humanos/RPO-RTO antes de repetir REM-27–29. Produção, dado real e ações sensíveis continuam bloqueados.

# REM-0539 — estado executável R1 — 2026-09-05T08:17:03-03:00

- REM-04, REM-05 e REM-06: `COMPLETED` com evidência em `docs/04_audit/0543_rem0539_r1_evidence.json`.
- REM-07: `CONDITIONAL`; memória/API e estrutura transacional passam, mas a corrida real PostgreSQL e rollback por trigger aguardam `TEST_DATABASE_URL` isolada.
- REM-08: `BLOCKED` até REM-07 fechar; REM-09 em diante permanecem `PENDING` por regra de gate.
- A implementação usa apenas fixtures e observabilidade sintética. Nenhum dado real, canal/provider/RAG, deploy ou piloto foi executado.

# REM-0539 / R2 — preparação documental e gate controlado — 2026-09-05

- REM-09: `COMPLETED_CONTROLLED`; Discovery/PRD/SPEC aprovados para BUILD local.
- REM-10/11/12: `READY_FOR_BUILD`; execução seguirá em fixtures e PostgreSQL local, sem broker/provider/canal externo.

# REM-0539 / R1-CLOSURE — 2026-09-05

- REM-07 e REM-08: `COMPLETED_CONTROLLED`, com evidência em `docs/04_audit/0544_rem0539_r1_closure_evidence.json`.
- A corrida PostgreSQL e as suítes integral/PostgreSQL passaram; R2 tem Discovery/PRD/SPEC aprovados e BUILD controlado liberado.

# BACKLOG MASTER — CVG

## REM-0539 — execução autorizada em andamento — 2026-09-05T10:35:31.994051+00:00

- status: IN_PROGRESS; engine: BUILD; fase: R1; tasks REM-04..07.
- autorização: usuário solicitou implementar integralmente 0311/0312/0313 com Gauntlet/orchestrate. Os contratos R1 foram registrados e validados antes do BUILD; nenhum aceite de produção é inferido.
- evidência de baseline: `docs/04_audit/0542_rem0539_r0_evidence.json`; tracking: `docs/03_build/tracking/rem0539_execution.json`; SPEC: `docs/02_spec/0122_rem0539_r1_contract.md`.
- quality bar: `.gauntlet/bar.json`, 30 tasks + qualidade integrada obrigatórias. Histórico Gauntlet PLAT-S48 preservado por hash em `.gauntlet/legacy/PLAT-S48`.
- próximos passos: RED/GREEN risco, proxy e approvals; crítica independente fresca e integração. REM-02 e demais ondas continuam no escopo, não concluídas.
- limites: fixtures, sem dado real, canal/provider externo, RAG institucional, deploy ou piloto. Decisões externas/humanas permanecem requisitos pendentes, não critérios removidos.

## PLAN-0539-001 — Planejamento executivo pós-auditoria — 2026-09-05T01:07:40-03:00

- status: `COMPLETED` (entrega documental); programa REM-0539 proposto, execução não iniciada.
- autorização: usuário solicitou plano executivo, roadmap e backlog com base em 0539.
- entregas: [plano executivo](03_build/0311_plano_executivo_pos_auditoria.md), [roadmap](03_build/0312_roadmap_pos_auditoria.md), [30 tasks REM](03_build/0313_backlog_pos_auditoria.md).
- próximo passo: revalidar baseline (REM-01) e submeter contratos corretivos (REM-03); conciliar arquitetura/documentação em REM-02.
- limites: nenhum achado fechado, código/lockfile alterado ou gate de BUILD/produção concedido; F01/F05/F07 continuam abertos.

## AUD-DOC-001 — Revisão integral solicitada pelo usuário

- id: `AUD-DOC-001_FULL_DOCUMENTATION_IMPLEMENTATION_REVIEW`
- status: `COMPLETED`
- fase: `AUDIT`
- escopo: leitura dos 227 arquivos originais de docs, confronto com código/runtime e relatório com notas 0–100 por item
- gate: auditoria autorizada pelo usuário; nenhum BUILD de produto
- aceite: inventário de leitura completo, evidência atual, notas justificadas, gaps e remediação
- evidência: `docs/04_audit/0539_documentation_implementation_review.md`
- achado novo: `AUD-F01`, P1, precedência de scheduling oculta triagem high-risk em mensagem composta; reprodução controlada confirmada; correção depende de lane DISCOVERY/PRD/SPEC própria
- limite: fixtures somente, sem provider/canal real, RAG real, dados reais ou deploy

## Remediações derivadas de AUD-DOC-001 — abertas

| Item    | Prioridade                  | Estado             | Próximo gate / aceite                                                                                                   |
| ------- | --------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| AUD-F07 | P2                          | DISCOVERY_REQUIRED | Approval de atendimento: CAS pending→decisão e teste de snapshots concorrentes; não confundir com capability approval   |
| AUD-F01 | P1                          | DISCOVERY_REQUIRED | Risco independente da intenção; caso consulta+sangue deve solicitar handoff high e não executar tool; ampliar preflight |
| AUD-F05 | P2                          | DISCOVERY_REQUIRED | Atualizar Fastify e substituir proxy numérico; provar rejeição de HTTPS forjado por origem direta                       |
| AUD-F04 | P2 documental               | OPEN               | Conciliar autoridades, caminhos de código, migrations e estados históricos; índices de audit atualizados nesta rodada   |
| AUD-F02 | P2 produto                  | SPEC_REQUIRED      | Worker/outbox com claim/ack/retry/recuperação e prova de não perda em fixture                                           |
| AUD-F03 | P2 produto                  | SPEC_REQUIRED      | Cadastro/agenda duráveis e integrações por lanes próprias; gates reais continuam obrigatórios                           |
| AUD-F06 | P2 operação / P3 manutenção | SPEC_REQUIRED      | Evidenciar carga/p95, restore, observabilidade, identidade e operação antes de piloto                                   |

Detalhes, provas e owners sugeridos: `docs/04_audit/0539_documentation_implementation_review.md`.
O JSON de readiness de construção mede o baseline histórico de debug; seu 100 não é nota atual de produto ou encerramento destes achados. Nenhuma remediação de código foi iniciada ou aprovada por este registro.

## PLAT-S48 — Controlled Baseline Determinism

- id: `PLAT-S48_CONTROLLED_BASELINE_DETERMINISM`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/security/test-infrastructure`
- dependências: `PLAT-S47-001`, `PLAT-S45-001`
- tasks:
  `PLAT-S48-001_CONTROLLED_DETERMINISTIC_APPROVAL_CLOCK` e
  `PLAT-S48-002_CONTROLLED_SEMANTIC_TIMELINE_ASSERTION`
- contrato: compartilhar clock injetável entre gateway e autoridade nos
  fixtures, preservar fail-closed/consumo único e escopar a asserção da
  timeline sem mudar a UI
- aceite: os dois REDs deixam de falhar; regressão e gates controlados passam
  com coverage >= 80% em todas as métricas
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem produção real, provider/canal, RAG, rede, schema, deploy, dado
  real ou side effect
- evidência planejada:
  `docs/04_audit/0538_plat-s48_controlled_deterministic_clock_and_test_contract_evidence.md`

### Registro controlado S48 — 2026-09-02T07:03:00-03:00

Discovery encontrou divergência temporal entre gateway e autoridade de
approval e ambiguidade de query no teste web; ambos foram reproduzidos no
checkout atual. Próximo passo: RED focado.

### Fechamento controlado S48 — 2026-09-02T07:32:00-03:00

As duas tasks passaram por RED/GREEN e auditoria: o gateway usa clock
injetável compartilhável com a autoridade, mantém fail-closed e não consome
approval inválida/expirada; a asserção web usa escopo semântico da timeline.
Regressão 127/537 pass com 2/19 skipped; coverage 84.87/80.12/84.98/85.98;
PostgreSQL 8/72; E2E 4/4; readiness 4/4; worker smoke; build 158 módulos;
audit 0; typecheck/lint/format/diff PASS. Evidência:
`docs/04_audit/0538_plat-s48_controlled_deterministic_clock_and_test_contract_evidence.md`.
Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S47 — Controlled Multi-Agent Creation Mode

- id: `PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/control-center`
- dependências: `PLAT-S46-001`, `PLAT-S01-001`
- contrato: oferecer modo explícito `Novo agente`, limpar estado derivado sem
  apagar identidade e permitir Agent A/B distintos no mesmo Control Center,
  tenant e kernel
- aceite: criação A/B pela UI/API, configurações independentes, troca sem
  state bleed (inclusive respostas tardias) e clone versionado intacto para
  agentes existentes
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, RAG, rede, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0537_plat-s47_controlled_multi_agent_creation_evidence.md`

### Auditoria corretiva S47 — 2026-08-26

O ciclo corretivo fechou os achados de isolamento do Trace Viewer, leitura sem
`agentId`, reutilização de escopo após A→B→A, redaction de traces no cliente e
payload legado com `spans` não-array. Os critérios CTRL-180 a CTRL-185 estão
`PASS controlled`. A regressão passou 127 arquivos/534 testes, com 2 arquivos/
19 testes skipped; coverage 84,86/80,12/84,97/85,97; build 158 módulos; E2E
4/4; PostgreSQL 8/72; readiness 4/4; worker smoke; audit 0; typecheck, lint,
format e diff check PASS. A crítica independente compatível final retornou
`PASS_CONTROLLED`, sem P0/P1/P2/P3; nenhum arquivo foi alterado pelo revisor.
Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL` e a próxima ação segura é
nova `DISCOVERY -> PRD -> SPEC` controlada.

## PLAT-S46 — Controlled Execution Trace Correlation Boundary

- id: `PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY`
- prioridade: P1
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/agent-core`
- dependências: `PLAT-S45-001`, `PLAT-S44-001`, `PLAT-S42-001`
- contrato: criar/validar um `traceId` único no início de cada execução e
  propagá-lo para eventos, hooks, tools, auditorias e trace persistido sem
  substituir IDs locais de evento/call
- aceite: propagação única no Test Lab/runtime publicado, gateway standalone
  controlado, rejeição de ID inválido antes de efeito, sinks preservam a
  referência e nenhum payload sensível é adicionado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem tracing externo, OTel/exporter, broker, rede, provider/canal real,
  RAG, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0536_plat-s46_controlled_execution_trace_correlation_boundary_evidence.md`

### Fechamento controlado S46 — 2026-08-26T11:22:54-03:00

RED: 4 arquivos/33 testes, 8 falhas esperadas; GREEN de fechamento: 6
arquivos/25 testes pass. Regressão 126 arquivos/523 testes pass, 2 arquivos/
19 testes skipped; coverage 85,07/80,06/85,95/86,10; PostgreSQL 8/72; readiness
4/4; worker smoke; E2E 4/4; build 70 módulos; audit 0; typecheck, lint, format
e diff check PASS. Revisão independente compatível read-only: `PASS` sem
P0/P1/P2. Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S45 — Controlled Tool Invocation Boundary

- id: `PLAT-S45-001_CONTROLLED_TOOL_INVOCATION_BOUNDARY`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/security/plugin-runtime`
- dependências: `PLAT-S44-001`, `PLAT-S35-001`
- entrega: validators server-side de input/output por tool compilada,
  autorização efetiva do actor, validação bounded de actor/input e projeção
  segura de resultado de handler no Capability Gateway
- aceite: input inválido, actor malformado, validator ausente/excedente ou
  resultado inválido falham fechado antes de approval/handler; nenhum input ou
  output bruto atravessa a boundary; approval requer autoridade durável e
  single-use; falha de auditoria não repete execução; fixtures válidas mantêm
  compatibilidade
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem import dinâmico, marketplace, provider/canal real, rede, RAG,
  broker, outbox, egress, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`

### Registro controlado S45

Discovery read-only reproduziu `null` encaminhado ao handler e resultado com
`data.raw` devolvido sem projeção; actor com `permissions` ausente gerou
`TypeError`. O BUILD foi concluído e os gates controlados passaram. A revisão
independente compatível read-only retornou `PASS sem P0/P1`, e a evidência foi
fechada como `COMPLETED_CONTROLLED`.

Fechamento: focused 6/41; `npm test` 125 arquivos/512 testes pass, 2 arquivos/
19 testes skipped; coverage 85,01/80,14/85,82/86,03; PostgreSQL controlado
6/53 com 2/19 skipped; E2E 4/4; readiness 4/4; worker smoke; build 70 módulos;
typecheck, lint, format, audit 0 e diff check PASS. Produção permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S44 — Controlled Trace Stage Timing

- id: `PLAT-S44-001_CONTROLLED_TRACE_STAGE_TIMING`
- prioridade: P1
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/agent-core`
- dependências: `PLAT-S43-001`, `PLAT-S42-001`
- entrega: clock monotônico local injetável, ledger bounded e durações de
  estágios no executor/trace
- aceite: etapas executadas têm duração medida finita; skipped zero; soma
  bounded; sem payload ou integração externa
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem OTel, exporter, broker, rede, provider/canal real, RAG, deploy,
  dado real ou side effect
- evidência planejada:
  `docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`

### Registro controlado S44

Discovery confirmou zero estático em todos os spans e ausência de clock/ledger
injetável. O lane foi implementado e auditado; produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Fechamento S44

Focused 2/17, regressão 124/501 com 2/19 skipped, coverage
85,18/80,44/85,70/86,16, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70
módulos, audit 0 e checks estáticos passaram. Evidência:
`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`.

## PLAT-S43 — Controlled Trace Temporal Integrity

- id: `PLAT-S43-001_CONTROLLED_TRACE_TEMPORAL_INTEGRITY`
- prioridade: P1
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/security`
- dependências: `PLAT-S42-001`, `PLAT-S41-001`
- entrega: invariantes de timestamps/latência e ordem/status de spans no
  parser compartilhado, sem telemetria externa
- aceite: incoerências temporais/ordinais falham fechado; traces sem campos
  opcionais continuam compatíveis
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem OTel, exporter, broker, rede, provider/canal real, RAG, deploy,
  dado real ou side effect
- evidência planejada:
  `docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`

### Registro controlado S43

Discovery encontrou `durationMs: 0` estático nos spans e ausência de invariantes
temporais/ordinais. O lane foi construído e auditado; a instrumentação medida
fica para uma próxima lane controlada.

### Fechamento S43

Focused 1/14, regressão 124/499 com 2/19 skipped, coverage
85,08/80,41/85,45/86,08, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70
módulos, audit 0 e checks estáticos passaram. Evidência:
`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`.

## PLAT-S42 — Controlled Trace Provenance Boundary

- id: `PLAT-S42-001_CONTROLLED_TRACE_PROVENANCE_BOUNDARY`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/persistence/security`
- dependências: `PLAT-S41-001`, `PLAT-S40-001`, `PLAT-FOUNDATION-009`
- entrega: parser/projeção runtime allowlist do `TestRunTrace`, validação
  bounded de IDs/estruturas/datas/spans, provider controlado e
  `externalCall: false`, redaction/output policy e aplicação uniforme em
  sinks diretos, suites aninhadas e leituras PostgreSQL
- aceite: campos extras não sobrevivem; trace malformado, provider externo,
  `externalCall: true`, IDs inválidos ou output inconsistente falham fechado
  antes de INSERT/retorno; nenhum dado bruto inseguro é devolvido
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, RAG, broker, outbox, egress, secret manager,
  deploy, migração estrutural, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`

### Registro controlado S42

Discovery confirmou que o contrato de trace era apenas TypeScript, que a suite
clonava traces aninhados sem chamar `sanitizeTraceForPersistence` e que
listagens PostgreSQL devolviam JSON sem revalidação. O lane foi construído,
testado e auditado; produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Fechamento S42

Focused 6/76, regressão 124/492 com 2/19 skipped, coverage
84,99/80,24/85,41/86,00, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70
módulos, audit 0 e checks estáticos passaram. Evidência:
`docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`.

## PLAT-S41 — Controlled Output Safety Boundary

- id: `PLAT-S41-001_CONTROLLED_OUTPUT_SAFETY_BOUNDARY`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/agent-core/security`
- dependências: `PLAT-S40-001`, `PLAT-S36-001`, `PLAT-FOUNDATION-009`
- entrega: output policy server-side para validar tipo, limite, redaction e
  conteúdo da completion antes de `response.after`/trace; fallback seguro e
  eventos bounded de decisão
- aceite: saída segura segue; output não textual, vazio, excessivo ou com
  diagnóstico, prescrição, medicação/dose, tratamento, prontuário, pagamento
  ou mutação de agenda é reescrito para fallback seguro; mode/handoff/evento
  permanecem consistentes e nenhum texto rejeitado é refletido
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, RAG, broker, outbox, egress, secret manager,
  deploy, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`

### Registro controlado S41

Discovery read-only confirmou que `approvedKnowledge.answer` e
`responseTemplates` chegam ao provider determinístico como `fallbackText`, mas
não existe uma validação pós-modelo. O próximo passo obrigatório é RED focado;
nenhuma integração externa ou conteúdo real será usado.

### Correção após revisão independente

A revisão encontrou bypasses de variantes no detector e execução de
tools/approval depois de output rejeitado, além de lacunas de motivo/eventos,
trace e redaction. O focused corretivo reproduziu 11 falhas em 1 arquivo/21
testes antes do GREEN; a correção agora normaliza Unicode/confusáveis, bloqueia
capabilities após qualquer rewrite, emite handoff coerente e persiste decisão
bounded. A validação também foi aplicada antes de outbound/handoff/auditoria
na conclusão transacional PostgreSQL.

### Auditoria final S41

`PLAT-S41-001 = COMPLETED_CONTROLLED`. Focused de fechamento: 7 arquivos/76
testes PASS. Regressão: 123 arquivos PASS, 2 skipped; 483 testes PASS, 19
skipped. Coverage: 85,08% statements, 80,29% branches, 85,39% functions e
86,12% lines. Readiness 4/4, worker smoke, PostgreSQL 8/72, E2E 4/4, build
70 módulos, typecheck, lint, format, audit 0 e diff check PASS. Evidência:
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.

A revisão independente encontrou P0/P1 e os achados foram fechados por
regressões e correções locais. A tentativa final assíncrona não retornou no
limite e não foi tratada como aprovação. Não há achado aberto conhecido no
escopo controlado; produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S40 — Controlled Model Provider Identity Boundary

- id: `PLAT-S40-001_CONTROLLED_MODEL_PROVIDER_IDENTITY_BOUNDARY`
- prioridade: P0
- status: COMPLETED_CONTROLLED
- fase: AUDIT
- owner: platform/agent-core/security
- dependências: `PLAT-S39-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-009`
- entrega: registry server-side compilado para `fake/deterministic-v1`,
  resolução exata no executor controlado e rejeição fail-closed de provider,
  modelo ou fallback não suportado
- aceite: identidade válida mantém resposta determinística e
  `externalCall: false`; identidade desconhecida ou `fallbackProvider` presente
  falha antes da pipeline de eventos/modelo; Test Lab, API, runtime publicado e
  worker reutilizam a mesma regra; registry/listas permanecem imutáveis
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, chamada de rede, fallback/retry operacional,
  secret manager, RAG, broker, egress, deploy, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`

### Registro controlado S40

Discovery read-only confirmou que `ModelProviderRegistry` existe, mas não é
consultado pelo executor; `createDryRunModelProvider` instancia diretamente o
provider determinístico e `fallbackProvider` é aceito pelo schema sem ser
executado. O próximo passo obrigatório é RED antes de qualquer BUILD.

### RED observado S40

O focused executou 1 arquivo/4 testes e falhou como esperado: provider/model
desconhecido foi aceito, `fallbackProvider` foi ignorado e o runtime completou
com uma identidade externa fictícia depois de emitir eventos. Nenhuma chamada
externa ou side effect ocorreu; o próximo passo é GREEN compartilhado.

### GREEN focado S40

O registry compilado e a resolução pré-pipeline foram implementados. O focused
inicial passou 2 arquivos/6 testes e a regressão publicada/worker ampliada
passou 4 arquivos/19 testes; `fake/deterministic-v1` é o único binding
executável, e provider/model não suportado ou fallback configurado falha com
`invalid_action`. Gates completos e revisão independente foram concluídos.

### Auditoria final S40

`PLAT-S40-001 = COMPLETED_CONTROLLED`. Focused 4/19; `npm test` 121/446 com
19 skips; coverage 85,08/80,11/85,17/86,07; readiness 4/4; worker smoke;
PostgreSQL 8/72; E2E 4/4; build 70 módulos; typecheck, lint, format, audit 0
e diff check PASS. Revisão independente follow-up: `PASS sem achados
estáticos`. Evidência em
`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S39 — Controlled Release Candidate Lifecycle Integrity

- id: `PLAT-S39-001_CONTROLLED_RELEASE_CANDIDATE_LIFECYCLE_INTEGRITY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/persistence/security`
- dependências: `PLAT-S37-001`
- contrato: transição para `VALIDATED` exige schema estrito dos quatro gates,
  todos `PASS`, digest recomputado, validador diferente do criador e binding do
  próprio candidate; mapper PostgreSQL rejeita gates corrompidos
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente ledger/lifecycle controlado; sem deploy, provider/canal, RAG,
  egress, broker, outbox, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`
- próximo passo: nova discovery/SPEC controlada

### GREEN focado S39

`assertReleaseCandidateEvidenceIntegrity` shared foi implementada e aplicada
antes da mutação em InMemory/PostgreSQL; publish reutiliza a mesma regra. O
focused 2/6 passou, com typecheck/lint PASS. Gates integrados ainda pendentes.

### Correção após crítica independente S39

Autoatestação pelo criador foi bloqueada e o mapper PostgreSQL passou a rejeitar
`gate_results` inválido com erro controlado. A autoridade de publish/rollback
revalida a mesma independência, e a migration `0009` protege o banco contra
autoatestação persistida.

### Auditoria final S39

`PLAT-S39-001 = COMPLETED_CONTROLLED`. Focused final: 7 arquivos/23 testes/1
skip. Gates: npm test 120/438/19 skips; coverage 85,08/80,16/85,18/86,08;
readiness 4/4; worker smoke; PostgreSQL 8/72; E2E 4/4; build, typecheck, lint,
format, audit 0 e diff check PASS. A revisão independente final foi
`PASS sem achados`. Evidência em
`docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S38 — Controlled Worker Knowledge Input Parity

- id: `PLAT-S38-001_CONTROLLED_WORKER_KNOWLEDGE_INPUT_PARITY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `worker/agent-core/platform/security`
- dependências: `PLAT-S37-001`, `PLAT-S36-001`, `PLAT-S33-001`
- contrato: `PublishedAgentJobSchema` reutiliza
  `ApprovedKnowledgeForTestSchema` e o worker encaminha apenas o payload
  parseado para o executor publicado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem broker, provider/canal, RAG, egress, outbox, dados reais, deploy
  ou side effect
- evidência:
  `docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`
- resultado: schema shared strict/bounded, forwarding ao runtime pinned e
  history aligned em 50; crítica independente sem CRITICAL/HIGH, drift médio
  corrigido e cobertura baixa ampliada; gates 120/432/19 skips, coverage
  84,92/80,09/85,08/85,92, readiness 4/4, E2E 4/4, PostgreSQL 8/71,
  worker smoke, build, format, lint, audit 0 e diff check PASS
- próximo passo: nova discovery/SPEC controlada

## PLAT-S37 — Controlled Publish Evidence Authority Boundary

- id: `PLAT-S37-001_CONTROLLED_PUBLISH_EVIDENCE_AUTHORITY_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/api/persistence/security`
- dependências: `PLAT-S36-001`, `PLAT-FOUNDATION-009`
- contrato: publish/rollback exigem `releaseCandidateId` validado, digest
  íntegro, quatro gates PASS e vínculo tenant/agente/versão; preflight
  server-side continua obrigatório
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem dados reais, deploy, provider/canal, RAG, egress, broker,
  outbox, rollout gradual ou side effect
- evidência:
  `docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`
- resultado: candidato `VALIDATED` com digest/gates/binding revalidados no
  servidor; API, InMemory, PostgreSQL e UI alinhados; gates finais 119/427/19
  skips, coverage 84,92/80,08/85,08/85,92, readiness 4/4, E2E 4/4,
  PostgreSQL 8/71, worker smoke, build, format, lint, audit 0 e diff check PASS
- próximo passo: nova discovery/SPEC controlada

## PLAT-S36 — Controlled Knowledge Input Provenance Boundary

- id: `PLAT-S36-001_CONTROLLED_KNOWLEDGE_INPUT_PROVENANCE_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/agent-core/api/security`
- dependências: `PLAT-S35-001`, `PLAT-FOUNDATION-009`
- contrato: `approvedKnowledge` strict e bounded, source somente
  `controlled://`, validação no runtime e schema compartilhado na API
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem RAG/ingestão/conteúdo real, provider/canal, URL externa, egress,
  broker, outbox, deploy ou side effect
- evidência:
  `docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`
- resultado: verify 117/422/19 skips, coverage 85,05/80,31/85,11/86,07,
  readiness 4/4, worker smoke, E2E 4/4, PostgreSQL 8/71, audit 0 e revisão
  independente sem CRITICAL/HIGH; produção real `NO-GO` /
  `WAITING_HUMAN_APPROVAL`

## PLAT-S35 — Controlled Tool Registry Identity Boundary

- id: `PLAT-S35-001_CONTROLLED_TOOL_REGISTRY_IDENTITY_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/api/agent-core/security`
- dependências: `PLAT-S34-001`, `PLAT-FOUNDATION-009`
- contrato: planner e API resolvem somente handlers compilados por binding
  habilitado com versão exata; colisão, ausência e catálogo metadata-only falham
  fechado; permissão é server-owned
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem import dinâmico, marketplace, provider/canal, egress, broker,
  outbox, deploy, dados reais ou side effect
- evidência:
  `docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`
- resultado: registry compilado, versão exata, planner por intent,
  deduplicação/colisão fail-closed e approval/API server-owned auditados; gates
  integrados concluídos em ambiente controlado

## PLAT-S34 — Controlled CI Gate Parity and Worker Startup Smoke

- id: `PLAT-S34-001_CONTROLLED_CI_GATE_PARITY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `CI/worker/security`
- dependências: `PLAT-S33-001`, `PLAT-FOUNDATION-009`
- contrato: workflow reproduz gates disponíveis, instalação sem lifecycle
  scripts, permissões/concurrency mínimos e smoke bounded do worker
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- evidência:
  `docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`
- limite: sem imagem/container scan executável até existir artefato, sem deploy,
  broker, provider/canal, dados reais ou side effect
- resultado: workflow com gates explícitos, instalação sem lifecycle scripts,
  permissões/concurrency mínimos, smoke fail-closed do worker e diff check;
  gates integrados concluídos em ambiente controlado

## PLAT-S33 — Controlled Worker Published-Runtime Boundary

- id: `PLAT-S33-001_CONTROLLED_WORKER_RUNTIME_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `worker/agent-core/security`
- dependências: `PLAT-S32-001`, `PLAT-S03-001`, `PLAT-FOUNDATION-009`
- contrato: worker aceita somente job bounded com tenant/agent/version pinned,
  delega ao executor publicado e não inicia com bootstrap fictício
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- evidência:
  `docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`
- resultado: schema strict/bounded, executor pinned, negativos de legacy/limite/
  mismatch, entrypoint sem bootstrap e gates integrados concluídos sem side
  effect externo
- limite: sem broker/retry distribuído, outbox, provider/canal real, deploy,
  dados reais ou side effect

## PLAT-S32 — Controlled Session Agent-Version Pinning

- id: `PLAT-S32-001_CONTROLLED_SESSION_AGENT_VERSION_PINNING`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `agent-core/persistence/api/security`
- dependências: `PLAT-S31-001`, `PLAT-S08-001`, `PLAT-FOUNDATION-009`
- contrato: sessão runtime deve fixar o par tenant/agent/version uma única vez;
  continuations usam `PUBLISHED` ou `ARCHIVED` do mesmo agent e nenhum publish
  posterior troca o trace/version da conversa
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- evidência:
  `docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`
- limite: migration aditiva e fixtures controladas; sem dados reais,
  provider/canal/RAG, IdP/RBAC real, worker distribuído, deploy ou side effect

## P0 — Critico

### Item 1 — Aprovar gates documentais

- titulo: aprovar gates de Discovery, PRD e SPEC
- descricao: revisar documentacao e confirmar que ela pode orientar Build Phase 0
- modulo: governanca
- dependencia: revisao humana
- fase: pre-build
- risco: alto
- impacto: alto

### Item 2 — Definir regras finais de agenda

- titulo: formalizar confirmacao de consulta
- descricao: definir quando a Esmeralda V2 pode sugerir, criar draft ou confirmar consulta
- modulo: policy
- dependencia: decisao operacional
- fase: pre-workflow-agendamento
- risco: alto
- impacto: alto

### Item 3 — Iniciar Build Phase 0

- titulo: criar fundacao do monorepo
- descricao: implementar estrutura `apps` e `packages`, shared contracts e teste base
- modulo: repository
- dependencia: aprovacao humana explicita da Phase 0
- fase: build_phase_0
- risco: alto
- impacto: alto

### Item 4 — Mapear cargos reais para RBAC

- titulo: validar matriz de permissoes operacional
- descricao: mapear cargos reais do hospital para Operator, Approver, Supervisor e Admin
- modulo: security
- dependencia: decisao operacional
- fase: pre-panel-approvals
- risco: alto
- impacto: alto

### Item 5 — Implantar gates automatizaveis

- titulo: criar test, typecheck, lint, coverage e CI local
- descricao: garantir que toda sprint de codigo tenha verificacao executavel e repetivel
- modulo: repository
- dependencia: Build Phase 0
- fase: build_phase_0
- risco: alto
- impacto: alto

### Item 6 — Resolver vulnerabilidade transitiva moderada

- titulo: atualizar ou mitigar `uuid` transitivo em LangGraph/LangChain
- descricao: avaliar versoes compatíveis e evitar `npm audit fix --force` sem teste de regressao
- modulo: dependencies
- dependencia: Build Phase 0
- fase: build_phase_0
- risco: medio
- impacto: medio

## P1 — Alta prioridade

### Item 1 — Definir fonte RAG institucional

- titulo: selecionar base autorizada para duvidas institucionais
- descricao: definir documentos, responsavel, versao e politica de atualizacao
- modulo: rag
- dependencia: decisao de conteudo
- fase: build_phase_4
- risco: medio
- impacto: alto

### Item 2 — Definir politica de retencao

- titulo: governanca de retencao de dados
- descricao: definir retencao para mensagens, audit events, memory facts e tool calls
- modulo: dados
- dependencia: decisao de governanca
- fase: build_phase_6
- risco: medio
- impacto: alto
- status: parcialmente atendido por CC-S9 e auditado em `docs/09_debug_corrections/0909_cc_s9_audit_governance_review.md`; CC-S12 registra `docs/08_runtime/data_governance_signoff.md` com `APPROVED_FOR_REAL_DATA: false`; audit evidence em construcao controlada tem politica, minimizacao e redacao de PII comum, mas dados reais/piloto real ainda exigem decisao humana de retencao

## P2 — Medio

### Item 1 — Preparar audit runtime

- titulo: definir queries e dashboards de auditoria
- descricao: transformar criterios de audit em consultas e metricas operacionais
- modulo: audit
- dependencia: runtime funcional
- fase: hardening
- risco: medio
- impacto: medio
- status: atendido para construcao controlada por CC-S12; queries, resumo, export metadata, UI interna de revisao, governanca de retencao controlada, redacao de payload/PII, indices, paginacao de evidencia, pedido de export via aprovacao humana interna, idempotencia PostgreSQL, evidencia final reproduzivel, runbooks e boundary de release candidate existem; exporter externo real segue bloqueado

## PLAT-S03 — fronteira tenant/RLS pré-produção

- id: PLAT-S03-001
- status: COMPLETED_CONTROLLED
- entrega: migration PostgreSQL versionada com checksum, baseline legado explícito e aprovado, quarentena persistente de linhas nulas/incompatíveis, `FORCE ROW LEVEL SECURITY`, preflight de marker/policy, pool tenant-scoped com reset e role runtime DML-only
- evidência: `docs/04_audit/0494_plat_s03_tenant_isolation_evidence.md`
- limite: fixture fictícia; nenhum backfill, dado real, ativação irrestrita ou decisão humana foi executado

## PLAT-S04 — approval capability durável e gateway legado

- id: PLAT-S04-001
- status: COMPLETED_CONTROLLED
- entrega: issuer/verifier durável com hash de input, nonce, expiry, revocation e single-consume; adapter allowlist-only do `ToolRegistry` para `find_available_slots` em dry-run; conexão tenant-scoped e transação checked-out
- dependências: PLAT-S03 controlado; infraestrutura/IdP/provider real permanecem fora do escopo
- evidência: `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`

- id: PLAT-S04-002
- status: COMPLETED_CONTROLLED
- entrega: verifier HMAC-SHA256 sobre raw body com janela temporal, rotação controlada de segredo, replay lease/purge e store abstrata; fixtures em memória e PostgreSQL controlado
- dependências: HA/observabilidade operacional, provider/canal real e rollout de replay distribuído permanecem fora do escopo
- evidência: `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`

- id: PLAT-S04-003
- status: COMPLETED_CONTROLLED
- entrega: retry idempotente de inbound com `messages.runtime_status`, finalização PostgreSQL atômica de outbound/tool audit/trace/integration audit e lease HMAC liberado ou recuperável após falha/crash
- dependências: rollout RLS/backfill, fila distribuída, provider/canal real e compensação de side effects permanecem fora do escopo
- evidência: `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`

## P3 — Baixo

### Item 1 — Planejar agentes futuros

- titulo: Billing, Medical Context e Quality Supervisor
- descricao: planejar agentes pos-MVP sem contaminar o escopo inicial
- modulo: future
- dependencia: MVP validado
- fase: pos-MVP
- risco: baixo
- impacto: medio

## PLAT-S05 — fechamento do Test Lab controlado

- id: `PLAT-S05-001`
- status: COMPLETED_CONTROLLED
- entrega: trace seguro com risco/prompt/timestamps/latência/tokens/spans, caso de medicamento veterinário explicitamente seguro, validação de IDs no gateway e correções de binding/renderização no Control Center
- evidência: `docs/platform/final-technical-audit.md`; testes unitários platform/policy, API/UI, `npm run verify`, readiness, E2E e smoke PostgreSQL
- limite: nenhum provider/canal/RAG/agenda real, dado real, side effect ou release de produção

- id: `PLAT-S05-002`
- status: COMPLETED_CONTROLLED
- entrega: preset idempotente `CVG Secretary` publicado somente no bootstrap de desenvolvimento e coberto por teste de lifecycle
- evidência: `packages/platform/src/secretary-preset.ts`, testes de preset/bootstrap, `npm run verify`, readiness e E2E; sem bootstrap automático em `NODE_ENV=test`
- limite: nenhum bootstrap automático em produção ou em tenant real

- id: `PLAT-S06-001`
- status: COMPLETED_CONTROLLED
- entrega: catálogo tenant-aware persistente de `TestCase`/`TestSuite`, clone versionado imutável, histórico redigido de avaliações e comparação A/B exclusivamente no Test Lab
- evidência: `docs/04_audit/0496_plat_s06_suite_catalog_evidence.md`; migration `0003_test_suite_catalog.sql`; API/UI, verify, readiness, E2E e smoke PostgreSQL controlado
- dependência: próximo lane exige novo SPEC; nenhum rollout, provider/canal ou tráfego real

## PLAT-S07 — conflito otimista do Control Center

- id: `PLAT-S07-001`
- status: COMPLETED_CONTROLLED
- entrega: precondition `expectedStatus` no lifecycle de AgentVersion, erro de conflito HTTP 409 sem mutação parcial, ausência de audit de sucesso no conflito e integração do status observado na UI
- evidência: `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: não representa HA, lock distribuído, ETag de proxy, IdP, coordenação multi-região ou autorização de produção

## PLAT-S08 — integridade de manifests e version pinning controlado

- id: `PLAT-S08-001`
- status: COMPLETED_CONTROLLED
- entrega: validação semântica de `PluginManifest`, versões imutáveis por nome, `version` opcional no `PluginBinding` e resolução determinística no gateway
- evidência: `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: handlers permanecem fake/local; marketplace, rede, código de terceiros e integração externa continuam bloqueados

## PLAT-S09 — catálogo declarativo tenant-aware de plugins

- id: `PLAT-S09-001`
- status: COMPLETED_CONTROLLED
- entrega: persistência de manifests validados sem handlers, lifecycle DRAFT/APPROVED/ARCHIVED com precondition, isolamento tenant/RLS e API admin controlada
- evidência: `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`; migration `0004_plugin_manifest_catalog.sql`; verify, readiness, E2E, smoke PostgreSQL, format, diff check e audit
- dependência: novo SPEC controlado; aprovação de metadata não concede execução, instalação, permission ou provider/canal

## Regras de uso

- Atualizar continuamente.
- Adicionar novos itens imediatamente.
- Priorizar por risco e impacto.
- Nao esconder debitos tecnicos.

## PLAT-S10 — Control Center do catálogo declarativo de plugins

- id: `PLAT-S10-001`
- status: COMPLETED_CONTROLLED
- entrega: client/API e seção do Control Center para listar, criar e transicionar
  metadata de plugins com tenant/identidade e precondition stale
- dependência: `PLAT-S09-001` e novo SPEC `docs/platform/06-platform-spec.md`
- evidência: `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`
- limite: `APPROVED` continua metadata-only; sem instalação, handlers, rede,
  provider/canal, dados reais ou produção irrestrita

## PLAT-S11 — event bus e hooks de plugins controlados

- id: `PLAT-S11-001`
- status: COMPLETED_CONTROLLED
- entrega: event bus allowlisted, tenant-scoped e process-local; hooks de
  plugins locais exigem declaração no manifest, recebem payload redigido e
  imutável e não interrompem o pipeline em caso de erro
- dependência: `PLAT-S10-001`, `PLAT-S08-001` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- evidência: `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`,
  testes RED/GREEN do bus/registry e integração Test Lab, verify, readiness,
  E2E, audit e inspeção de que nenhum efeito externo foi adicionado
- limite: catálogo S09 continua metadata-only; sem broker, retry durável,
  webhook, marketplace, código de terceiros, provider/canal, dado real ou
  produção irrestrita

## PLAT-S12 — prompt profile e templates no Control Center

- id: `PLAT-S12-001`
- status: COMPLETED_CONTROLLED
- entrega: editor controlado de `promptBlocks`/`responseTemplates` com
  validação de formato, limites, duplicidade e segredo; nova AgentVersion para
  cada alteração; checksum/status do perfil no trace do Test Lab
- dependência: `PLAT-S11-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-006`
- aceite: blocos `system`/`safety` e respostas kernel não podem ser removidos
  ou alterados pelo editor; templates de baixa confiança, ausência de
  knowledge, handoff e scheduling sem evidência têm caminho controlado; edição
  preserva snapshots; checksum é determinístico; nenhum provider/canal ou
  efeito externo é adicionado
- evidência: `docs/04_audit/0502_plat_s12_prompt_profile_template_control_center_evidence.md`; suíte, coverage, readiness, build, E2E, PostgreSQL controlado, audit e diff check PASS
- limite: sem catálogo mutável separado, migration, RAG institucional, dados
  reais, ações clínicas/financeiras/prontuário, side effect ou produção
  irrestrita

## Agent Platform — sprint controlado `PLAT-S01`

O prompt de plataforma foi registrado como uma nova linha de produto compatível com o data plane da Secretary. O inventário, gaps, PRD, SPEC, ExecPlan e ADRs estão em `docs/platform/`.

### Tasks registradas

- `PLAT-FOUNDATION-001` — corrigir harness Vitest para aliases locais; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-002` — contratos/store tenant-aware de Agent e AgentVersion; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-003` — prompts, model refs, policies, feature flags e response templates; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-004` — manifest/registry/capability gateway; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-005` — Test Lab dry-run, trace, eval e regression; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-006` — API/UI Control Center, version list e rollback; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-007` — migração/repositório PostgreSQL tenant-aware; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-008` — state machine de takeover e silêncio do bot; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-009` — hardening, auditoria, headers, rate limit e CI/E2E; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-010` — integrar IdP confiável, tenant binding operacional e replay store distribuída; **WAITING_HUMAN_INFRA_DECISION**
- `PLAT-FOUNDATION-011` — tenant/RLS do data plane legado e adapter único para capability gateway; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-012` — rate limiter distribuído e política de retenção/PII para produção; **WAITING_HUMAN_INFRA_DECISION**
- `PLAT-FOUNDATION-013` — runtime publicado, histórico de traces redigidos, Trace Viewer e scheduling controlado via CapabilityGateway; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-014` — continuidade por sessão, takeover humano explícito, silêncio/retomada e escopo tenant-aware de tarefas/aprovações/auditoria; **COMPLETED_CONTROLLED**

O gate `IMPLEMENTATION_READY` foi satisfeito somente para construção controlada de `PLAT-FOUNDATION-001..014` e PLAT-S03/S04. Provider/canal/RAG/dados reais, produção irrestrita e ações sensíveis permanecem bloqueados; `PLAT-FOUNDATION-010` e `PLAT-FOUNDATION-012` ainda exigem decisão humana/infraestrutura.

### Fechamento da rodada de auditoria

`docs/04_audit/0493_platform_controlled_mvp_evidence.md` registra os gates finais: `npm run verify` com 166 testes aprovados e 5 skips, coverage acima de 80%, readiness, Playwright E2E, smoke PostgreSQL real com 11 testes e audit de dependências sem vulnerabilidades. PLAT-S02 fecha clone/edit versionado, approval/provenance fail-closed, ownership de trace, locks/rollback PostgreSQL e Trace Viewer com identidade do snapshot. O backlog controlado está pronto para o próximo passo; IdP/infraestrutura real, RLS/auditoria tenant-aware, approval durável, conflitos multioperador e qualquer provider/canal/RAG/ação sensível permanecem bloqueados.

## Agent Platform — sprint controlado `PLAT-S02`

Hardening derivado da auditoria do `PLAT-S01`, ainda restrito a fixtures controladas e sem autorização de produção real:

- `PLAT-HARDENING-001` — edição versionada pelo Control Center sem mutar snapshots; **COMPLETED_CONTROLLED**
- `PLAT-HARDENING-002` — approval e trace fail-closed; **COMPLETED_CONTROLLED**
- `PLAT-HARDENING-003` — publish PostgreSQL serializado; **COMPLETED_CONTROLLED**
- `PLAT-HARDENING-004` — Trace Viewer operacional completo e redigido; **COMPLETED_CONTROLLED**

O gate autoriza somente a construção controlada dos quatro itens acima, agora concluídos nesse limite. IdP tenant-bound, RLS/backfill do data plane legado, limiter/replay store distribuídos, retenção/PII, expansão do ToolRegistry, providers/canais/RAG reais e ações sensíveis continuam bloqueados.

## Agent Platform — sprint de fronteira pré-produção `PLAT-S03`

Task registrada antes do BUILD para fechar o maior risco técnico observável sem ampliar a autorização operacional:

- `PLAT-S03-001` — migration versionada, contexto tenant por conexão, `FORCE ROW LEVEL SECURITY` no data plane legado e auditoria/outbox tenant-aware; **COMPLETED_CONTROLLED**

O aceite desta sprint é exclusivamente controlado: schema fictício de fixture, pool/conexão dedicada por escopo, reset/verificação de contexto, roles migration/runtime separadas, quarentena fail-closed de auditoria/outbox e bloqueio cross-tenant comprovados. Backfill, IdP confiável, role mapping operacional, retenção, secrets manager e ativação em banco real continuam dependentes de decisão humana/infraestrutura.

## PLAT-S13 — Handoff Policy Studio controlado

- id: `PLAT-S13-001_HANDOFF_POLICY_STUDIO`
- status: `COMPLETED_CONTROLLED`
- entrega: thresholds configuráveis com limites, clarificações,
  destinos múltiplos, prioridade e trace redigido no Test Lab
- dependências: `PLAT-S12-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-008`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- gates: 79 arquivos/284 testes pass/16 skips, coverage 84,98%/80,44%/86,00%/85,92%, readiness 4/4, E2E 1/1, PostgreSQL 49 pass/16 skips, audit sem vulnerabilidades, format e diff check PASS
- evidência: `docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`
- limite: sem canal/provider/RAG/dado real/migration/side effect/produção

## PLAT-S14 — Controlled Safety Publish Preflight

- id: `PLAT-S14-001_CONTROLLED_SAFETY_PUBLISH_PREFLIGHT`
- status: COMPLETED_CONTROLLED
- entrega: suíte crítica fixa e redigida executada no candidato antes de
  publish/rollback, endpoint de preflight, bloqueio fail-closed sem mutação e
  audit seguro
- dependências: `PLAT-S06-001`, `PLAT-S07-001`, `PLAT-S13-001`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente Test Lab fake/fixtures; sem cases arbitrários, provider,
  canal, RAG, migration, dado real, side effect ou produção irrestrita
- evidência: `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`
- gates: 80 arquivos/289 testes pass/16 skips, coverage 85,06%/80,38%/85,97%/85,98%, readiness, E2E, PostgreSQL controlado, audit e diff check PASS

## PLAT-S15 — Controlled Knowledge Source Catalog

- id: `PLAT-S15-001_CONTROLLED_KNOWLEDGE_SOURCE_CATALOG`
- status: COMPLETED_CONTROLLED
- entrega: catálogo tenant-aware metadata-only de source/version/label/
  description, lifecycle, unique/RLS, API/UI e audit redigido
- dependências: `PLAT-S05-001`, `PLAT-S06-001`, `PLAT-S14-001`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem conteúdo, ingestão, embeddings, vector store, RAG, crawler,
  upload, URL externa, provider, canal, dado real ou side effect
- evidência: `docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`
- gates finais: 83 arquivos/294 testes pass/17 skips, coverage 85,03%/80,26%/
  85,41%/85,88%, readiness, E2E, PostgreSQL controlado, audit e diff check PASS

## PLAT-S16 — Controlled Release Candidate Evidence Ledger

- id: `PLAT-S16-001_CONTROLLED_RELEASE_CANDIDATE_EVIDENCE_LEDGER`
- status: COMPLETED_CONTROLLED
- entrega: ledger tenant-aware imutável de quatro gates controlados,
  evidence refs bounded, digest determinístico, lifecycle/CAS, migration/RLS,
  API/UI e audit metadata-only
- dependências: `PLAT-S14-001`, `PLAT-S15-001`, `PLAT-FOUNDATION-006`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: `VALIDATED` não publica, não faz deploy, não altera AgentVersion ou
  activeVersionId e não habilita provider/canal/RAG/dado real/side effect
- evidência: `docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`
- gates finais: 88 arquivos/303 testes pass/18 skips, coverage 84,81%/80,03%/
  84,87%/85,65%, readiness, E2E, PostgreSQL controlado, audit, format e diff
  check PASS

## PLAT-S17 — Controlled Audit Evidence Checkpoint

- id: `PLAT-S17-001_CONTROLLED_AUDIT_EVIDENCE_CHECKPOINT`
- status: COMPLETED_CONTROLLED
- entrega planejada: checkpoint tenant-aware imutável de até 200 IDs de
  auditoria, filtros bounded, digest canônico, lifecycle SEALED/ARCHIVED,
  migration/RLS, API/client/UI e audit metadata-only
- dependências: `PLAT-S16-001`, `PLAT-FOUNDATION-006`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem payload bruto, export externo, retenção real, alteração de
  eventos, provider/canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`
- gates finais: `npm run verify` PASS; 95 arquivos/317 testes pass/18 skips;
  coverage 84,95%/80,00%/84,52%/85,82%; readiness 4/4; E2E 2/2;
  PostgreSQL controlado 51 pass/18 skips; audit e diff check PASS
- resultado: `CONTROLLED_MVP_READY`; produção `NO-GO`/
  `WAITING_HUMAN_APPROVAL`

## PLAT-S18 — Controlled HTTP Security Boundary

- id: `PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY`
- status: COMPLETED_CONTROLLED
- entrega planejada: boundary Fastify de origin/CORS/preflight (`GET/POST/PATCH/OPTIONS`), HTTPS com proxy
  explícito, headers CSP/HSTS e bootstrap fail-closed por env
- dependência: `PLAT-S17-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: sem wildcard/`null`/origins não normalizadas; preflight e headers
  allowlisted; transporte HTTP rejeitado quando exigido; production bootstrap
  exige origins e `API_REQUIRE_HTTPS=true`; nenhuma chamada externa ou mudança
  no data plane legado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui host CORS/HTTPS/CSP, IdP, proxy real, deploy, provider,
  canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`

### Resultado controlado PLAT-S18

- `PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY` = `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 97 arquivos/330 testes pass/18 skips;
  coverage 85,16%/80,44%/84,75%/86,06%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- `CONTROLLED_MVP_READY` permanece; produção real é `NO-GO`/
  `WAITING_HUMAN_APPROVAL`.

## PLAT-S19 — Controlled Request Observability Metrics

- id: `PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS`
- status: COMPLETED_CONTROLLED
- entrega planejada: collector process-local bounded por template de rota,
  método/status/latência, fallback de 404/security rejection e endpoint
  read-only `/health/metrics`
- dependência: `PLAT-S18-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: snapshot redaction-safe e defensivo, cardinalidade limitada,
  nenhuma informação de path/query/body/header/identidade e gates existentes
  preservados
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui Prometheus/OTel/broker/storage distribuído, retenção,
  alerting, HA, deploy, provider/canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`

### Resultado controlado PLAT-S19

- `PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 98 arquivos/333 testes pass/18 skips;
  coverage 85,24%/80,63%/84,99%/86,16%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- `CONTROLLED_MVP_READY` permanece; produção real é `NO-GO`/
  `WAITING_HUMAN_APPROVAL`.

## PLAT-S20 — Controlled Rate Limit Memory Safety

- id: `PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY`
- status: COMPLETED_CONTROLLED
- entrega planejada: limiter process-local com capacidade bounded, purge de
  expirados, evicção determinística, validação fail-closed e 429 sem cache
- dependência: `PLAT-S19-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: `bucketCount <= maxBuckets`, nenhum snapshot expõe chaves/IPs/tokens,
  policy e key inválidas falham, contrato `Retry-After` permanece compatível e
  `Cache-Control: no-store` é emitido no 429
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui limiter distribuído/edge, IdP, HA, provider/canal, RAG,
  dado real, deploy ou side effect
- evidência planejada:
  `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`

### Resultado controlado PLAT-S20

- `PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 98 arquivos/335 testes pass/18 skips;
  coverage 85,31%/80,72%/85,07%/86,23%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O limiter local ficou bounded, mas produção segue bloqueada por rate
  limiting distribuído/edge, identidade operacional e demais critérios PROD.
- Evidência: `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.

## PLAT-S21 — Controlled Metrics Exposure Boundary

- id: `PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- entrega planejada: `/health/metrics` enabled only in test/development,
  fail-closed 404 elsewhere and `Cache-Control: no-store`
- dependência: `PLAT-S20-001`, `PLAT-S19-001` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: production/staging/unknown não exportam snapshot mesmo com override;
  `/health` e collector permanecem inalterados
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui auth/IdP, allowlist de rede, Prometheus/OTel, HA,
  provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`

### Resultado controlado PLAT-S21

- `PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 99 arquivos/337 testes pass/18 skips;
  coverage 85,33%/80,74%/85,07%/86,25%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- `/health/metrics` não exporta snapshot fora de test/development; produção
  continua bloqueada por auth/edge/observabilidade operacional e demais PROD.
- Evidência: `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.

## PLAT-S22 — Controlled Correlation Response Boundary

- id: `PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- entrega planejada: publicar `meta.correlationId` em `X-Correlation-Id` sem
  aceitar ou refletir header externo; expor o header somente em CORS aprovado
- dependência: `PLAT-S21-001`, `PLAT-S18-001` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: respostas JSON envelopadas, erros de boundary e server-to-server
  correlacionam; preflight/non-envelope não inventam header; CORS expõe apenas
  o header; nenhum body, identidade ou tenant é alterado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui tracing distribuído, OTel, IdP, observabilidade HA,
  provider/canal, RAG, dado real, deploy ou side effect
- evidência:
  `docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`

### Resultado controlado PLAT-S22

- `PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 100 arquivos/343 testes pass/18 skips;
  coverage 85,37%/80,81%/85,10%/86,29%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O header é derivado do envelope e não altera auth, tenant, body ou
  observabilidade distribuída; produção continua bloqueada pelos critérios
  PROD.
- Evidência: `docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.

## PLAT-S31 — Controlled Approval Decision Note Field Boundary

- id: `PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S30-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- descoberta: `ResolveApprovalSchema.note` era opcional e sem máximo; uma
  decisão fictícia em `/v1/approvals/:approvalRequestId/decision` aceitou
  `note` com 5.000 caracteres e persistiu `approved`, sem ecoar ou persistir a
  nota
- entrega planejada: limitar `note` a 4.000 no schema compartilhado antes de
  `approvals.save`, preservando decisão, operador, approval state, handoff e a
  semântica atual de não persistência de `note`
- aceite: `note` acima do limite retorna `validation_failed`/400 sem chamar o
  repositório e sem mudar estado; valor no limite mantém decisão válida
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada com fixtures; sem mudança de auth,
  tenant, identidade, decisão humana, provider/canal, RAG, dado real, deploy ou
  side effect
- evidência: `docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`

### Registro controlado PLAT-S31

- A lacuna foi reproduzida antes do BUILD com approval, sessão e tenant
  fictícios; o lane trata somente o tamanho da nota no contrato de decisão.
  RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`.

### Resultado controlado PLAT-S31

- O schema compartilhado agora rejeita `note` acima de 4.000 com
  `validation_failed`/400 antes de `approvals.save`, sem echo e sem mudar o
  approval pending; nota no limite mantém decisão `approved`.
- Verify passou com 109 arquivos/397 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51/18;
  audit 0; format, JSON e diff check PASS. Evidência:
  `docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S30 — Controlled Approval Request Field Boundary

- id: `PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S29-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- descoberta: `RequestHumanApprovalSchema` não tinha máximos; uma fixture
  tenant-scoped persistiu `summary` com 5.000 caracteres em `/v1/approvals`
- entrega: limites no schema compartilhado antes de `approvals.save`:
  `sessionId` 160, `proposedAction` 200 e `summary` 4.000
- aceite: cada campo acima do limite retorna `validation_failed`/400 sem chamar
  o repositório e sem echo; payload válido preserva tenant, auth, handoff,
  approval pending e decisão humana
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada com fixtures; sem mudança de decisão de
  approval, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`

### Registro controlado PLAT-S30

- A lacuna foi reproduzida antes do BUILD com dados fictícios e sessão/tenant
  controlados; RED/GREEN, regressão próxima, verify e gates externos foram
  concluídos como `COMPLETED_CONTROLLED`.

### Resultado controlado PLAT-S30

- Verify passou com 108 arquivos/394 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Os três campos acima do limite falham com `validation_failed`/400 antes do
  repositório; valores nos máximos continuam válidos. Evidência:
  `docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S29 — Controlled Internal Task Field Boundary

- id: `PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S28-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- descoberta: `CreateInternalTaskSchema` aceitava campos livres sem máximo; uma
  fixture com sessão/tenant fictícios persistiu quatro campos com 5.000
  caracteres em `POST /v1/tasks`
- entrega: limites no schema compartilhado antes de `tasks.create`:
  `sessionId` 160, `title` 200, `description` 4.000, `source` 120 e
  `idempotencyKey` 200, preservando o mínimo 8 da chave
- aceite: cada campo acima do limite retorna `validation_failed`/400 sem chamar
  o repositório; payload válido continua criando tarefa e preserva tenant,
  auth, idempotência e Secretary
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada com fixtures; sem mudança de auth/tenant,
  persistência estrutural, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`

### Registro controlado PLAT-S29

- A lacuna foi reproduzida antes do BUILD com dados fictícios e escopo tenant
  controlado; a correção será limitada ao contrato de entrada de criação de
  tarefa.
- RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`; nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S29

- Verify passou com 107 arquivos/389 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Os cinco campos acima do limite falham com `validation_failed`/400 antes do
  repositório; valores nos máximos continuam válidos. Evidência:
  `docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S28 — Controlled Audit Filter Duplicate Boundary

- id: `PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/audit/security
- dependências: `PLAT-S27-001`, `PLAT-S25-001`, `PLAT-FOUNDATION-009`
- entrega: rejeição fail-closed de filtros repetidos de audit evidence
  antes de `summarizeEvidence`/`listEvidence`
- aceite: filtro único permanece válido; array/repetição de `sessionId`,
  `correlationId`, `actorId` ou `type` retorna `validation_failed`/400 sem
  chamada ao repositório
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de offset/limit, auth/tenant/identity, Secretary,
  persistência, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`

### Registro controlado PLAT-S28

- `sessionId=a&sessionId=b` foi reproduzido como 200; somente `a` chegou ao
  repositório, criando ambiguidade silenciosa.
- RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`; nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S28

- Verify passou com 106 arquivos/382 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Filtros repetidos falham antes de summary/page; filtro único e paginação
  permanecem válidos. Evidência:
  `docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S27 — Controlled Pagination Offset Boundary

- id: `PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/persistence/security
- dependências: `PLAT-S26-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- entrega: offset máximo explícito de 10.000 e rejeição de números
  não seguros antes do repositório em conversas/audit evidence
- aceite: offset 0..10.000 aceito; negativo, não inteiro, não seguro ou maior
  que 10.000 retorna `invalid_pagination`/400 sem chamada ao repositório
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de limit/cursor, auth/tenant/identity, Secretary,
  persistência estrutural, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`

### Registro controlado PLAT-S27

- A reprodução aceitou `offset=1e100` e `offset=9007199254740992` com 200 no
  endpoint de conversas; o valor também alimenta `OFFSET` PostgreSQL.
- RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`; nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S27

- Verify passou com 105 arquivos/376 testes pass/18 skips; coverage
  85,43%/80,80%/85,25%/86,44%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Offsets inválidos falham antes do repositório em conversas e audit evidence;
  offset 10.000 e `limit=1` permanecem válidos. Evidência:
  `docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S26 — Controlled Prompt Profile Error Message Boundary

- id: `PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: platform/api/security
- dependências: `PLAT-S25-001`, `PLAT-S12-001`, `PLAT-FOUNDATION-009`
- entrega: mensagens constantes para erros de chave/ID do Prompt
  Profile, sem echo de valores fornecidos no payload
- aceite: response-template key inválido, prompt block ID duplicado ou protected
  não aparece na resposta; código/status/envelope/correlation e ausência de
  clone permanecem corretos
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem auth/tenant/identity, Secretary, persistência, provider/canal,
  RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`

### Registro controlado PLAT-S26

- A reprodução encontrou `error.message` contendo um `responseTemplates` key
  inválido fornecido pelo operador (`token=fixture-secret<script>`).
- O próximo passo obrigatório é escrever RED; nenhuma implementação S26 foi
  iniciada e nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S26

- `PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: focused 4/4; regressão 3 arquivos/21 testes; verify 104 arquivos/371
  testes pass/18 skips; coverage 85,41%/80,77%/85,24%/86,42%; readiness 4/4;
  E2E 3/3; PostgreSQL 51 pass/18 skips; audit 0; format e diff check PASS.
- Evidência: `docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
  Produção real continua bloqueada.

## PLAT-S25 — Controlled HTTP Request-Target Boundary

- id: `PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S24-001`, `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- entrega: request-target raw bounded em 8192 bytes, maxParamLength
  explícito de 100 e not-found handler com envelope/correlation ID sem echo de
  path/query
- aceite: unknown route 404 `not_found` genérico; target acima de 8 KiB 414
  `request_uri_too_long`; nenhum path/query/segredo é refletido; rotas atuais
  e Secretary permanecem compatíveis
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem auth/tenant/identity, body/parser, Secretary, persistência,
  provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`

### Resultado controlado PLAT-S25

- `PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` = `COMPLETED_CONTROLLED`.
- Gates: verify 103 arquivos/367 testes pass/18 skips; coverage
  85,41%/80,76%/85,24%/86,42%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- O 404 agora é envelope `not_found` correlacionado e target acima de 8192
  bytes falha com 414 sem refletir path/query; produção continua bloqueada.

## PLAT-S24 — Controlled HTTP Parse and Payload Boundary

- id: `PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S23-001`, `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- entrega: bodyLimit explícito de 1 MiB, parser JSON bounded, classificação
  segura de parse/media type/body excessivo e envelope global com correlation ID
- aceite: JSON inválido 400 `validation_failed`, media type 415
  `unsupported_media_type`, body excessivo 413 `payload_too_large`; erro
  desconhecido 500 genérico; sem raw body, stack, cause ou mensagem arbitrária
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem upload, streaming, provider/canal, RAG, dado real, deploy,
  alteração de auth/tenant ou side effect
- evidência: `docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`

### Resultado controlado PLAT-S24

- `PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 102 arquivos/359 testes pass/18 skips;
  coverage 85,46%/80,85%/85,21%/86,40%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O boundary retorna envelope seguro para parse/media type/body excessivo e
  não altera o Secretary; produção continua bloqueada pelos critérios PROD.

## PLAT-S23 — Controlled Startup Failure Redaction

- id: `PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION`
- status: COMPLETED_CONTROLLED
- entrega: formatter de falha de startup bounded/redaction-safe, saída JSON
  mínima no entrypoint e ausência de serialização de stack/cause
- dependência: `PLAT-S22-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: URL com credencial, bearer/token, password/secret/apiKey, PII,
  newline e mensagens excessivas não vazam nem permitem log injection; erro
  desconhecido é genérico; exit code e fail-closed permanecem
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui logger/alerting distribuído, IdP, tenant binding,
  providers/canais, RAG, dados reais, deploy ou side effect
- evidência:
  `docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`

### Resultado controlado PLAT-S23

- `PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 101 arquivos/351 testes pass/18 skips;
  coverage 85,42%/80,84%/85,16%/86,33%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O smoke do entrypoint preservou exit 1 e produziu somente JSON redigido;
  produção continua bloqueada pelos critérios PROD.

## AAA-21 — Resultado final controlado — 2026-09-14

- status: `REVIEW`
- entrega: caminho governado API→outbox→worker→runtime/policy/journal→efeito
  falso→audit; trace/correlation persistentes; heartbeat e decisão/continuation
  atomicamente persistidos; DLQ autorizada e console responsivo.
- evidência: `docs/04_audit/evidence/AAA/AAA-21/FINAL-REPORT.md` e
  `docs/04_audit/evidence/AAA/AAA-21/final-round-20260914.json`
- gates: 245 arquivos/1.719 testes pass/109 skips; coverage
  92,10%/87,20%/90,95%/92,71%; typecheck/lint/build/security/licenses/startup
  e focused visual/audit PASS; PostgreSQL 85 pass/107 skips por ambiente
  indisponível.
- blockers: prova vertical, RLS, crash/restart e durabilidade PostgreSQL;
  cobertura AAA 95%; format global em 277 arquivos históricos; Node 22 alvo;
  signoff humano e autorização externa.
- release: candidato controlado em `REVIEW`; produção `NO_GO`.
- next: executar os gates bloqueados em PostgreSQL descartável + Node 22 e
  atualizar evidência sem promover automaticamente.

## GIT-SYNC-20260914 — versionamento autorizado

- Escopo: commit e push do checkpoint atual para `origin/main`.
- Preparação concluída; execução e conferência do push são o próximo passo.
- Nenhuma tarefa de produto promovida; AAA-21 permanece `REVIEW / NO_GO`.
- Evidência e verificações: registro `GIT-SYNC-20260914` no execution log.

### Conclusão GIT-SYNC-20260914

- status: `COMPLETED`.
- last_completed_action: commit `08d682f20346f14a63324f457741eb6f00ec9339`
  enviado com sucesso para `origin/main`; `git ls-remote` confirmou o mesmo
  hash e `git status --short` retornou vazio após o push.
- next_action: retomar os gates pendentes de AAA-21 em ambiente controlado;
  candidato permanece `REVIEW`, produção `NO_GO`.

# PHASE11.1-FORMAL-CLOSURE-20260915 — registro de task e gate — 2026-09-15

- engine: `SPEC -> BUILD`; status: `IN_PROGRESS`; release `CONTROLLED_LOCAL / PRODUCTION_NO_GO`.
- autorização: pedido explícito do usuário para implementar o prompt de fechamento formal; limitado a código, testes e evidências locais sintéticas.
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, contrato em [`phase11_1_formal_closure_contract_20260915.md`](02_spec/phase11_1_formal_closure_contract_20260915.md); barra congelada em [`quality-bar-phase11-1-v1.json`](04_audit/evidence/AAA/AAA-21/quality-bar-phase11-1-v1.json).
- scope: pacote canônico `certification/phase11/`, ponte corrente, calculus fail-closed, auditoria de bypass legado, regressões de replan/loop/budget/lease/effect/lineage/tenant, PostgreSQL controlado e console; sem provider/canal/IdP/RAG/piloto/produção.
- prompt: intake exato de cinco fontes em [`prompt-master/20260915-formal-closure`](11_phase11/prompt-master/20260915-formal-closure/README.md), preservando o conjunto histórico de 14 fontes.
- next_action: finalizar baseline candidate-bound e delta audit; executar scouts read-only; depois BUILD por fatias com teste focado, crítico fresco e evidência hashada.
- blockers conhecidos: gates externos/humanos, durabilidade física/RPO-RTO e ambiente de piloto não disponíveis; Node24 é incompatível, Node22.23.2 está instalado e deve ser usado.

# PHASE11.1-FORMAL-CLOSURE-20260916 — resultado da auditoria local

## Concluído

- [x] Preservar os cinco prompts byte a byte, SPEC, delta audit, quality bar e pacote canônico candidate-bound.
- [x] Implementar budget/fencing/heartbeat/settlement atômicos, lineage durável, preflight PostgreSQL, observabilidade read-only e console visual responsivo.
- [x] Executar 22 gates e 12 invariantes locais com Node `22.23.2`; unit `251/1.761`, PostgreSQL descartável `23/201`, E2E `9/9`, typecheck/lint/format/build/security/supply/worker PASS.
- [x] Verificar o pacote corrente e recusar promoção para produção com `production_assurance_incomplete`.

## Ainda bloqueado

- [ ] Validar provider, canal, identidade externa, RAG institucional, RPO/RTO, piloto supervisionado, rollback e sign-off humano em ambientes autorizados.
- [ ] Manter `CONTROLLED_LOCAL / PRODUCTION_NO_GO`; não automatizar consulta real, ação clínica, financeira ou prontuário definitivo.

# PHASE11.2-TRIPLE-AAA-20260916 — resultado local

- [x] Preservar e verificar as seis fontes do prompt, registrar PRD/SPEC/quality bar/delta audit e implementar o slice candidate-bound.
- [x] Fechar runtime/orchestrator: lineage de avaliação em replan, fingerprint semântico, validação de capability/risk/tenant e journal obrigatório no kernel durável.
- [x] Fechar recuperação/outbox: revalidação imediata antes do efeito, rejeição terminal, fencing e testes de replay/uncertainty.
- [x] Fechar UI/evidência: matriz sintética `UNCERTAIN`, estados de erro/loading/empty/retry, acessibilidade, screenshots e relatórios human-readable.
- [x] Executar os gates locais sob Node `22.23.2` e PostgreSQL descartável; nenhum dado real, provider, canal, RAG ou efeito externo foi utilizado.
- [x] Pacote canônico selado em `c8e514d` e verificadores current/evidence PASS na auditoria de 2026-09-17; o selo qualifica esse commit, não as alterações documentais posteriores.
- [ ] Validar em ambiente autorizado os gates externos/humanos: provider, canal, identidade, RAG institucional, RPO/RTO, piloto, rollback e sign-off. Produção continua bloqueada.

# AUD-RECENT-20260917 — pendências da inspeção

- [x] AUD-20260917-01 (P1): controle de execução reconciliado e candidato posterior re-selado após as alterações de implementação e documentação; o ponteiro corrente é a fonte canônica.
- [ ] AUD-20260917-02 (P1 para release): vincular o preflight ao bootstrap/deploy e comprovar estado real de banco, integrações e aprovações antes de homologação.
- [ ] AUD-20260917-03 (P2): separar as notas binárias do certificador de avaliação de maturidade operacional.
- [ ] AUD-20260917-04 (externo): qualificar os oito gates externos/humanos em ambiente autorizado; produção segue `NO_GO`.

# PLAN-AUD17-AAA-20260917 — programa de melhoria

- [x] Criar [plano executivo](03_build/0328_aud20260917_executive_plan.md), [roadmap](03_build/0329_aud20260917_roadmap.md) e [backlog de 15 tasks](03_build/0330_aud20260917_backlog.md), rastreando os nove itens e AUD-20260917-01..04.
- [x] `AUD17-01`: baseline stale reconciliado, contrato/negativos congelados e evidência registrada.
- [x] `AUD17-02..04`: matriz/SPEC e rubrica/runtime corrigidos; resultados locais registrados.
- [x] `AUD17-06..11`: efeitos, preflight, red-team, qualidade, console e runbook exercitados localmente; lacunas de PostgreSQL permanecem explícitas.
- [x] `AUD17-05`: `VERIFIED_LOCAL_WITH_PHYSICAL_GAP`; PostgreSQL descartável autorizado executou 23 arquivos e 202 testes sem falhas, incluindo migration `0024`, tenant/RLS, fencing, outbox/replay e cenários de caos. Backup/restore físico e RPO/RTO continuam externos.
- [x] `AUD17-12`: selo candidate-bound local concluído com `CONDITIONAL_GO`, `AAA_CANDIDATE` e elegibilidade máxima `STAGING`; current/evidence verifier passaram e `INV-007..010` fecharam. Produção segue `NO_GO` pelos oito gates externos/humanos.
- [ ] `AUD17-13..15`: bloqueadas por integrações externas, RPO/RTO/rollback/piloto e sign-off humano; nunca promover por fixture local.
- Produção `NO_GO`; execução local não concede staging/produção nem substitui autoridade externa/humana.

# AUD17-AAA-20260917 — fechamento local e próxima etapa

- [x] Implementação local de persistência/fencing corrigida com migration aditiva `0024`, budgets governados, preflight atualizado e regressões de HMAC/chaos cobertas.
- [x] Certificação local candidate-bound reexecutada sob Node `22.23.2` e PostgreSQL descartável; pacote e verificadores correntes devem ser consultados em `certification/current.json`.
- [ ] Próxima etapa: qualificar `AUD17-13` (integrações reais autorizadas), `AUD17-14` (RPO/RTO físico, rollback e piloto) e `AUD17-15` (revisão/signoff humano). Nenhum efeito real, deploy, publicação ou push é autorizado por este fechamento local.

# AUD19-REM-20260919 — remediação derivada da auditoria integral

- [x] Persistir a [auditoria 0566](04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md), com notas por dimensão, métodos, limitações, findings e veredito `FAIL / NO_GO` contra o contrato AAA vigente.
- [x] Publicar o [roadmap 0331](03_build/0331_aud20260919_roadmap.md) e o [backlog 0332](03_build/0332_aud20260919_backlog.md), com 15 tasks e gates M0–M7.
- [x] `AUD19-01`: contrato/runner/regras/verificação alinhados a `>=97%`; negativo `53/56 = 94,64%` falha; cenários corrigidos sem relaxar expectativas (56/56).
- [x] `AUD19-02`: índice `CURRENT`, checker documental, 15 links e JSON inválido corrigidos, matriz AUD19 e ADR LangGraph publicados.
- [x] `AUD19-03..04`: get-or-create linearizável com validação de lineage e teste PostgreSQL de duas conexões; conflito benigno não vira DLQ e fencing vencido não settle.
- [x] `AUD19-05..06`: retenção/erasure parametrizada fail-closed (migration `0025`), replay distribuído e atestação versionada de preflight (migration `0026`).
- [x] `AUD19-07`: hotspots decompostos em fatia medida com architecture tests/ADR.
- [x] `AUD19-08`: QA adversarial e inventário de skips (0 required) e mutantes 9/9; piso §9.1 de branches críticos fechado com testes de comportamento (gate `docs/03_build/tracking/aud19-critical-coverage.json`).
- [x] `AUD19-09..10`: observabilidade com SLIs/alertas/runbooks; acessibilidade multibrowser 75/75.
- [x] `AUD19-11`: topologia API+worker empacotável, non-root, readiness/drain, digests e smoke controlado; produção continua bloqueada.
- [x] `AUD19-12`: `COMPLETED` — selo `9988762d…@cc28bfb` com `34/34` gates locais `PASS`, crítico fresco `PASS`, verificadores `PASS`; decisão `CONDITIONAL_GO` / `AAA_CANDIDATE` elegível `STAGING`; produção `NO_GO`.
- [ ] `AUD19-13..14`: `BLOCKED` até provider/canal/IdP/RAG e RPO/RTO/rollback/piloto terem ambientes e autoridades próprios; `AUD19-15` também está `BLOCKED` pelas dependências e exigirá aprovação humana ao chegar ao gate final.
- **Estado:** `AUD19-01..12` `COMPLETED` em 2026-09-20; selo local `CONDITIONAL_GO` / `AAA_CANDIDATE` elegível `STAGING`; staging real e produção `NO_GO`; `AUD19-13..15` `BLOCKED` externamente.
- **Próxima ação:** obter autorização, ambiente e owners externos para AUD19-13..15 (provider, canal, IdP, RAG, RPO/RTO, rollback, piloto e sign-off) e manter staging real e produção `NO_GO`.

> Estado histórico: a conclusão declarada acima foi supersedida pela auditoria 0567. Não usar os checks AUD19 como autorização ou estado corrente.

# AUD20-REM-20260920 — remediação pós-entrega AUD19

- [x] Publicar [reauditoria 0567](04_audit/0567_aud19_delivery_reaudit_2026-09-20.md), [roadmap 0333](03_build/0333_aud20260920_roadmap.md) e [backlog 0334](03_build/0334_aud20260920_backlog.md).
- [x] `AUD20-01` `COMPLETED`: SPEC/barra, negativos, matriz, manifesto, receipts e revisão independente concluídos; G0 aprovado para BUILD local controlado.
- [x] `AUD20-02` `COMPLETED`: piso de eval irredutível, N01/N02 e evidências candidate-bound concluídos em BUILD local controlado.
- [x] `AUD20-03` `COMPLETED`: lineage/concorrência E2E, fencing final do outbox, binding candidate-bound e crítica fresca concluídos em BUILD local; staging/produção permanecem `NO_GO`.
- [ ] `AUD20-04` `IN_PROGRESS`: tombstone/digest inbound, retenção tenant/hold, replay tardio e rollback em PostgreSQL descartável.
- [ ] `AUD20-05..12` `BLOCKED`: binding da atestação e privilégios do replay; gates de QA/supply/docs/operação aguardam a sequência.
- [ ] `AUD20-06..08` `BLOCKED`: crítico/mutation candidate-bound; rebuild/digests do mesmo candidato; checker documental e caps arquiteturais.
- [ ] `AUD20-09..11` `BLOCKED`: holdout integrado, observabilidade conectada e composição API+worker+DB staging-like.
- [ ] `AUD20-12` `BLOCKED`: reauditoria e re-selo local somente após zero P0/P1.
- [ ] `AUD20-13..15` `BLOCKED`: Opção A registrada, porém inputs, owners, ambiente e gates anteriores ausentes; sign-off humano apenas com dossiê completo.
- **Estado:** `AUD20-04` está `IN_PROGRESS` em BUILD local controlado; staging `FAIL / NO_GO`; produção `NO_GO`.
- **Próxima ação:** executar gates finais de `AUD20-04`; preservar staging e produção `NO_GO`.

## AUD20-01 — registro de SPEC e baseline

- **Status:** `COMPLETED`; G0 `SPEC_APPROVED_CONTROLLED_BUILD` aprovado somente para BUILD local controlado.
- **Entregas documentais:** SPEC, baseline executável, quality bar v1 e matriz requisito→task→negativo→teste→evidência publicados em `docs/02_spec/aud20_01_baseline_contract_20260920.md` e `docs/04_audit/evidence/AUD20/`.
- **Baseline:** candidato live `b4cb18ac…@98ec5e8`, Node `22.23.2`, worktree limpo na captura; selo `fbca3d2b…@fa78f92` histórico/stale.
- **Verificação:** `docs:check`, `git diff --check` e `docs-integrity` PASS; verifier/evidence/critic/promotion/preflight permanecem FAIL/NO_GO fail-closed.
- **Próxima ação:** executar `AUD20-02`; manter AUD20-13..15, staging real e produção bloqueados.

## AUD20-02 — piso de eval irredutível

- **Status:** `COMPLETED` em BUILD local controlado; produção `NO_GO`.
- **Entrega:** `runEvalSuite` agora falha fechado para override menos estrito, threshold/métrica não finito, ausente, string ou arredondado abaixo da barra; a origem de `0,97` continua alinhada às regras de certificação.
- **Evidência:** RED reproduzido; focused `53/53`, `test:evals` `23/23`, red-team `9/9`, typecheck/lint/format/build e regressão `282/2.172` PASS; relatório sintético `56/56`, `1,0`, zero policy/unsafe.
- **Limitações:** functions coverage global `89,55%` e gates de denominador/coverage final ainda não fechados; `certification/current.json` continua histórico/stale; nenhum PostgreSQL, Docker, Playwright, sistema externo, staging ou produção foi usado.
- **Próxima ação:** `AUD20-03` — RED/GREEN de lineage/concorrência com negativos `AUD20-N03/N04`; manter AUD20-04..15, staging e produção bloqueados.
- **Evidência corrente:** `docs/04_audit/evidence/AUD20/AUD20-02-candidate-manifest.json`, `docs/04_audit/evidence/AUD20/AUD20-02-command-receipt.json`, `docs/04_audit/evidence/AUD20/AUD20-02-candidate-receipt.json`, `docs/04_audit/evidence/AUD20/AUD20-02-red-green-report.md` e `certification/agent-eval-report.json`.

## AUD20-02 — remediacao pos-critica do contrato

- **Status:** `READY_FOR_NEXT_STEP`; BUILD local controlado concluido; critica independente fresca pendente antes de liberar AUD20-03.
- **Entrega:** commit `1f4dd3c` vincula `runEvalSuite` ao corpus canonico `core-v1` (`56` cenarios, `14` adversariais, digest SHA-256), faz denominador adversarial vazio falhar fechado e endurece `evalContractViolations` contra metrica fora do threshold declarado.
- **Negativos:** corpus reduzido nao vazio, contagem/digest divergentes, ausencia de cenarios adversariais e `PASS` abaixo do threshold declarado agora falham no runner, certificador e verifier.
- **Verificacao:** focused eval `24/24`, contract/formal `38/38`, red-team `19/19`, regressao `282` arquivos/`2.175` testes PASS com `12` arquivos/`172` testes SKIP; coverage `91,68/87,53/89,56/92,26`; typecheck/lint/format/build/docs/security/self-test PASS.
- **Limitacoes:** evidence candidate-bound deve ser regenerada apos este checkpoint documental; `certification/current.json` segue stale; AUD20-12, PostgreSQL, Docker, Playwright, gates externos/humanos, staging e producao permanecem bloqueados.
- **Proxima acao:** regenerar manifesto/receipts do candidato atual e obter critica independente fresca; se `PACKAGE_READY`, iniciar AUD20-03 com RED/GREEN de lineage/concorrencia e negativos `AUD20-N03/N04`.

## AUD20-02 / AUD20-03 — transicao apos critica fresca

- **AUD20-02:** `PACKAGE_READY` no candidato `e96c685542c8e4b611096594391ef4aac96a0f4761fe6528bcf25c4f2c2180ed`; critica independente fresca nao encontrou P0/P1/P2 bloqueante no escopo local.
- **AUD20-03:** `IN_PROGRESS` em BUILD local controlado; contrato registrado no roadmap/backlog AUD20-REM e gate liberado somente pela revisao `PACKAGE_READY`.
- **Escopo:** validar lineage completa de Goal/Plan/Step/Attempt, concorrencia/restart/replay e ausência de efeitos duplicados, mantendo handoff/approval fail-closed.
- **Negativos obrigatorios:** `AUD20-N03` para lineage canonica divergente e `AUD20-N04` para crash/redelivery/last-attempt sem duplicacao ou falso DLQ.
- **Limites:** AUD20-04..15 continuam bloqueadas; staging real, producao, provider/canal/IdP/RAG, dados reais e efeitos externos permanecem `NO_GO`.
- **Proxima acao:** ler o contrato de AUD20-03, capturar RED executavel e implementar somente a menor correcao necessaria.
