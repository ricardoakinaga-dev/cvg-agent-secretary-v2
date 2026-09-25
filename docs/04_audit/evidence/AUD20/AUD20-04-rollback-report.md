# AUD20-04 — rollback report

- Validity: `HISTORICAL_STALE`; candidate `87874e...` is not the current AUD20-04 v2 candidate and this report must not qualify the current task.
- Candidate: `87874e63523b491ad0d3e59fe946fb49db254672db79ff417ab3318b4b07e822`.
- A synthetic trigger raised `AUD20-04 ledger failure` while the retention sweep attempted to write its ledger entry.
- The sweep failed closed and the tombstone update was rolled back; the reservation remained without `tombstone_digest`.
- After removing the trigger, the same reservation was processed successfully by a clean rerun.
- The rollback path was executed in the same PostgreSQL regression as the replay and tenant/hold assertions.
- Raw evidence: `AUD20-04-raw/retention-replay.log` (`c83e5b8360bacc94101cf16ce15da87337338958622ac7562d4256046c9fc02f`).
- Migration checksum: `a64e5302e971e96f961f25c045cd7d32e06ab6a8714d3b29050f01e22370e8d1` for `packages/persistence/migrations/0027_inbound_idempotency_tombstones.sql`.

Verdict: `PASS` for transactional rollback in controlled-local scope.
