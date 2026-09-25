# IMP50-49 — independent review of AUD19-10 member candidate — 2026-09-23

## Verdict

`PASS` for artifact integrity and claim boundaries. This review does not choose
the evidence-lineage policy, adjudicate any class, or emit `DISCOVERY_READY`.

## Evidence checked

- Candidate manifest SHA-256:
  `dcc0499e994314aa8b48a606520eafd671293313794a60ed87ef74dbd5593e3b`
- Candidate report SHA-256:
  `7bed64aca22b8b1265a14776d0543ee63a625d139eb5b64e0eef649c39fb04e7`
- Full inventory SHA-256:
  `a0a1aa656348c88f4719fa5c5301f876b938567327bd203df3324f9c4f41b717`
- AUD19-10 report SHA-256:
  `4b88f1d52f66577b78fb5badb93307989c6baf1fbabb7d00306ee2368cf36bba`

The source report line 134 declares the raw glob, 99 files, and 33 per browser.
The 99 manifest members match the inventory's unique matching path set and order;
path, size, SHA-256, browser prefix, and inventory line agree. The line range is
1790–1888, with 33 Chromium, 33 Firefox, and 33 WebKit members.

Member rows contain no classification field. The header marks the artifact
`REVIEW_ONLY_CANDIDATE`, `PENDING_HUMAN_REVIEW`, and `classification_effect: NONE`.
Its claim remains limited to membership in the 2026-09-23 inventory snapshot,
not membership in the original AUD19-10 execution.

No raw payload bodies were opened or parsed. No files were edited and no tests
were run during the independent review.
