import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.warn(`[Warning] Missing required Supabase environment variables for storage. File uploads will fail.`);
}

// Client for general operations
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null as any;

// Admin client with service role for privileged operations
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null as any;

export default supabase;
