-- Migration 005: Add expense_date column to expenses table
-- The app has been inserting expense_date but the column didn't exist,
-- causing all expense inserts to silently fail (400 from PostgREST).

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS expense_date DATE;

-- Backfill existing rows: use created_at date as the expense_date
UPDATE public.expenses
SET expense_date = created_at::date
WHERE expense_date IS NULL;
