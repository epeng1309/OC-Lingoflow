import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fcjekyyjpkmazejqszti.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tGWuFoXhOfQ_hRtSyJfphg_I7ENvGn-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
