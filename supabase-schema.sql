-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'accountant', 'admin')),
  bio TEXT,
  city TEXT,
  bin TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  avatar_url TEXT,
  experience_years INTEGER,
  specialization TEXT[],
  min_price DECIMAL(10,2),
  availability TEXT DEFAULT 'free' CHECK (availability IN ('free', 'busy', 'vacation')),
  completed_tasks INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'not_verified' CHECK (verification_status IN ('not_verified', 'pending', 'verified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accountant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget DECIMAL(10,2),
  city TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task proposals
CREATE TABLE IF NOT EXISTS task_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  proposed_price DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, accountant_id)
);

-- Add missing columns if they don't exist (run these separately if table exists)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "tasks_select" ON tasks FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY IF NOT EXISTS "tasks_update" ON tasks FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY IF NOT EXISTS "proposals_select" ON task_proposals FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "proposals_insert" ON task_proposals FOR INSERT WITH CHECK (auth.uid() = accountant_id);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
