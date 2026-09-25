# AUD20-17 / IMP50-40 — isolated request-context v1 reconstruction

**Result:** `PASS_PRECONDITIONS` — the full isolated rollback reconstruction completed before source edits. This evidence does not claim C02–C07 acceptance.

- Temporary workspace: `/tmp/aud20-17-context-v1-reconstruction-20260924`.
- Isolated `server.ts`: 4,745 lines, SHA-256 `5dc7136ec7cf5fa17d486a4cfd0c77f6d15dc7dd8efbfb161a94677ab0b0f901`. The expected C02 reconstruction count is exact.
- Guard files match the approved amendment preconditions: `request-context.ts` SHA-256 `ec4bbc4b68480a6cfd75024cf2382765a20d4d72b9e7dd9f41619403dacaf9a7` and `request-context.test.ts` SHA-256 `6e75f74544d727dc56e99913bd4af5b92ee1438523a19773e35526591b7acda2`.
- All 15 non-log entries in the accepted query-parser final candidate manifest revalidated. The v2 proposal hash is exact.
- Each of the seven parser declarations was restored once into the isolated `server.ts`; the request-query import was removed. The request-query module and direct test were kept out of the v1-only test set, and the query-parser architecture assertion was removed while the request-context architecture assertion was retained.
- Exact pre-FU1 copies of all five query-parser-modified route tests were available from `git show HEAD:<path>`. Their unified diffs are embedded in the JSON evidence. Each has zero removed lines and only additive HTTP envelope, validation/error-code, and exact-message assertions. The isolated v1 test set uses those pre-FU1 copies; the shared worktree files remain intact for the integrated candidate and are credited to FU1.
- No shared source or test file was modified while constructing this reconstruction.

The detailed source hashes, line counts, restored parser ownership, FU1 attribution diffs, and checks are in the companion [JSON manifest](./AUD20-17-request-context-v1-reconstruction-20260924.json). Its SHA-256 is `1195e37dd797c54a5bdb788412de666658a3019ac6c32de4b006882d7b1c741b`.
