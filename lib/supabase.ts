import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'client' | 'accountant' | 'admin';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  phone: string;
  role: UserRole;
  bio?: string;
  city?: string;
  bin?: string;
  rating: number;
  is_banned: boolean;
  created_at: string;
  avatar_url?: string;
  experience_years?: number;
  specialization?: string[];
  languages?: string[];
  work_format?: string;
  min_price?: number;
  availability?: 'free' | 'busy' | 'vacation';
  completed_tasks: number;
  verification_status: 'not_verified' | 'pending' | 'verified';
  last_login?: string;
}

export interface AccountantProfile extends UserProfile {
  role: 'accountant';
  specialization: string[];
  experience_years: number;
  bio: string;
  min_price: number;
}

export interface ClientProfile extends UserProfile {
  role: 'client';
  bin: string;
}
