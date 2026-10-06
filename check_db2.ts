import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data: c } = await supabase.from('clientes').select('name, webhook_url, clickup_tarefa_id').eq('id', '9b778812-a68d-4424-b927-1bb58c82b218');
    console.log("Client 2 in DB:", c);
}
check();
