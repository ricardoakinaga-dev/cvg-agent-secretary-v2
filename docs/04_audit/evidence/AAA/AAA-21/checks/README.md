# Raw Checks

The `full-cert/` files are copies of the official Phase 10 certification logs
and reports for the current candidate/run. They are the authoritative checks
referenced by the current manifest; they are evidence for the candidate only,
not a release certificate.

The `*-final.log` files are superseded unbound captures from an earlier
attempt and the root-level `*-bound.log` files belong to earlier candidate
bound runs. They are retained for provenance only and are not referenced by
the current manifest. The canonical candidate record is
`../candidate-manifest.json`; the flat hash list is
`../candidate-files.sha256`.

Candidate schema, hash, plan and certification validation captures in
`full-cert/` use the same official run ID. The current certification verifier
is a documented FAIL because the required repository format gate is still
FAIL; it does not qualify this candidate.
