-- Создание таблиц для BuhTask

-- Основная таблица профилей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('client', 'accountant')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица клиентов (ИП/ТОО)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (company_type IN ('IP', 'TOO')),
  bin TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица бухгалтеров
CREATE TABLE IF NOT EXISTS accountants (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  specialization TEXT[],
  experience_years INTEGER,
  rating DECIMAL(2,1) DEFAULT 0.0,
  completed_tasks INTEGER DEFAULT 0,
  description TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица задач
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accountant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget DECIMAL(10,2),
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица откликов бухгалтеров
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

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_accountant_id ON tasks(accountant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_proposals_task_id ON task_proposals(task_id);
CREATE INDEX IF NOT EXISTS idx_task_proposals_accountant_id ON task_proposals(accountant_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_proposals ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Политики для clients
CREATE POLICY "Anyone can view client profiles" ON clients FOR SELECT USING (true);
CREATE POLICY "Clients can update own profile" ON clients FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Clients can insert own profile" ON clients FOR INSERT WITH CHECK (auth.uid() = id);

-- Политики для accountants
CREATE POLICY "Anyone can view accountant profiles" ON accountants FOR SELECT USING (true);
CREATE POLICY "Accountants can update own profile" ON accountants FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Accountants can insert own profile" ON accountants FOR INSERT WITH CHECK (auth.uid() = id);

-- Политики для tasks
CREATE POLICY "Anyone can view open tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Clients can create tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Assigned accountants can update task status" ON tasks FOR UPDATE USING (auth.uid() = accountant_id);

-- Политики для task_proposals
CREATE POLICY "Accountants can view own proposals" ON task_proposals FOR SELECT USING (auth.uid() = accountant_id);
CREATE POLICY "Clients can view proposals for their tasks" ON task_proposals FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_proposals.task_id AND tasks.client_id = auth.uid())
);
CREATE POLICY "Accountants can create proposals" ON task_proposals FOR INSERT WITH CHECK (auth.uid() = accountant_id);
CREATE POLICY "Clients can update proposal status" ON task_proposals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_proposals.task_id AND tasks.client_id = auth.uid())
);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
