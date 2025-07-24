import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = window.env.SUPABASE_URL;
const supabaseKey = window.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and Key are required. Make sure you have a js/env.js file with your credentials.');
}

export const supabase = createClient(supabaseUrl, supabaseKey); 