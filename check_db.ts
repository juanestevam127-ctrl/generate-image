import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data: v } = await supabase.from('VeiculoOperador').select('*').ilike('dados->>Nome do Veiculo', '%15190%');
    console.log("Veiculos found:", v);
    
    if (v && v.length > 0) {
        const clientId = v[0].clienteId;
        const { data: c } = await supabase.from('clientes').select('name, webhook_url, clickup_tarefa_id').eq('id', clientId);
        console.log("Client in DB:", c);
    }
}
check();
