-- Scope statement checksum uniqueness to user_id
ALTER TABLE statements
  DROP CONSTRAINT IF EXISTS statements_file_checksum_key;

ALTER TABLE statements
  ADD CONSTRAINT statements_user_checksum_key UNIQUE (user_id, file_checksum);

CREATE INDEX IF NOT EXISTS idx_statements_user_checksum
  ON statements(user_id, file_checksum);
