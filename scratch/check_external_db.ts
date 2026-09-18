import { createClient } from '@supabase/supabase-js';

const externalSupabase = createClient(
  'https://zkakyywtnfldnlrgjqoj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWt5eXd0bmZsZG5scmdqcW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY1NTMyNSwiZXhwIjoyMTA1MjMxMzI1fQ.30M_66nNkHASw8WxdlT1OKuMjC-1Yu4AtUZmn73Eb0I'
);

async function main() {
  // Check table columns first
  const { data, error } = await externalSupabase
    .from('Veiculo')
    .select('*')
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== Columns available ===');
  if (data && data[0]) {
    console.log('Keys:', Object.keys(data[0]));
    console.log('\n=== Sample row (non-observacoes fields) ===');
    const { observacoes, ...rest } = data[0];
    console.log(rest);
    console.log('\n=== observacoes field structure ===');
    console.log(JSON.stringify(JSON.parse(typeof observacoes === 'string' ? observacoes : JSON.stringify(observacoes)), null, 2).substring(0, 2000));
  }
}

main();
