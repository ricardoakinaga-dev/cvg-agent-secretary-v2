# NQP-03 / AUD20-17 — request-context disposition review (snapshot v1)

> **Registro histórico:** as disposições abaixo descrevem a candidata e os
> gates antes da emenda/BUILD v2. A crítica inicial da disposição atual
> identificou correções documentais; a [errata de branches](../AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md)
> registra a correção, e a [crítica inicial](../AUD20/AUD20-17-nqp03-disposition-critic-v1-20260924.md)
> preserva o parecer pré-correções. Consulte também o [BUILD report v2](../AUD20/AUD20-17-request-context-v2-build-report-20260924.md).

- Reviewed: `2026-09-24`.
- Scope: first request-context slice from the approved SPEC hash
  `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37`, assessed
  separately from the query-parser FU1 slice.
- Result: `AUD20-17` stays `IN_PROGRESS`; request-context has no limited
  acceptance. FU1 query-parser remains accepted only for its own scope.
- Fresh critic: sealed, read-only packet review by
  `nqp03_context_fresh_critic`, `fork_turns=none`; report SHA-256
  `63c1f8bd609851f5be5ad198d74a7072f639ed20ff76192691bbf260b08ba6a1`.

## Criterion disposition

| Criterion | Result | Evidence and remaining condition |
| --- | --- | --- |
| C01 — ownership and dependency direction | `PASS` | Current architecture/context tests passed; the critic verified one owner, injected dependencies and no cycle/duplicate. Focused run: 7 files, 61 passed, 3 skipped; [raw log](nqp03-context-focused-round2-20260923.log), SHA-256 `039223d6a85ccf5d58bc1f9d5569167e3930c2eba48f5a92c3d462a8a5522d7c`. |
| C02 — size and caps | `FAIL` | Request-context v1 `server.ts=4,745`, cap `4,708` (+37); `request-context.ts=258/450`. Integrated `server.ts=4,622` includes the separate query-parser extraction and does not transfer retroactively. The user selected expanding only the request-context SPEC scope to meet the cap; this is direction for a SPEC amendment and does not authorize another BUILD. |
| C03 — identity, tenant and default deny | `PASS` | The v1 report and direct focused tests support resolver, tenant, permission and request-scoped memoization behavior. No real identity or tenant data used. |
| C04 — HTTP and exports | `PASS` | The v1 route/export checks and current boundary tests support unchanged public behavior; query-parser assertions are not counted as request-context acceptance. |
| C05 — negative and architecture behavior | `PASS` | V1 assertions and current architecture/context tests support the named default-deny, import, duplicate-owner and cap negatives. |
| C06 — regression and coverage | `FAIL` | The integrated candidate reports 89.25% functions (2,101/2,354), below the AAA contract floor of 90%; the request-context v1 coverage run failed the cap assertion and yielded no approved coverage result. The integrated run also has 192 skipped tests; NQP-02 separately classifies their source conditions. |
| C07 — independent acceptance | `FAIL` | Fresh critic does not accept the slice because C02/C06 fail. No limited acceptance is supported. |

## Bound evidence and scope

- V1 BUILD report: [AUD20-17-v1-build-report](../AUD20/AUD20-17-v1-build-report-20260923.md), SHA-256 `d70a6d92e9b5b7f9dabd64f7a75b28ddc76b8b14d9bfb64c901df642a9509d5c`.
- Separate FU1 report: [query-parser BUILD report](../AUD20/AUD20-17-query-build-report-20260923.md), SHA-256 `485a11e83a6a253b3e49c415f0c21a43e4dcf997f23a466b65792d2124ce54d3`.
- Integrated candidate manifest: [candidate-final-audit.sha256](../AUD20/AUD20-17-query-raw-20260923/candidate-final-audit.sha256), SHA-256 `3c6811477393d620ceacd54a34f2b577ed188e67e39aee75a8dad6183b5d3475`.
- Integrated coverage log SHA-256 `f543433dbbb4590dbf4ed9a4103a88ab3079e9d313bb69d423c6bb0ba9885f76`; full run log SHA-256 `695ab9fe825c934355557da17c25845042232db660b17f43de5b8b262f73abb9`.
- Artifact-only pre/post snapshots both equal `bacdf2e92646fa57ce464be0aab0be770587f51dc1628d1f77d9b940c01026c7`. The critics used sealed copies and did not run tests or edit source. The all-state tree later gained the coordinator's saved reports/manifests under `.gauntlet/results`; therefore this record makes no whole-tree zero-write claim.

The independent review says Q1 does not release the DAG. Q2/AUD20-10 remains queued under roadmap 0342; no AUD20-10 BUILD is released by this review. Staging and production remain `NO_GO`.

## Next action

The v1 amendment proposal received a fresh-context `CONDITIONAL` review. Its
four findings are recorded in the
[critic report](../AUD20/AUD20-17-request-context-spec-amendment-critic-v1-20260924.md).
The v2 proposal received `PASS_FOR_HUMAN_REVIEW` from a second fresh-context
critic; see the
[review report](../AUD20/AUD20-17-request-context-spec-amendment-critic-v2-20260924.md).
The exact amendment hash
`1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c` now awaits
a human SPEC decision and separate hash-bound BUILD admission. No code or BUILD
was authorized. NQP-02 static inventory source hashes were rechecked; no
PostgreSQL database or product-code change was used in this review.

## Atualização após a aprovação e BUILD v2 — 2026-09-24

O usuário aprovou a SPEC e o BUILD local controlado para a emenda SHA-256
`1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`; a
admissão foi registrada antes da alteração de código e o BUILD foi executado.
Isto não aceita a subfatia request-context nem altera o resultado separado de
query-parser `PASS_LOCAL`.

| Critério | Estado atual | Disposição |
| --- | --- | --- |
| C01 | `PASS_LOCAL` / crítica `PASS` | Owner único e boundary de contexto injetado. |
| C02 | `PASS_LOCAL` / crítica `PASS` | Reconstrução v1 `server.ts=4.707/4.708`; integrado `server.ts=4.584`, context 328, query 138, soma `5.050/5.050`. |
| C03 | `PASS_LOCAL` / crítica `PASS` | Identidade/default deny/tenant/inbound cobertos por fixtures sintéticas; dependências de PostgreSQL não executadas. |
| C04 | `PASS_LOCAL` / crítica `PASS` | Envelope e mensagens HTTP, JSON inválido, raw-body webhook e exports verificados localmente. |
| C05 | `PASS_LOCAL` / crítica `PASS` | Negativos e assertions arquiteturais passaram. |
| C06 | `FAIL` | Métricas `REPORT_ONLY`; baseline “sem redução”, PostgreSQL zero-skip e mutation selecionada `NOT_RUN`; 192 skips não contam como aprovados. Os 92% de branches são observados, mas aplicabilidade do piso 95% não está adjudicada. |
| C07 | `FAIL` | A crítica independente terminou e não aceita a candidata enquanto C06 não passar. |

O binding integrado continua parcial: BUILD report SHA-256
`0ebebf1c12032597a7733d935c7a08bc19aba4687c420223496499a58ae742a9` cita o
manifesto `11f061…`, mas o arquivo disponível tem SHA-256
`6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`. A lista
de 300 fontes é da reconstrução v1 isolada; o run integrado teve 301 arquivos
sem lista hash-bound completa. O valor global functions 89,27% e o valor
request-context branches 92% são `REPORT_ONLY`. A aplicabilidade de 95% aguarda
decisão humana; essa resposta não aceita C06/C07 nem libera Q2/AUD20-10. Ver a
[crítica fresh-context](../AUD20/AUD20-17-nqp03-disposition-critic-v1-20260924.md),
[errata](../AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md),
[reconciliação](../AUD20/AUD20-17-manifest-baseline-reconciliation-20260924.md)
e [BUILD report](../AUD20/AUD20-17-request-context-v2-build-report-20260924.md).
