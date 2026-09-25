# AUD20-17 / IMP50-40 — independent review of request-context SPEC amendment v2

- **Verdict:** `PASS_FOR_HUMAN_REVIEW`; this does not approve the amendment or
  authorize BUILD.
- **Reviewed proposal:**
  [v2](AUD20-17-request-context-spec-amendment-proposal-v2-20260924.md),
  SHA-256 `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`.
- **Review method:** fresh-context reviewer (`fork_turns=none`), sealed packet
  only, read-only; no tests or edits. Packet source manifest SHA-256
  `7e5b8a70f203dc9420ffd42e3eb0910b07236a1da1bad963243d77ff37a1c49a`; all 34
  packet copies matched manifest hashes and sizes.
- **Scope of mutation check:** artifact-only repository fingerprint changed
  from `295c511f876f243e256bbc39eecfe4c5a187edb8e4305c631d71391ce533c00a` to
  `db742a2f33d13a1adca97ca15ddd1975f90cbb86ea59deb2e31544d77d7de747` while
  review was in flight. The only changed paths were nine operational status
  documents (`0190`, `0300`–`0302`, `0337`, `0342`, `0343`, `CURRENT`, and
  `README`) updated by the coordinator. No product source or test changed.
  The reviewer was instructed and reports that it inspected only sealed packet
  copies; this is not a whole-worktree zero-write claim.

## Assessment

No ranked gaps remained against the four conditions from the v1
`CONDITIONAL` review.

1. **Reconstruction and query-test attribution:** v2 requires an isolated
   v1-only manifest with hashes/counts, verification of `server.ts=4,745`,
   removal/restoration records for query-parser, and a fail-closed policy for
   query-parser route-test changes. FU1 test assertions remain credited only to
   FU1. See proposal lines 199–228 and v1 review lines 16–28.
2. **Coverage and skips:** v2 keeps all AAA floors (statements/lines/functions
   >=90%, branches >=85%, critical-module branches >=95%, selected mutation
   detection 100%), requires an executed/ignored inventory, prevents skipped
   mandatory cases from passing, and retains the PostgreSQL-required zero-skip
   gate. Current C06 remains failed: 89.25% functions and 192 skips. See v2
   lines 245–258, coverage receipt lines 271–274, and full-run receipt lines
   133–136.
3. **Helper contracts and order:** v2 defines local structural request,
   reply, metrics-sink, hook/parser registrar, completion-callback, getter, and
   authorization signatures; captures `nodeEnv` in the context factory; bars
   Fastify imports/casts; and preserves registration order. See v2 lines
   51–140.
4. **Integrated cap:** arithmetic is correct:
   `5,050 - (5,018 - 37) = 69` maximum net context-module growth, yielding an
   effective 327-line module ceiling from the current 258 lines. Actual counts
   stay fail-closed. See v2 lines 166–197.

The proposal remains limited to request-context and preserves HTTP/API/schema
behavior, raw-body privacy, identity/default deny, and separate query-parser
attribution. Its 37-line reduction is an estimate with no slack; it is not a
C02 result. C06/C07 remain unaccepted until candidate-bound evidence satisfies
the criteria.

## Disposition

The exact v2 hash is ready for the human SPEC decision. The existing first-slice
approval does not authorize this scope amendment or another BUILD. Any approval
must be recorded before code, with a separate explicit hash-bound local-BUILD
admission. No code, BUILD, database, external integration, staging, production,
commit, push or deploy occurred in this review.
