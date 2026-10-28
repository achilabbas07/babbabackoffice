-- Backfill and reconcile table<->open_bill relations in Supabase.
-- Safe to run more than once.

BEGIN;

ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS open_bill_id text;

WITH resolved AS (
  SELECT
    t.id AS table_id,
    COALESCE(
      (
        SELECT ob.id
        FROM public.open_bills ob
        WHERE ob."tableId" = t.id
        ORDER BY ob."timestamp" DESC, ob.id DESC
        LIMIT 1
      ),
      (
        SELECT ob.id
        FROM public.open_bills ob
        WHERE ob.id = NULLIF(t."orderData"->>'openBillId', '')
          AND (ob."tableId" IS NULL OR ob."tableId" = t.id)
        ORDER BY ob."timestamp" DESC, ob.id DESC
        LIMIT 1
      )
    ) AS bill_id
  FROM public.tables t
)
UPDATE public.tables t
SET
  open_bill_id = r.bill_id,
  "orderData" = CASE
    WHEN r.bill_id IS NOT NULL THEN jsonb_set(
      CASE
        WHEN jsonb_typeof(t."orderData") = 'object' THEN t."orderData"
        ELSE '{}'::jsonb
      END,
      '{openBillId}',
      to_jsonb(r.bill_id),
      true
    )
    WHEN jsonb_typeof(t."orderData") = 'object'
      AND t."orderData" ? 'openBillId'
      THEN t."orderData" - 'openBillId'
    ELSE t."orderData"
  END,
  status = CASE
    WHEN r.bill_id IS NOT NULL THEN 'occupied'
    WHEN t.status = 'occupied' THEN 'available'
    ELSE t.status
  END
FROM resolved r
WHERE t.id = r.table_id;

CREATE INDEX IF NOT EXISTS tables_open_bill_idx
  ON public.tables (open_bill_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_open_bill_id_fkey'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_open_bill_id_fkey
      FOREIGN KEY (open_bill_id)
      REFERENCES public.open_bills(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

COMMIT;
