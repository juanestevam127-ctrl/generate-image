import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://arxaqnwuyesmjcsyfmbj.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeGFxbnd1eWVzbWpjc3lmbWJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwNzEzOCwiZXhwIjoyMDcxNDgzMTM4fQ.TtZiQfzAnjgKhRuSOVDhK0O12HefNOHlrTlTgwneBGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTiggo() {
  const { data, error } = await supabase
    .from('publicacoes_design_online')
    .select('id, nome_empresa, veiculo_gerado, data_agendamento, publicado, publicado_instagram')
    .eq('id', 23778)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  console.log('=== TIGGO 5X PRO 2024 CINZA STATE IN DB ===');
  console.log(data);
}

checkTiggo();
