import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

// Supabase новых версий использует PUBLISHABLE_KEY вместо ANON_KEY
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
  min_price?: number;
  availability?: 'free' | 'busy' | 'vacation';
  completed_tasks: number;
  verification_status: 'not_verified' | 'pending' | 'verified';
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
