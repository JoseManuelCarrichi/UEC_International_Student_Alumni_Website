import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

//const supabaseUrl = window.env.SUPABASE_URL;
//const supabaseKey = window.env.SUPABASE_KEY;
const supabaseUrl = import.meta.env?.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env?.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and Key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseKey); 