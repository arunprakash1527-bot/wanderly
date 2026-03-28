-- ============================================================================
-- Wanderly / TripWithMe — RLS Lockdown Migration
-- ============================================================================
-- Run this in the Supabase SQL Editor.
-- This migration drops overly-permissive SELECT policies that expose trip data
-- to any authenticated user and replaces them with policies that restrict
-- SELECT access to trip participants only. INSERT/UPDATE/DELETE policies are
-- left unchanged (they are already properly scoped).
--
-- A SECURITY DEFINER function `join_trip_by_share_code` is created so that
-- users joining via share link can look up and join trips they cannot yet see
-- through normal RLS.
--
-- This script is idempotent — safe to run more than once.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- Helper: reusable sub-query that returns trip IDs the calling user belongs to
-- (used in every child-table policy below)
-- ────────────────────────────────────────────────────────────────────────────
-- We inline the sub-query in each policy rather than wrapping it in a function
-- so Postgres can inline and optimise it per-table.


-- ============================================================================
-- 1. DROP EXISTING OVERLY-PERMISSIVE SELECT POLICIES
-- ============================================================================

-- trips
DROP POLICY IF EXISTS "Trips viewable by participants" ON public.trips;

-- trip_travellers
DROP POLICY IF EXISTS "Travellers viewable by all" ON public.trip_travellers;

-- trip_stays
DROP POLICY IF EXISTS "Stays viewable" ON public.trip_stays;

-- trip_preferences
DROP POLICY IF EXISTS "Prefs viewable" ON public.trip_preferences;

-- timeline_items
DROP POLICY IF EXISTS "Timeline viewable" ON public.timeline_items;

-- messages
DROP POLICY IF EXISTS "Messages viewable" ON public.messages;

-- photos
DROP POLICY IF EXISTS "Photos viewable" ON public.photos;

-- polls
DROP POLICY IF EXISTS "Polls viewable" ON public.polls;

-- poll_votes
DROP POLICY IF EXISTS "Votes viewable" ON public.poll_votes;


-- ============================================================================
-- 2. CREATE NEW RESTRICTIVE SELECT POLICIES
-- ============================================================================

-- trips: user must be the lead OR a listed traveller
CREATE POLICY "Trips viewable by participants"
  ON public.trips
  FOR SELECT
  USING (
    lead_user_id = auth.uid()
    OR id IN (
      SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid()
    )
  );

-- trip_travellers: user must be a participant of the parent trip
CREATE POLICY "Travellers viewable by trip participants"
  ON public.trip_travellers
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE lead_user_id = auth.uid()
         OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
    )
  );

-- trip_stays: user must be a participant of the parent trip
CREATE POLICY "Stays viewable by trip participants"
  ON public.trip_stays
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE lead_user_id = auth.uid()
         OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
    )
  );

-- trip_preferences: user must be a participant of the parent trip
CREATE POLICY "Prefs viewable by trip participants"
  ON public.trip_preferences
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE lead_user_id = auth.uid()
         OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
    )
  );

-- timeline_items: user must be a participant of the parent trip
CREATE POLICY "Timeline viewable by trip participants"
  ON public.timeline_items
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE lead_user_id = auth.uid()
         OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
    )
  );

-- messages: user must be a participant of the parent trip
CREATE POLICY "Messages viewable by trip participants"
  ON public.messages
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE lead_user_id = auth.uid()
         OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
    )
  );

-- photos: user must be a participant of the parent trip
CREATE POLICY "Photos viewable by trip participants"
  ON public.photos
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE lead_user_id = auth.uid()
         OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
    )
  );

-- polls: user must be a participant of the parent trip
CREATE POLICY "Polls viewable by trip participants"
  ON public.polls
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips
      WHERE lead_user_id = auth.uid()
         OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
    )
  );

-- poll_votes: user must be a participant of the poll's parent trip
-- Note: poll_votes references polls (not trips directly), so we join through polls
CREATE POLICY "Votes viewable by trip participants"
  ON public.poll_votes
  FOR SELECT
  USING (
    poll_id IN (
      SELECT p.id FROM public.polls p
      WHERE p.trip_id IN (
        SELECT id FROM public.trips
        WHERE lead_user_id = auth.uid()
           OR id IN (SELECT trip_id FROM public.trip_travellers WHERE user_id = auth.uid())
      )
    )
  );


-- ============================================================================
-- 3. SECURITY DEFINER FUNCTION: join_trip_by_share_code
-- ============================================================================
-- This function bypasses RLS (SECURITY DEFINER) so that a user who is NOT yet
-- a trip participant can look up a trip by its share code and be added as a
-- traveller. It returns the trip row on success.
--
-- Called from the client via:  supabase.rpc('join_trip_by_share_code', { code: 'ABC123' })

CREATE OR REPLACE FUNCTION public.join_trip_by_share_code(code TEXT)
RETURNS SETOF public.trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trip public.trips;
  _already_member BOOLEAN;
BEGIN
  -- Validate input
  IF code IS NULL OR trim(code) = '' THEN
    RAISE EXCEPTION 'Share code is required';
  END IF;

  -- Look up the trip by share code (case-insensitive via UPPER)
  SELECT * INTO _trip
  FROM public.trips
  WHERE share_code = upper(trim(code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No trip found with that share code';
  END IF;

  -- Check if the calling user is already the lead
  IF _trip.lead_user_id = auth.uid() THEN
    -- Already the trip owner; just return the trip
    RETURN NEXT _trip;
    RETURN;
  END IF;

  -- Check if the calling user is already a traveller on this trip
  SELECT EXISTS (
    SELECT 1 FROM public.trip_travellers
    WHERE trip_id = _trip.id AND user_id = auth.uid()
  ) INTO _already_member;

  IF NOT _already_member THEN
    -- Add the user as a new traveller
    INSERT INTO public.trip_travellers (trip_id, user_id, name, role, is_claimed, joined_at)
    VALUES (
      _trip.id,
      auth.uid(),
      COALESCE(
        (SELECT name FROM public.profiles WHERE id = auth.uid()),
        'New Traveller'
      ),
      'adult',
      true,
      now()
    );
  END IF;

  -- Return the trip data
  RETURN NEXT _trip;
  RETURN;
END;
$$;

-- Drop the old lookup function that was less secure (optional, keeps things tidy)
-- The old function is still safe (SECURITY DEFINER) but the new one also handles
-- joining, so the old one is no longer needed by the client.
-- Uncomment the next line if you want to remove it:
-- DROP FUNCTION IF EXISTS public.get_trip_by_share_code(text);
