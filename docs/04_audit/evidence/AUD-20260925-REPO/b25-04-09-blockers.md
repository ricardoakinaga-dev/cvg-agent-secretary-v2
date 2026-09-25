# B25-04…B25-09 — Registro formal de bloqueios (2026-09-25)

Lead do programa AUD-20260925-REPO. Nenhum BUILD, teste, banco, sessão ou deploy foi iniciado para estes itens; staging real e produção permanecem `NO_GO`. Cada bloqueio registra causa raiz, impacto, ação necessária e próxima dependência, conforme `docs/07_agents/AGENTS.md`.

## B25-04 — Gate PostgreSQL zero-skip (R2) — `BLOCKED`

- Causa raiz: task `AUD20-11` está `BLOCKED` (depende de `AUD20-07/10/19`); não há aprovação/admissão hash-bound para execução contra PostgreSQL descartável.
- Impacto: 192 skips condicionais seguem sem classificação final; NQP-02 permanece `UNIT_SUBSET_PASS; POSTGRES_NOT_RUN`.
- Ação necessária: decisão humana + admissão própria de `AUD20-11` com banco descartável, teardown e critério zero-required-skip.
- Próxima dependência: R1 fechado (binding + coverage) e liberação pelo DAG.

## B25-05 — Mutation admitida (R2) — `BLOCKED`

- Causa raiz: mutation exige admissão separada; nenhuma admissão foi solicitada ou concedida nesta rodada.
- Impacto: C06 sem um de seus pilares; functions 89,27% sem validação de qualidade dos testes.
- Ação necessária: admissão própria de mutation (sentinel, alvos críticos) após B25-01/B25-03.
- Próxima dependência: candidato selado (R0) + gate próprio.

## B25-06 — Collector admitido de AUD20-10 (R3) — `WAITING_HUMAN_APPROVAL` (enfileirado)

- Causa raiz: execução enfileirada após o caminho crítico AUD20-17; Q1/C06 não liberaram o DAG.
- Impacto: nenhum collector/alerta novo exercitado; owner/SLO seguem sem decisão.
- Ação necessária: manter enfileirado; executar somente a allowlist/hash admitidos após liberação.
- Próxima dependência: R1 com DAG liberado.

## B25-07 — Crítica R2 e sessão humana de AUD20-19 (H) — `WAITING_HUMAN_APPROVAL`

- Causa raiz (R2): crítica independente ainda não solicitada/concluída sobre os bytes finais do BUILD FU1 verificado em 13:01Z.
- Causa raiz (sessão): sessão humana exige participantes, consentimento, equipamento e autorização específica — inexistentes nesta rodada; automação jamais pode declará-la concluída.
- Impacto: `IMP50-18` sem aceite; gates dependentes R3–R6 do roadmap 0340 seguem bloqueados.
- Ação necessária: (a) solicitar R2 fresh-context; (b) decisão/autorização humana específica para a sessão, com dossiê próprio.
- Próxima dependência: autoridade humana competente; nada executa sem ela.

## B25-08 — Candidato final local e re-selo Phase 11 (R4) — `BLOCKED`

- Causa raiz: pré-requisitos R2, R3, H e `AUD20-18/07/11/12` não concluídos; worktree sujo (ver [B25-01](b25-01-seal-report.md)).
- Impacto: `certification:verify:phase11` e `promotion:check` seguem rejeitando o pacote (fail-closed correto).
- Ação necessária: fechar R0–R3 + H antes de reconstruir imagens/SBOM e re-selar os mesmos bytes.
- Próxima dependência: R2, R3, H concluídos.

## B25-09 — Dossiês externos/humanos e release (R5) — `BLOCKED`

- Causa raiz: oito gates (provider, canal, identidade externa, RAG institucional, RPO/RTO, piloto, rollback, sign-off) sem owners, ambientes, janelas ou autorizações.
- Impacto: nenhuma elegibilidade de promoção; produção `NO_GO` por definição.
- Ação necessária: owners e autorizações específicas por dossiê; sign-off e deploy separado.
- Próxima dependência: B25-08 + autoridades externas/humanas.

## Limites deste registro

- Documental apenas: nenhuma execução, aprovação ou admissão decorre deste arquivo.
- Reversão: qualquer item sai de bloqueio somente por decisão/admissão própria registrada em recibo hash-bound, nunca por inferência deste programa.
