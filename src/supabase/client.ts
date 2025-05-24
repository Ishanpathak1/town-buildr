import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add this at the bottom of your client.ts file
console.log('Supabase client initialized with URL:', import.meta.env.VITE_SUPABASE_URL ? 'URL configured' : 'URL missing'); 