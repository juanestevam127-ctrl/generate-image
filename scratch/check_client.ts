
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClient() {
  const { data, error } = await supabase
    .from('clientes_vendidos')
    .select('*')
    .eq('name', 'NASSAR MOTORS')
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    return;
  }

  console.log('Client Data:', JSON.stringify(data, null, 2));
}

checkClient();
