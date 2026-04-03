-- Align accounts currency default with the rest of the app (IDR, not USD).
ALTER TABLE accounts ALTER COLUMN currency SET DEFAULT 'IDR';
