# 0345 — Backlog pós-auditoria 0573

Fontes: [auditoria 0573](../04_audit/0573_repository_audit_2026-09-25.md), [roadmap 0344](0344_post_audit_roadmap_20260925.md), [backlog operacional 0337](0337_aud20260921_backlog.md) e [CURRENT](../CURRENT.md). Os itens abaixo são **propostas PLANNED** vinculadas a tasks `AUD20-*`/`IMP50-*` existentes; PLANNED não é autorização de código. Cada BUILD exige SPEC/gate hash-bound e admissão própria antes de qualquer edição. Estados de task seguem `docs/07_agents/AGENTS.md`; staging real e produção permanecem `NO_GO`.

## B25-01 — Selar o candidato corrente (R0)

- **O que:** congelar a árvore em worktree limpo e publicar manifesto hash-bound de fontes, resultados e ambiente (Node `22.23.2`, lockfile, COMMIT).
- **Onde:** `certification/` + recibo em `docs/04_audit/evidence/AUD-20260925-REPO/`.
- **Como:** sem alterar produto; somente inventariar, hashear e registrar.
- **Dependência:** nenhuma; bloqueia a adjudicação de R1–R4.
- **Critério de pronto:** `certification:verify` e `promotion:check` avaliáveis contra os mesmos bytes; divergências listadas, não ocultadas.

## B25-02 — Recuperar binding candidate-bound do run integrado (R1)

- **O que:** reconciliar o manifesto `11f061…` citado no BUILD report com o arquivo atual `6b86…` e produzir inventário hash-bound das 301 fontes do run integrado.
- **Onde:** `docs/04_audit/evidence/AUD20/` (+ adendo à [reconciliação](../04_audit/evidence/AUD20/AUD20-17-manifest-baseline-reconciliation-20260924.md)).
- **Como:** leitura e hashing somente; sem reescrever relatórios históricos; registrar `REPORT_ONLY` onde o vínculo não fechar.
- **Dependência:** B25-01; task `AUD20-17`, achado A25-02.
- **Critério de pronto:** cada métrica integrada é `candidate-bound` ou está explicitamente marcada `REPORT_ONLY`; baseline "sem redução" é `NOT_RUN` ou está vinculada a candidato/denominador/run exatos.

## B25-03 — Fechar o piso de functions ≥90% (R1)

- **O que:** diagnosticar as funções/ramos não cobertos (89,27% atual) e cobri-los com testes do mesmo código, sem alterar denominador, threshold ou amostra.
- **Onde:** suíte Vitest + `vitest.coverage-all.config.mts`; evidência em `docs/04_audit/evidence/AUD20/`.
- **Como:** somente após SPEC/gate próprio de `AUD20-12/17` e admissão; negativos e regressão do chamador incluídos.
- **Dependência:** B25-01; tasks `AUD20-12/17`, achado A25-01.
- **Critério de pronto:** functions ≥90% no denominador contratual, com relatório e crítica independente; exit 0 isolado do config de 80% não conta como prova.

## B25-04 — Executar o gate PostgreSQL com zero required skip (R2)

- **O que:** rodar `test:postgres` contra PostgreSQL descartável local com teardown, classificando os 192 skips em condicionais vs required e zerando os required.
- **Onde:** `packages/persistence`, `apps/api`, `apps/worker`; banco descartável exclusivo da task.
- **Como:** somente após admissão própria de `AUD20-11`; nunca apontar a staging/produção ou dados reais.
- **Dependência:** B25-02; tasks `AUD20-11`, `IMP50-07`, achado NQP-02.
- **Critério de pronto:** zero required skip, teardown comprovado e atribuição por arquivo do run registrada; `AUD20-11` sai de `BLOCKED` somente pelo gate próprio.

## B25-05 — Executar mutation admitida (R2)

- **O que:** executar a mutation selecionada (sentinel) sobre o candidato selado, após admissão separada.
- **Onde:** `scripts/lib/mutation-sentinel.mjs` + alvos críticos (`request-context`, kernel, approval, policy).
- **Como:** admissão própria prévia; sem alterar thresholds/registry.
- **Dependência:** B25-01; task `AUD20-17` (C06), gates de mutation.
- **Critério de pronto:** relatório de mutation com sobreviventes tratados ou aceitos por decisão registrada; C06 avaliável.

## B25-06 — Executar o collector admitido de AUD20-10 (R3)

- **O que:** implementar/executar o collector API→worker da SPEC já aprovada, com negativos de PII, correlação e entrega.
- **Onde:** allowlist e hash da admissão `AUD20-10/IMP50-09` em 0337.
- **Como:** somente após o DAG liberar (R1 fechado); owner/SLO seguem decisão humana própria, fora deste item.
- **Dependência:** R1 + liberação pelo DAG; task `AUD20-10`, achado A25-05.
- **Critério de pronto:** telemetria correlacionada sem PII demonstrada em ambiente sintético; sem claims de SLO.

## B25-07 — Crítica R2 e sessão humana de AUD20-19 (H)

- **O que:** obter a crítica independente R2 do BUILD FU1 e, em gate separado, a sessão humana de acessibilidade com consentimento e participantes autorizados.
- **Onde:** `docs/04_audit/evidence/AUD20/`; sessão fora do repositório, com dossiê próprio.
- **Como:** R2 como revisão fresh-context dos bytes finais; sessão somente com autorização humana específica.
- **Dependência:** nenhuma para R2; sessão depende de decisão/autorização própria; task `AUD20-19/IMP50-18`, achado A25-06.
- **Critério de pronto:** R2 `PASS`/`REJECT` registrado; sessão realizada com consentimento ou task em `WAITING_HUMAN_APPROVAL`; automação jamais declara a sessão concluída.

## B25-08 — Candidato final local e re-selo Phase 11 (R4)

- **O que:** reconstruir imagens/SBOM, compor serviços, revisar e re-selar o mesmo candidato (Phase 11).
- **Onde:** `certification/phase11/`, `Dockerfile`, `deploy/`.
- **Como:** somente após R2, R3, H e `AUD20-18/07/11/12` admitidas e concluídas; qualquer write aplicável exige nova prova.
- **Dependência:** R2, R3, H; tasks `AUD20-07/11/12/18`, achado A25-03.
- **Critério de pronto:** `certification:verify:phase11` e `promotion:check` reavaliados contra os bytes selados; produção segue `NO_GO` até R5.

## B25-09 — Dossiês externos/humanos e decisão de release (R5)

- **O que:** produzir os oito dossiês pendentes (provider, canal, identidade externa, RAG institucional, RPO/RTO, piloto, rollback, sign-off) e submeter a decisão de release.
- **Onde:** `docs/04_audit/evidence/` + owners/ambientes aprovados.
- **Como:** somente com owners, ambientes, janelas e autorizações específicas; sem inferência.
- **Dependência:** B25-08; tasks `AUD20-13..15`, `IMP50-11..17/20`.
- **Critério de pronto:** cada gate com evidência própria e sign-off; deploy somente por autorização separada de deploy.

## B25-10 — Governança documental em paralelo (D)

- **O que:** (a) regra de linhagem dos 141 vínculos IMP50-49 com suporte exato por item; (b) checker de drift semântico entre estado canônico e resumos; (c) DX do pin Node 22.23.2.
- **Onde:** Discovery 0022, `scripts/docs-check.mjs`, `.nvmrc`/`.node-version`, `docs/README.md`.
- **Como:** gates Discovery/PRD/SPEC próprios; preservar v1 baseline e v2 suplemento; nunca adjudicar classe automaticamente.
- **Dependência:** decisões humanas quando materiais; task `AUD20-08-FU3`, achado A25-07.
- **Critério de pronto:** drift detectado por checker com negativo explícito; 141 vínculos com suporte ou política aprovada, ou mantidos sem adjudicação por decisão registrada; `AUD20-08` permanece `COMPLETED` sem reabertura.
