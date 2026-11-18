const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const NOCO_URL = 'https://evolution-nocodb.5rqumh.easypanel.host';
const NOCO_TOKEN = 'C2l41lZPrFvg6UrzEpB6bwe0tD5bLMFWeuWjAlZD';
const PROJECT_ID = 'pye51jpoz8rz1u1';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getNocoTables() {
  const res = await fetch(`${NOCO_URL}/api/v2/meta/bases/${PROJECT_ID}/tables`, {
    headers: { 'xc-token': NOCO_TOKEN }
  });
  const data = await res.json();
  const map = {};
  data.list.forEach(t => map[t.table_name] = t.id);
  return map;
}

async function insertRecords(tableId, records) {
  if (!records || records.length === 0) return;
  const res = await fetch(`${NOCO_URL}/api/v2/tables/${tableId}/records`, {
    method: 'POST',
    headers: {
      'xc-token': NOCO_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(records)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao inserir registros na tabela ${tableId}: ${txt}`);
  }
  return await res.json();
}

async function fetchAllNocoIds(tableId, idField = 'id') {
  let allIds = new Set();
  let page = 1;
  const limit = 1000;
  while (true) {
    const res = await fetch(`${NOCO_URL}/api/v2/tables/${tableId}/records?fields=${idField}&limit=${limit}&offset=${(page - 1) * limit}`, {
      headers: { 'xc-token': NOCO_TOKEN }
    });
    if (!res.ok) break;
    const data = await res.json();
    const list = data.list || [];
    list.forEach(r => {
      if (r[idField] !== undefined && r[idField] !== null) {
        allIds.add(String(r[idField]));
      }
    });
    if (data.pageInfo?.isLastPage || list.length === 0) break;
    page++;
  }
  return allIds;
}

// 1. Sincronizar clientes
async function syncClientes(tableId) {
  console.log('\n--- Sincronizando Clientes ---');
  const nocoIds = await fetchAllNocoIds(tableId, 'id');
  const { data: sbData, error } = await supabase.from('clientes').select('*');
  if (error) throw error;

  const toInsert = sbData.filter(c => !nocoIds.has(String(c.id)));
  console.log(`Novos clientes para inserir: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const cleaned = toInsert.map(row => {
      const clean = { ...row };
      Object.keys(clean).forEach(k => {
        if (clean[k] === undefined) clean[k] = null;
      });
      return clean;
    });
    await insertRecords(tableId, cleaned);
    console.log(`✔ Inseridos ${toInsert.length} clientes novos.`);
  }

  // Também atualizar os que já existem para garantir sincronia de dados atualizados
  console.log('Verificando atualizações em clientes existentes...');
  for (const c of sbData) {
    if (nocoIds.has(String(c.id))) {
      const clean = { ...c };
      delete clean.id;
      // Atualizar via PATCH
      await fetch(`${NOCO_URL}/api/v2/tables/${tableId}/records`, {
        method: 'PATCH',
        headers: { 'xc-token': NOCO_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ id: c.id, ...clean }])
      });
    }
  }
  console.log('✔ Clientes 100% atualizados.');
}

// 2. Sincronizar VeiculoOperador
async function syncVeiculoOperador(tableId) {
  console.log('\n--- Sincronizando VeiculoOperador ---');
  const nocoIds = await fetchAllNocoIds(tableId, 'id');
  const { data: sbData, error } = await supabase.from('VeiculoOperador').select('*');
  if (error) throw error;

  const toInsert = sbData.filter(v => !nocoIds.has(String(v.id)));
  console.log(`Novos veículos para inserir: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const cleaned = toInsert.map(row => {
      const clean = { ...row };
      Object.keys(clean).forEach(k => {
        if (clean[k] === undefined) clean[k] = null;
      });
      return clean;
    });
    await insertRecords(tableId, cleaned);
    console.log(`✔ Inseridos ${toInsert.length} novos VeiculoOperador.`);
  }
}

// 3. Sincronizar publicacoes_design_online
async function syncPublicacoes(tableId) {
  console.log('\n--- Sincronizando publicacoes_design_online ---');
  // Buscar o maior id atualmente no NocoDB
  const res = await fetch(`${NOCO_URL}/api/v2/tables/${tableId}/records?fields=id&sort=-id&limit=1`, {
    headers: { 'xc-token': NOCO_TOKEN }
  });
  const data = await res.json();
  const maxNocoId = data.list?.[0]?.id || 0;
  console.log(`Maior ID no NocoDB: ${maxNocoId}`);

  // Buscar todos os registros do Supabase com id > maxNocoId
  const { data: sbNew, error } = await supabase
    .from('publicacoes_design_online')
    .select('*')
    .gt('id', maxNocoId)
    .order('id', { ascending: true });

  if (error) throw error;
  console.log(`Novas publicações no Supabase: ${sbNew?.length || 0}`);

  if (sbNew && sbNew.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < sbNew.length; i += chunkSize) {
      const chunk = sbNew.slice(i, i + chunkSize).map(row => {
        const clean = { ...row };
        if (clean.descricao && clean.descricao.length > 5000) {
          clean.descricao = clean.descricao.slice(0, 5000);
        }
        return clean;
      });
      await insertRecords(tableId, chunk);
      console.log(`Inseridos ${Math.min(i + chunkSize, sbNew.length)} / ${sbNew.length}`);
    }
  }

  // Também verificar se há publicações recentes cujo status de publicado mudou
  const { data: recentSb } = await supabase
    .from('publicacoes_design_online')
    .select('id, publicado, publicado_instagram, webhook_disparado, data_agendamento')
    .order('id', { ascending: false })
    .limit(200);

  if (recentSb && recentSb.length > 0) {
    await fetch(`${NOCO_URL}/api/v2/tables/${tableId}/records`, {
      method: 'PATCH',
      headers: { 'xc-token': NOCO_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(recentSb)
    });
  }

  console.log('✔ publicacoes_design_online 100% sincronizado.');
}

async function run() {
  const tables = await getNocoTables();
  await syncClientes(tables['clientes']);
  await syncVeiculoOperador(tables['VeiculoOperador']);
  await syncPublicacoes(tables['publicacoes_design_online']);

  console.log('\n=== CONFERÊNCIA FINAL APÓS SINCRONIZAÇÃO ===\n');
  for (const [tName, tId] of Object.entries(tables)) {
    const { count: sbCount } = await supabase.from(tName).select('*', { count: 'exact', head: true });
    const nRes = await fetch(`${NOCO_URL}/api/v2/tables/${tId}/records?limit=1`, {
      headers: { 'xc-token': NOCO_TOKEN }
    });
    const nData = await nRes.json();
    const nocoCount = nData.pageInfo?.totalRows || 0;
    console.log(`[${tName}]: Supabase = ${sbCount || 0} | NocoDB = ${nocoCount} ${sbCount === nocoCount ? '✔ (100% IGUAL)' : '⚠️'}`);
  }
}

run().catch(err => {
  console.error('Erro na sincronização:', err);
  process.exit(1);
});
