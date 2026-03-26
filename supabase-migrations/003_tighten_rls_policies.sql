-- ============================================
-- Migration 003: Tighten RLS Policies
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================
--
-- WHAT THIS DOES:
-- Currently every table has SELECT USING (true), meaning any logged-in user
-- can read ALL trips, messages, expenses, photos etc. Migration 002 also
-- has FOR ALL USING (true) on messages/expenses/expense_splits, meaning
-- any user can INSERT/UPDATE/DELETE anyone's data.
--
-- This migration scopes everything to trip members only:
--   - Trip lead (organiser)
--   - Claimed travellers (people who joined via share link)
--
-- The share-link function (get_trip_by_share_code) uses SECURITY DEFINER
-- so it bypasses RLS and continues to work.
--
-- ============================================
-- HOW TO RUN:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your Wanderly project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "+ New Query"
-- 5. Paste this entire file
-- 6. Click "Run" (or Cmd+Enter)
-- 7. You should see "Success. No rows returned"
-- 8. Test: open the app, check trips load, share links work, expenses work
-- ============================================


-- ────────────────────────────────────────────
-- HELPER: Create a function to check trip membership
-- This avoids repeating the same subquery everywhere
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_trip_member(check_trip_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = check_trip_id AND lead_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_travellers
    WHERE trip_id = check_trip_id AND user_id = auth.uid() AND is_claimed = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ────────────────────────────────────────────
-- 1. TRIPS — scope SELECT to members
-- ────────────────────────────────────────────

-- Drop the old open policy
DROP POLICY IF EXISTS "Trips viewable by all" ON public.trips;

-- New: only trip lead or claimed travellers can see the trip
CREATE POLICY "Trips viewable by members" ON public.trips
  FOR SELECT USING (
    lead_user_id = auth.uid()
    OR id IN (
      SELECT trip_id FROM public.trip_travellers
      WHERE user_id = auth.uid() AND is_claimed = true
    )
  );


-- ────────────────────────────────────────────
-- 2. TRIP_TRAVELLERS — scope SELECT to members
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Travellers viewable by all" ON public.trip_travellers;

CREATE POLICY "Travellers viewable by members" ON public.trip_travellers
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );


-- ────────────────────────────────────────────
-- 3. TRIP_STAYS — scope SELECT to members
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Stays viewable" ON public.trip_stays;

CREATE POLICY "Stays viewable by members" ON public.trip_stays
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );


-- ────────────────────────────────────────────
-- 4. TRIP_PREFERENCES — scope SELECT to members
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Prefs viewable" ON public.trip_preferences;

CREATE POLICY "Prefs viewable by members" ON public.trip_preferences
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );


-- ────────────────────────────────────────────
-- 5. TIMELINE_ITEMS — scope SELECT to members
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Timeline viewable" ON public.timeline_items;

CREATE POLICY "Timeline viewable by members" ON public.timeline_items
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );


-- ────────────────────────────────────────────
-- 6. MESSAGES — replace FOR ALL with scoped policies
-- ────────────────────────────────────────────

-- Drop the dangerous open policy from migration 002
DROP POLICY IF EXISTS "Messages are accessible by all" ON public.messages;
-- Also drop the v2 schema policies if they exist
DROP POLICY IF EXISTS "Messages viewable" ON public.messages;
DROP POLICY IF EXISTS "Messages insertable by auth" ON public.messages;

-- New scoped policies
CREATE POLICY "Messages viewable by members" ON public.messages
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );

CREATE POLICY "Messages insertable by members" ON public.messages
  FOR INSERT WITH CHECK (
    public.is_trip_member(trip_id)
  );

-- No UPDATE/DELETE on messages (chat messages are immutable)


-- ────────────────────────────────────────────
-- 7. EXPENSES — replace FOR ALL with scoped policies
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Expenses are accessible by all" ON public.expenses;

CREATE POLICY "Expenses viewable by members" ON public.expenses
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );

CREATE POLICY "Expenses insertable by members" ON public.expenses
  FOR INSERT WITH CHECK (
    public.is_trip_member(trip_id)
  );

CREATE POLICY "Expenses updatable by members" ON public.expenses
  FOR UPDATE USING (
    public.is_trip_member(trip_id)
  );

CREATE POLICY "Expenses deletable by creator" ON public.expenses
  FOR DELETE USING (
    -- Only the person who created the expense can delete it
    created_by = (SELECT name FROM public.profiles WHERE id = auth.uid())
    OR trip_id IN (SELECT id FROM public.trips WHERE lead_user_id = auth.uid())
  );


-- ────────────────────────────────────────────
-- 8. EXPENSE_SPLITS — replace FOR ALL with scoped policies
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Splits are accessible by all" ON public.expense_splits;

CREATE POLICY "Splits viewable by members" ON public.expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE public.is_trip_member(trip_id)
    )
  );

CREATE POLICY "Splits insertable by members" ON public.expense_splits
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT id FROM public.expenses WHERE public.is_trip_member(trip_id)
    )
  );

CREATE POLICY "Splits updatable by members" ON public.expense_splits
  FOR UPDATE USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE public.is_trip_member(trip_id)
    )
  );

CREATE POLICY "Splits deletable by members" ON public.expense_splits
  FOR DELETE USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE public.is_trip_member(trip_id)
    )
  );


-- ────────────────────────────────────────────
-- 9. PHOTOS — scope SELECT to members
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Photos viewable" ON public.photos;

CREATE POLICY "Photos viewable by members" ON public.photos
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );


-- ────────────────────────────────────────────
-- 10. POLLS — scope SELECT to members
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Polls viewable" ON public.polls;

CREATE POLICY "Polls viewable by members" ON public.polls
  FOR SELECT USING (
    public.is_trip_member(trip_id)
  );


-- ────────────────────────────────────────────
-- 11. POLL_VOTES — scope SELECT to members
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "Votes viewable" ON public.poll_votes;

CREATE POLICY "Votes viewable by members" ON public.poll_votes
  FOR SELECT USING (
    poll_id IN (
      SELECT id FROM public.polls WHERE public.is_trip_member(trip_id)
    )
  );


-- ────────────────────────────────────────────
-- 12. PROFILES — keep public (needed for name display)
-- ────────────────────────────────────────────
-- Profiles SELECT stays as USING (true) intentionally.
-- Users need to see each other's names/avatars in shared trips.
-- No sensitive data is stored in profiles (no passwords, no tokens).


-- ────────────────────────────────────────────
-- DONE
-- ────────────────────────────────────────────
-- Verify by running:
--   SELECT tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, cmd;
