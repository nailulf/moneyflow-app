-- Weekly exchange rate snapshots.
-- Populated by a GitHub Actions cron job calling POST /api/exchange-rates/snapshot.
-- Used as a fallback when live exchange rate APIs are unavailable.
CREATE TABLE IF NOT EXISTS exchange_rate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL DEFAULT 'IDR',
  rate DECIMAL(18,8) NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_snapshots_lookup
  ON exchange_rate_snapshots(from_currency, to_currency, snapshot_date DESC);

COMMENT ON TABLE exchange_rate_snapshots
  IS 'Weekly exchange rate snapshots for offline/fallback currency conversion';
