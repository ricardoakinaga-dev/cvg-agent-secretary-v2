# IMP50-49 — follow-up review of formatter-path scope report — 2026-09-24

## Verdict

`PASS` for the final report's scope and count precision. The previous review's
editorial finding is resolved. This result does not advance Discovery 0022 or
adjudicate any of the 141 records.

## Reviewed artifacts

- Final supplementary report:
  [formatter-path scope audit](imp50-49-formatter-path-scope-audit-20260924.md),
  SHA-256
  `41dd157fc45c7339e25d0ef522624770d5b37028c112bbe704929b2cbb01427a`.
- Related Discovery:
  [0022](../../../00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md),
  SHA-256
  `1b4f75e899f232ede5d9f0bbc513003f181e7e83a82acb85a57be4a4d198958f`.
- Previous report version reviewed:
  SHA-256
  `354badc09bc7e8cfd2b899efc23c2c23d109ce5dcfe64ec0ce5a25227684a7a1`.

## Findings

The final report now states the counts precisely: 12 of the 13 receipt targets
appear in `full-cert/format.log`; the remaining target is a code reference to
AUD19-11. This resolves the prior editorial observation.

The evidence supports only that the hash-bound formatter log emitted those
names. The run's candidate manifest excludes `docs/04_audit/evidence/` and
records a dirty worktree, so absence from that manifest or commit tree does not
show whether the targets existed in the workspace. The log does not bind the
target bytes or prove the original AUD19-10 composition. The report's
conclusion stays within those limits.

Discovery 0022 remains without `DISCOVERY_READY`. All 141 insufficiently
supported references remain unadjudicated; snapshot v1 remains the baseline
and v2 the immutable supplement. This review supplies no new authoritative
per-file lineage evidence and does not change any class or gate.

## Review boundary

The reviewer inspected the final report and Discovery by their exact hashes.
No `raw` payloads or human-session records were read, no tests were run, and no
files were edited by the reviewer.
