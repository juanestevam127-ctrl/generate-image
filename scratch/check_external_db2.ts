import { createClient } from '@supabase/supabase-js';

const externalSupabase = createClient(
  'https://zkakyywtnfldnlrgjqoj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWt5eXd0bmZsZG5scmdqcW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY1NTMyNSwiZXhwIjoyMTA1MjMxMzI1fQ.30M_66nNkHASw8WxdlT1OKuMjC-1Yu4AtUZmn73Eb0I'
);

async function main() {
  const { data, error } = await externalSupabase
    .from('Veiculo')
    .select('*')
    .limit(1);

  if (error || !data || !data[0]) return;

  const obs = data[0].observacoes;
  const parsedObs = typeof obs === 'string' ? JSON.parse(obs) : obs;
  console.log(JSON.stringify(parsedObs.geradorPayloads, null, 2));
}

main();
