-- AUD19-06: distributed operator JTI replay store.
--
-- Global (non-tenant) security table used by the API operator identity guard
-- when CVG_OPERATOR_REPLAY_STORE=postgres. The atomic claim is an
-- INSERT ... ON CONFLICT (issuer, jti) DO UPDATE ... WHERE expires_at <= now,
-- so two API instances can never both claim the same token id. Rows contain
-- only issuer, jti and expiry; no tenant or clinical data is stored.

CREATE TABLE IF NOT EXISTS operator_replay_events (
  issuer text NOT NULL CHECK (length(btrim(issuer)) BETWEEN 1 AND 120),
  jti text NOT NULL CHECK (length(btrim(jti)) BETWEEN 1 AND 160),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issuer, jti)
);

CREATE INDEX IF NOT EXISTS idx_operator_replay_events_expires
  ON operator_replay_events (expires_at);

COMMENT ON TABLE operator_replay_events IS
  'Distributed operator token-id replay claims (issuer, jti, expiry). The claim is a conditional UPSERT; only the first caller inside the validity window succeeds.';
