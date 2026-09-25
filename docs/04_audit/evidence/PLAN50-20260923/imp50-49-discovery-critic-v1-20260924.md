# IMP50-49 — fresh review of the 141-link disposition

- Reviewed: `2026-09-24`.
- Decision reviewed: keep all 141 insufficient references unadjudicated until
  sufficient evidence exists.
- Reviewer: `imp50_49_discovery_fresh_critic`; sealed read-only packet,
  `fork_turns=none`; report SHA-256
  `97091f48ddc2a9c945b9565877505718f8a46359d89f094d6b0bb4cd75a239ac`.

## What the decision settles

The interim handling is explicit: none of the 141 rows is adjudicated or
automatically reclassified. The map SHA-256 is
`03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`: 99 rows
are `aggregate_only` and 42 are `basename_only`; both groups remain
insufficient. The exact per-item support requirement remains. A later manifest
can prove historical membership only if it is bound to the original execution
and source snapshot; the current later-created candidate does not prove that
composition.

The user-selected v1 baseline stays intact (2,412 paths); v2 stays an immutable
read-only supplement. No class, inventory member or source file was changed.

## What remains open

- Sufficient, independently reviewable evidence for each of the 141 items.
- Lineage authority, post-cutoff coverage, failure rules and class distinctions.
- Fixtures for all six proposed classes and deterministic read-only behavior.
- A fresh critique after the missing item-level evidence is assembled.

The current evidence does not support `DISCOVERY_READY`. Discovery 0022 remains
`IN_PROGRESS`, without PRD/SPEC/checker/BUILD admission. The narrow next action
is a read-only follow-up for source evidence for the 141 rows, then another
independent review before reassessing the gate. See [Discovery 0022](../../../00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md),
[the reference map](imp50-49-historical-reference-map-v2-20260923.jsonl), and
[the inventory v2 report](imp50-49-full-inventory-v2-report-20260923.md).
