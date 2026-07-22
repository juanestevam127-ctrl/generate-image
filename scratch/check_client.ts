import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://arxaqnwuyesmjcsyfmbj.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeGFxbnd1eWVzbWpjc3lmbWJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwNzEzOCwiZXhwIjoyMDcxNDgzMTM4fQ.TtZiQfzAnjgKhRuSOVDhK0O12HefNOHlrTlTgwneBGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFactorDetails() {
  const { data: posts, error } = await supabase
    .from('publicacoes_design_online')
    .select('id, nome_empresa, veiculo_gerado, data_agendamento, enviado_webhook, publicado')
    .ilike('veiculo_gerado', '%FACTOR%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  console.log('=== FACTOR POSTS CURRENT STATUS ===');
  console.table(posts);
}

checkFactorDetails();
