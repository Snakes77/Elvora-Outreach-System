import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// This admin client bypasses RLS policies and must ONLY be used in secure 
// server environments (API routes, Webhooks, Server Actions).
// Note: Initializing with empty strings will fail during build data collection, 
// so we only initialize if we have the values.
export const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null as any; // Cast as any to allow usage, will fail at runtime if null but pass build
