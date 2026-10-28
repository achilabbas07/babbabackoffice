-- Keep the table -> open bill foreign key, but validate it at transaction commit.
-- This does not allow orphaned relations to be committed.

BEGIN;

ALTER TABLE public.tables
  DROP CONSTRAINT IF EXISTS tables_open_bill_id_fkey;

ALTER TABLE public.tables
  ADD CONSTRAINT tables_open_bill_id_fkey
  FOREIGN KEY (open_bill_id)
  REFERENCES public.open_bills(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

COMMIT;
