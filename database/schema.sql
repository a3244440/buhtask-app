-- BuhTask Database Schema для PostgreSQL (Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum для типов пользователей
CREATE TYPE user_role AS ENUM ('client', 'accountant');
CREATE TYPE company_type AS ENUM ('IP', 'TOO');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_category AS ENUM (
  'tax_reporting',
  'salary',
  'registration',
  'audit',
  'consultation',
  'full_accounting',
  'other'
);

-- Таблица пользователей (расширение auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица профилей заказчиков (ИП/ТОО)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_type company_type NOT NULL,
  bin TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Астана',
  description TEXT
);

-- Таблица профилей бухгалтеров
CREATE TABLE public.accountants (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialization TEXT[],
  experience_years INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  completed_tasks INTEGER DEFAULT 0,
  description TEXT,
  verified BOOLEAN DEFAULT FALSE,
  education TEXT,
  certificates TEXT[],
  cities_served TEXT[] DEFAULT ARRAY['Астана']
);

-- Таблица задач
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category task_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget DECIMAL(12,2),
  deadline DATE,
  status task_status DEFAULT 'open',
  city TEXT DEFAULT 'Астана',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица откликов бухгалтеров на задачи
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL REFERENCES public.accountants(id) ON DELETE CASCADE,
  proposed_price DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  estimated_days INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, accountant_id)
);

-- Таблица заказов (принятых задач)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL REFERENCES public.accountants(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id),
  price DECIMAL(12,2) NOT NULL,
  commission DECIMAL(12,2) NOT NULL, -- 10% комиссия платформы
  status task_status DEFAULT 'in_progress',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Таблица платежей
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT DEFAULT 'kaspi', -- kaspi, card, bank_transfer
  transaction_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица отзывов и рейтингов
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL REFERENCES public.accountants(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Таблица чатов
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица сообщений
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_category ON public.tasks(category);
CREATE INDEX idx_proposals_task ON public.proposals(task_id);
CREATE INDEX idx_proposals_accountant ON public.proposals(accountant_id);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_accountant ON public.orders(accountant_id);
CREATE INDEX idx_reviews_accountant ON public.reviews(accountant_id);
CREATE INDEX idx_messages_chat ON public.messages(chat_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления рейтинга бухгалтера
CREATE OR REPLACE FUNCTION update_accountant_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.accountants
  SET
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.reviews
      WHERE accountant_id = NEW.accountant_id
    ),
    completed_tasks = (
      SELECT COUNT(*)
      FROM public.orders
      WHERE accountant_id = NEW.accountant_id AND status = 'completed'
    )
  WHERE id = NEW.accountant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_accountant_rating
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_accountant_rating();

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies для profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies для tasks
CREATE POLICY "Tasks are viewable by everyone"
  ON public.tasks FOR SELECT
  USING (true);

CREATE POLICY "Clients can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = client_id);

-- Policies для proposals
CREATE POLICY "Proposals viewable by task owner and proposal creator"
  ON public.proposals FOR SELECT
  USING (
    auth.uid() = accountant_id OR
    auth.uid() IN (SELECT client_id FROM public.tasks WHERE id = task_id)
  );

CREATE POLICY "Accountants can create proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (auth.uid() = accountant_id);
