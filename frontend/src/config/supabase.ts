import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseAuth = isSupabaseAuthConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: 'implicit',
        },
    })
    : null;

