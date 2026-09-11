# ADR 0003 — Approval binding criptográfico

- Status: aceito (Phase 10)
- Contexto: uma aprovação genérica poderia autorizar ação diferente da aprovada.
- Decisão: `@cvg/approval-engine` grava `payload_hash = SHA256(canonical_json)`
  de ação + recurso + payload. O consumo revalida tenant, ação, recurso e hash,
  com compare-and-set single-use e expiração fail-closed.
- Consequências: aprovação para ação A nunca executa ação B; reuso falha; a
  canonicalização é compartilhada (`packages/shared/canonical.ts`).
