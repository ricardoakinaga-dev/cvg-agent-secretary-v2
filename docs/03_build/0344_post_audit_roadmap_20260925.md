# 0344 — Roadmap pós-auditoria 0573

Fontes: [auditoria 0573](../04_audit/0573_repository_audit_2026-09-25.md), [backlog 0345](0345_post_audit_backlog_20260925.md), [roadmap 0342](0342_post_query_roadmap_20260923.md), [backlog operacional 0337](0337_aud20260921_backlog.md) e [CURRENT](../CURRENT.md). Este documento atualiza a sequência **a partir do estado observado em 2026-09-25**; 0340 continua como plano de referência dos 50 itens e 0342 como histórico da rodada query-parser. Ondas são dependências, não datas. Nenhuma onda autoriza BUILD além das allowlists já admitidas, nem altera thresholds, registry ou gates humanos/externos.

## Posição de partida

- `AUD20-17` aberta e não aceita (`WAITING_HUMAN_APPROVAL`; C01–C05 `PASS`, C06/C07 `FAIL`; 92% `REPORT_ONLY`).
- `AUD20-10/IMP50-09` com SPEC aprovada e BUILD admitido, enfileirado após o caminho crítico.
- `AUD20-19-FU1/IMP50-18` com BUILD local verificado, aguardando crítica R2; sessão humana sem autorização.
- 141 vínculos IMP50-49 sem adjudicação (v1 baseline, v2 suplemento); Discovery 0022 `IN_PROGRESS`.
- Staging real e produção `NO_GO`; somente dados sintéticos locais.

| Onda                          | Entrega verificável                                                    | Tasks do backlog 0345 | Entrada                                                               | Saída/gate                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| R0 — estado selado            | Candidato congelado com manifesto hash-bound e worktree limpo          | B25-01                | Árvore atual + recibos vigentes                                       | Manifesto de fontes/resultados conferível; sem ele, R1–R4 não adjudicam gates.                |
| R1 — binding e coverage (C06) | Binding candidate-bound recuperado; functions ≥90% demonstrado         | B25-02, B25-03        | R0; SPEC/gates próprios de `AUD20-17`                                 | Métricas deixam `REPORT_ONLY`; C06 avaliável por evidência própria.                           |
| R2 — gates obrigatórios       | PostgreSQL descartável zero-skip + mutation admitida e executada       | B25-04, B25-05        | R1; admissões próprias de `AUD20-11`/mutation                         | NQP-02 liberável; teardown comprovado; skips required zerados.                                |
| R3 — observabilidade          | Collector API→worker da SPEC admitida + negativos de PII/correlação    | B25-06                | R1 com DAG liberado; hash/allowlist de `AUD20-10`                     | Telemetria correlacionada sem PII; owner/SLO seguem decisão humana própria.                   |
| H — sessão humana             | Sessão AUD20-19 adjudicada por pessoas autorizadas + crítica R2 de FU1 | B25-07                | Consentimento, participantes, equipamento, revisão humana             | Gate humano satisfeito ou `WAITING_HUMAN_APPROVAL`; nenhuma automação declara conclusão.      |
| R4 — candidato final local    | Imagens, SBOM, composição, revisão, manifesto e re-selo Phase 11       | B25-08                | R2, R3, H e `AUD20-18/07/11/12` admitidas e concluídas                | Elegibilidade de promoção reavaliada; qualquer write aplicável exige nova prova.              |
| R5 — externo e humano         | Oito dossiês externos/humanos e decisão de release                     | B25-09                | R4, owners, ambientes e autorizações específicas                      | Sign-off e deploy separado; produção continua `NO_GO` até lá.                                 |
| D — governança em paralelo    | Linhagem IMP50-49, drift semântico e DX versionados                    | B25-10                | Gates Discovery/PRD/SPEC próprios e decisões humanas quando materiais | 141 vínculos sem adjudicação até prova; snapshots v1/v2 preservados; `AUD20-08` não reaberto. |

**Caminho crítico:** R0 → R1 → R2 → R3 → R4 → R5, com H obrigatório antes dos marcos que dependem do gate humano no DAG. Se R1 não fechar C06, R3 permanece enfileirado; não se infere autorização de BUILD adicional. O trabalho D roda em paralelo e não altera o status de release. `AUD20-20` permanece dependente de R2/R3 e `AUD20-18` conforme 0337.

Use somente dados sintéticos em ambiente descartável local. Staging real, produção, dados reais e efeitos externos seguem `NO_GO`.
