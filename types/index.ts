export interface Task {
  id: string;
  client_id: string;
  category: TaskCategory;
  title: string;
  description: string;
  budget?: number;
  deadline?: string;
  status: TaskStatus;
  city: string;
  created_at: string;
  updated_at: string;
}

export type TaskCategory =
  | 'tax_reporting'
  | 'salary'
  | 'registration'
  | 'audit'
  | 'consultation'
  | 'full_accounting'
  | 'other';

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface Proposal {
  id: string;
  task_id: string;
  accountant_id: string;
  proposed_price: number;
  description: string;
  estimated_days?: number;
  status: string;
  created_at: string;
}

export interface Order {
  id: string;
  task_id: string;
  client_id: string;
  accountant_id: string;
  proposal_id?: string;
  price: number;
  commission: number;
  status: TaskStatus;
  started_at: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface Review {
  id: string;
  order_id: string;
  client_id: string;
  accountant_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export const TASK_CATEGORIES = {
  tax_reporting: 'Налоговая отчётность',
  salary: 'Расчёт зарплаты',
  registration: 'Регистрация ИП/ТОО',
  audit: 'Аудит',
  consultation: 'Консультация',
  full_accounting: 'Ведение бухгалтерии',
  other: 'Другое'
} as const;

export const CITIES = [
  'Астана',
  'Алматы',
  'Шымкент',
  'Караганда',
  'Актобе',
  'Тараз',
  'Павлодар',
  'Усть-Каменогорск',
  'Семей',
  'Атырау',
  'Костанай',
  'Кызылорда',
  'Уральск',
  'Петропавловск',
  'Актау'
] as const;
