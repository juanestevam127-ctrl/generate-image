import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://arxaqnwuyesmjcsyfmbj.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeGFxbnd1eWVzbWpjc3lmbWJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwNzEzOCwiZXhwIjoyMDcxNDgzMTM4fQ.TtZiQfzAnjgKhRuSOVDhK0O12HefNOHlrTlTgwneBGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTotalRows() {
  const { count, error } = await supabase
    .from('design_online_stories_veiculos')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(error);
    return;
  }

  console.log('=== TOTAL ROWS IN design_online_stories_veiculos ===');
  console.log(`Total count: ${count}`);

  const { data: sample, error: errSample } = await supabase
    .from('design_online_stories_veiculos')
    .select('id, nome_cliente, nome_veiculo, postado, rede_social')
    .order('created_at', { ascending: false })
    .limit(10);

  if (errSample) {
    console.error(errSample);
  } else {
    console.log('=== SAMPLE LATEST 10 ROWS ===');
    console.table(sample);
  }
}

checkTotalRows();
