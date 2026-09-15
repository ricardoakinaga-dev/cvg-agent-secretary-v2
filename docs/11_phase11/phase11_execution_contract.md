# Phase 11 execution contract

Status: `CONTROLLED_LOCAL_BUILD / PRODUCTION_NO_GO`

This contract translates the 14 supplied Phase 11 prompt files into a
reviewable, machine checked execution surface. The source prompt copies and
their digests are in [`prompt-master/README.md`](prompt-master/README.md).
The matrix in [`requirements-matrix.json`](requirements-matrix.json) is the
traceability index for the 0–1324 item range; it does not claim that a linked
file or test has passed.

## Authority and scope

- The active repository constitution, the AAA-21 controlled BUILD contract,
  and the current backlog remain authoritative.
- This round may change local source, tests, contracts, and evidence using
  synthetic data and a disposable PostgreSQL instance.
- The controlled effect adapter is the only executable effect. Real provider,
  channel, identity, RAG, pilot, production, and human release gates remain
  blocked unless independently authorized and evidenced.
- The release verdict must be derived from current candidate bytes, current
  raw gate output, prompt integrity, environment compatibility, and external
  gate state. A score, historical certificate, or document status cannot
  promote the candidate.

## Required vertical contract

The controlled path is:

```text
synthetic HTTP inbound
  -> tenant-scoped PostgreSQL message/session
  -> durable outbox
  -> worker lease/heartbeat
  -> governed kernel
  -> policy and approval
  -> controlled fake tool/model
  -> effect journal and audit chain
  -> persisted result or waiting approval
  -> safe response
```

Every boundary must preserve tenant, conversation, session, inbound message,
correlation, and trace identifiers. Unknown runtime selection, missing durable
storage, untrusted actor identity, invalid proposal payload, unsafe capability,
stale lease, duplicate effect, and missing external gate fail closed.

An outbox claim returns a unique `leaseToken`. Heartbeat, acknowledgement,
failure, takeover suppression, and worker retry settlement compare that token
with the current row in addition to the tenant and worker identity. Reusing a
`workerId` after lease expiry therefore cannot settle a stale claim.

## Certification states

| State                     | Meaning                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `NO_GO`                   | A required local gate, candidate integrity check, prompt integrity check, or target environment check failed or was not executed. |
| `AAA_CONTROLLED`          | The local controlled slice has current evidence and no local hard failure; external and human gates remain pending.               |
| `AAA_CANDIDATE`           | Controlled gates plus the required candidate, review, and external qualification conditions are complete.                         |
| `STATE_OF_ART_TRIPLE_AAA` | The candidate additionally has a frozen, reproducible comparative evaluation and the required operational and human approvals.    |

The Phase 11 runner is allowed to emit `NO_GO` or `AAA_CONTROLLED` for this
round. It must never infer an external or production approval.

## Required evidence chain

The result must link each requirement to source prompt files, implementation,
tests, raw evidence, and gates. The result and manifest are bound to the
candidate ID recomputed from the current tree. A later source or configuration
change invalidates the result and requires a new run.

Certification integrity also binds `result.commit`, `result.candidate.head`,
and `manifest.commit` to the current `git HEAD`. The verifier compares the
recorded dirty state with the live candidate state; it never trusts the value
reported by the result by itself. Generated certification outputs are outside
the candidate source surface, so rewriting them does not make the source
candidate dirty.

The format gate covers current code, tests, configuration, contracts, and
operational documentation. Immutable historical audit evidence under
`docs/04_audit/evidence/` and generated certification outputs are excluded by
`.prettierignore`; changing those bytes would invalidate their historical
manifest hashes rather than improve the current candidate.

## Known current blockers

The first current run is expected to remain `NO_GO` until the repository is
reproducible under the target Node version, active-candidate format and
coverage gaps are closed, fresh candidate evidence is resealed, and the
external and human gates are actually completed. PostgreSQL evidence from the
disposable local cluster proves the controlled path only; it does not prove physical durability
or production RPO/RTO.
