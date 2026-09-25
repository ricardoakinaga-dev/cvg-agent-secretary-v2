# IMP50-49 — AUD19-10 raw membership candidate — 2026-09-23

## Result

A review-only JSONL candidate lists the 99 paths matching the AUD19-10 report's
`docs/04_audit/evidence/AUD19/raw/*.json` declaration in the complete evidence
inventory snapshot. It carries each inventory row's path, size, SHA-256, browser
prefix, and 1-based inventory line. The rows occupy lines 1790–1888 of the
2,412-row inventory and divide into 33 Chromium, 33 Firefox, and 33 WebKit
members.

- Candidate: [member manifest](imp50-49-aud19-10-member-manifest-candidate-20260923.jsonl)
- Manifest SHA-256: `dcc0499e994314aa8b48a606520eafd671293313794a60ed87ef74dbd5593e3b`
- Source declaration: [AUD19-10 report](../AUD19/AUD19-10-a11y-report.md#artefatos-de-evidência), line 134, SHA-256 `4b88f1d52f66577b78fb5badb93307989c6baf1fbabb7d00306ee2368cf36bba`
- Source inventory: [IMP50-49 full inventory](imp50-49-full-inventory-20260923.jsonl), SHA-256 `a0a1aa656348c88f4719fa5c5301f876b938567327bd203df3324f9c4f41b717`

## Checks

- Inventory rows matching the declared glob: 99; unique paths: 99.
- Browser distribution: 33 Chromium, 33 Firefox, 33 WebKit.
- Inventory row range: 1790–1888, inclusive.
- The declaration states a glob and count; it does not enumerate filenames.
- The candidate contains no classification field and has `classification_effect: NONE`.
- Raw payload bodies were not opened, parsed, or emitted during this derivation; only the report declaration and inventory metadata were read.

## Limits

This list establishes membership in the full evidence inventory snapshot, not
membership in the original AUD19-10 execution's inputs or outputs. The inventory
snapshot postdates that report's execution, so this candidate does not by itself
resolve the 99 insufficient lineage references or support any class change. Its
use as closed-membership coverage remains a human policy decision. It does not
emit `DISCOVERY_READY`, authorize PRD/SPEC/checker/BUILD, or alter the v1 baseline.
