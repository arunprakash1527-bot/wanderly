-- Add missing columns to trips table for start_location, budget, and summary
-- These fields exist in the app code but were missing from the DB schema,
-- causing silent fallback to minimal insert (losing the data).

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS start_location text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS budget text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS summary text;
