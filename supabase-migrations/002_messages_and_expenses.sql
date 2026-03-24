-- ============================================
-- Migration: Chat Messages + Expense Tracking
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Messages table (chat persistence)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'You',
  sender_role TEXT NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'ai')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_trip_id ON messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages are accessible by all" ON messages FOR ALL USING (true);

-- 2. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'food', 'travel', 'charging', 'entertainment',
    'accommodation', 'activities', 'other'
  )),
  paid_by TEXT NOT NULL,
  split_method TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'percentage', 'custom')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Expenses are accessible by all" ON expenses FOR ALL USING (true);

-- 3. Expense splits table
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  share_amount NUMERIC(10,2) NOT NULL,
  share_percentage NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Splits are accessible by all" ON expense_splits FOR ALL USING (true);

-- 4. Enable Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
