-- Migration: Add timeline column to trips table
-- Run this on existing Supabase databases to support timeline persistence

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS timeline jsonb DEFAULT null;
