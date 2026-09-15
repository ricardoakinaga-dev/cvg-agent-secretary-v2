-- AAA-21-EXEC-20260914: durable runtime continuation and trace propagation.
--
-- Additive only. A message remains non-terminal while an approval is pending;
-- the continuation pointer is tenant-scoped metadata and never an effect
-- payload. Trace roots are optional for legacy rows and required only for new
-- callers that opt into propagation.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS runtime_approval_id text,
  ADD COLUMN IF NOT EXISTS runtime_trace_id text;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_runtime_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_runtime_status_check
  CHECK (runtime_status IN ('pending', 'waiting_approval', 'completed'));

CREATE INDEX IF NOT EXISTS idx_messages_runtime_approval
  ON messages(runtime_approval_id)
  WHERE runtime_status = 'waiting_approval';

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS trace_id text;

ALTER TABLE runtime_approvals
  ADD COLUMN IF NOT EXISTS continuation_payload jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_runtime_approvals_continuation_message
  ON runtime_approvals (tenant_id, ((continuation_payload->>'inboundMessageId')))
  WHERE continuation_payload IS NOT NULL;

COMMENT ON COLUMN messages.runtime_approval_id IS
  'Approval id blocking this inbound runtime message; populated only while runtime_status=waiting_approval.';
COMMENT ON COLUMN messages.runtime_trace_id IS
  'Trace root propagated from the durable inbound event into the governed worker turn.';
COMMENT ON COLUMN outbox_events.trace_id IS
  'Optional W3C-compatible trace root for cross-process correlation; legacy events remain readable.';
COMMENT ON COLUMN runtime_approvals.continuation_payload IS
  'Validated synthetic continuation pointer. It identifies the original inbound context and is not executable data.';
