-- ============================================================================
-- Migration 004: Shared Pinboard (pins table)
-- Run this in Supabase Dashboard > SQL Editor
-- This creates the pins table for the shared pinboard feature, enabling
-- trip members to save links, notes, and photos to a collaborative board.
-- ============================================================================

-- 1. Create the pins table
CREATE TABLE pins (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES profiles(id),
  type        text        NOT NULL CHECK (type IN ('link', 'note', 'photo')),
  title       text,
  content     text,       -- for notes: the text content; for links: the description
  url         text,       -- for links
  image_url   text,       -- preview image for links, or uploaded photo URL
  reactions   jsonb       DEFAULT '{}'::jsonb,  -- e.g. {"user_id_1": "thumbs-up", "user_id_2": "heart"}
  added_by_name text,     -- display name of who added the pin
  created_at  timestamptz DEFAULT now()
);

-- 2. Index on trip_id for fast lookups when loading a trip's pinboard
CREATE INDEX idx_pins_trip_id ON pins (trip_id);

-- 3. Enable Row Level Security
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies scoped to trip members via public.is_trip_member()

-- SELECT: only trip members can view pins
CREATE POLICY "Trip members can view pins"
  ON pins FOR SELECT
  USING (public.is_trip_member(trip_id));

-- INSERT: only trip members can add pins
CREATE POLICY "Trip members can insert pins"
  ON pins FOR INSERT
  WITH CHECK (public.is_trip_member(trip_id));

-- UPDATE: only trip members can update pins (e.g. adding reactions)
CREATE POLICY "Trip members can update pins"
  ON pins FOR UPDATE
  USING (public.is_trip_member(trip_id));

-- DELETE: only the pin creator or the trip lead can delete a pin
CREATE POLICY "Pin creator or trip lead can delete pins"
  ON pins FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = pins.trip_id
        AND trips.lead_user_id = auth.uid()
    )
  );

-- 5. Add to realtime publication so clients receive live updates
ALTER PUBLICATION supabase_realtime ADD TABLE pins;
