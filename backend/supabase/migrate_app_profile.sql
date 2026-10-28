-- Create the profile table used by GET/PUT /api/app-profile.
-- Safe to run more than once.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_profile (
  id              integer PRIMARY KEY CHECK (id = 1),
  app_name        text NOT NULL DEFAULT '',
  logo_url        text NOT NULL DEFAULT '',
  address         text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  additional_info text NOT NULL DEFAULT '',
  "printerDapur"  text NOT NULL DEFAULT '',
  "printerKasir"  text NOT NULL DEFAULT '',
  "cetakOtomatis" boolean NOT NULL DEFAULT false
);

ALTER TABLE public.app_profile
  ADD COLUMN IF NOT EXISTS app_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS additional_info text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "printerDapur" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "printerKasir" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "cetakOtomatis" boolean NOT NULL DEFAULT false;

ALTER TABLE public.app_profile ENABLE ROW LEVEL SECURITY;

COMMIT;
