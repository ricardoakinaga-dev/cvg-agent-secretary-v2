# AUD20-17 / IMP50-40 — independent review of request-context SPEC amendment v1

- **Verdict:** `CONDITIONAL`; this review does not amend the approved SPEC or
  authorize BUILD.
- **Reviewed proposal:**
  [v1](AUD20-17-request-context-spec-amendment-proposal-v1-20260924.md),
  SHA-256 `8ec10ef6dd69e61951a34a803e6fdb3d9f27a49d834961803243ec0c55258be5`.
- **Review method:** fresh-context reviewer (`fork_turns=none`), sealed packet
  only, read-only, no tests or edits. Packet source manifest SHA-256
  `00be1c034e1a3e2954c2bb7129f7057d194e70ad07a615c83dc7ded9214568f6`.
  Artifact-only repository fingerprint was unchanged before and after review:
  `f6c06c59668f3d22414af8d11be77e51850b4b2be0e3460dc82500d3d312b3b4`.

## Findings

1. **C02 estimate is correct, but the v1-only baseline needs a full manifest.**
   The five source blocks total 44 lines; the proposed seven lines of wiring
   yield the estimated net reduction of 37 (`4,745 - 37 = 4,708`). This has no
   line-count margin. The integrated `server.ts=4,622` includes the separately
   accepted query-parser extraction and cannot be used as request-context
   credit. The rollback rehearsal restores the parser block and checks the
   context file/test hashes, but it does not record the reconstructed
   `server.ts` hash or line count and preserves query-parser route-test edits.
   A future BUILD must record a complete isolated reconstruction manifest,
   verify `server.ts=4,745` before amendment, bind all source/test files, and
   explain how retained query-parser test changes are attributed. Stop if the
   v1-only reconstruction cannot be authenticated. See proposal v1 lines
   82–118, rollback receipt lines 5–43, and query BUILD report lines 15–27.

2. **C06 must carry every applicable coverage floor and the skip inventory.**
   The proposal correctly keeps the present `89.25%` functions result below
   the `>=90%` floor and prevents threshold or denominator changes. The
   acceptance record must also retain the AAA floors for statements (>=90%),
   lines (>=90%), branches (>=85%), critical-module branches (>=95%), and
   selected mutation detection (100%), and attach the executed/ignored test
   inventory. The integrated test receipt includes 192 skips; none may satisfy
   a mandatory gate. The PostgreSQL-required matrix remains separate, and
   required cases need an executed zero-skip result. See proposal v1 lines
   133–140, `aaa_quality_contract.md` lines 175–193, and the integrated full
   log lines 133–136.

3. **Structural registration needs exact contracts and preserved order.**
   The timing hooks and parser are plausible request-context ownership, and a
   local structural interface can preserve the no-Fastify import boundary.
   Specify callback/request/reply types, parser getter input/output, and the
   completion callback contract. Preserve the current order: request target
   guard, HTTP security hooks, response correlation, metrics hooks, JSON
   parser registration, rate limiter, then route registration. Clarify that
   `nodeEnv` is captured by the existing context factory; only
   `identityMode` and override are inputs to the pure
   `requiresAuthenticatedMutations` helper. See proposal v1 lines 23–57 and
   server source lines 419–459, 507–519.

4. **The integrated cap leaves only 69 lines of context-module growth.**
   Current modules total 5,018 against the 5,050 ceiling, leaving 32 lines.
   After the estimated 37-line server reduction, `request-context.ts` may grow
   by at most 69 lines in the integrated candidate. The current module is 258
   lines, so this aggregate constraint is tighter than its 450-line local cap.
   Add the formula and treat actual formatted counts as fail-closed.

## Disposition

The v1 proposal is bounded in subject and preserves the public HTTP/API/schema
surface, raw-body privacy, identity/default-deny rules, query-parser attribution,
and C06 failure. It is **not yet ready for a human approval decision** until the
four clarifications above are incorporated and independently reviewed. No code,
BUILD, scope change, staging, production, or acceptance is authorized. AUD20-17
remains `IN_PROGRESS`; Q2/AUD20-10 remains queued.
