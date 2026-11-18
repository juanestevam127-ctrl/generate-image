const {
  TABLE_SCHEMAS,
  getExistingTables,
  createTable,
  NOCO_URL,
  NOCO_TOKEN,
  supabase
} = require('./noco-schema');

async function insertRecords(tableId, records) {
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

async function getTableRowCount(tableId) {
  try {
    const res = await fetch(`${NOCO_URL}/api/v2/tables/${tableId}/records?limit=1`, {
      headers: { 'xc-token': NOCO_TOKEN }
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.pageInfo?.totalRows || 0;
  } catch (e) {
    return 0;
  }
}

async function migrateSmallTable(tableName, tableId, primaryKeyCol = 'id') {
  console.log(`\n--- Migrando ${tableName} ---`);
  const existingCount = await getTableRowCount(tableId);
  if (existingCount > 0) {
    console.log(`Tabela ${tableName} já possui ${existingCount} registros no NocoDB. Pulando inserção.`);
    return;
  }

  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`Erro ao buscar dados do Supabase (${tableName}):`, error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.log(`Tabela ${tableName} está vazia no Supabase.`);
    return;
  }

  console.log(`Lendo ${data.length} registros do Supabase...`);
  // Process in chunks of 50
  const chunkSize = 50;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    // Format JSON/Arrays to be safe if needed
    const cleanedChunk = chunk.map(row => {
      const clean = { ...row };
      Object.keys(clean).forEach(k => {
        // Se for string vazia em campo de JSON, transformar em null para não dar erro
        if (clean[k] === '') {
          if (k === 'json_stories' || k === 'json_feed' || k === 'columns' || k === 'layouts' || k === 'dados' || k === 'fotos' || k === 'design_state') {
            clean[k] = null;
          }
        } else if (typeof clean[k] === 'string' && (k === 'json_stories' || k === 'json_feed')) {
          try {
            clean[k] = JSON.parse(clean[k]);
          } catch (e) {
            clean[k] = null;
          }
        }
        if (clean[k] === undefined) clean[k] = null;
      });
      return clean;
    });

    await insertRecords(tableId, cleanedChunk);
    process.stdout.write(`Inseridos ${Math.min(i + chunkSize, data.length)} / ${data.length}\r`);
  }
  console.log(`\n✔ Sucesso: ${tableName} migrado com ${data.length} registros.`);
}

async function migratePublicacoesDesignOnline(tableId) {
  console.log(`\n--- Migrando publicacoes_design_online (~40.800 registros) ---`);
  const { count, error: countErr } = await supabase
    .from('publicacoes_design_online')
    .select('*', { count: 'exact', head: true });
  
  if (countErr) {
    console.error('Erro ao contar registros:', countErr.message);
    return;
  }
  console.log(`Total a migrar: ${count} registros.`);

  const batchSize = 250;
  let from = 0;
  let totalMigrated = 0;

  while (from < count) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from('publicacoes_design_online')
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`Erro na leitura do intervalo ${from}-${to}:`, error.message);
      // Retry once after 2s
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    if (!data || data.length === 0) break;

    const cleaned = data.map(row => {
      const clean = { ...row };
      if (clean.descricao && clean.descricao.length > 5000) {
        clean.descricao = clean.descricao.slice(0, 5000);
      }
      return clean;
    });

    try {
      await insertRecords(tableId, cleaned);
      totalMigrated += cleaned.length;
      process.stdout.write(`Migrados: ${totalMigrated} / ${count} (${((totalMigrated / count) * 100).toFixed(1)}%)\r`);
    } catch (err) {
      console.error(`\nErro inserindo lote ${from}-${to}:`, err.message);
      // Retry in smaller chunks of 50
      for (let j = 0; j < cleaned.length; j += 50) {
        const miniChunk = cleaned.slice(j, j + 50);
        await insertRecords(tableId, miniChunk);
      }
      totalMigrated += cleaned.length;
    }

    from += batchSize;
  }

  console.log(`\n✔ Concluída migração de publicacoes_design_online! Total: ${totalMigrated}`);
}

async function run() {
  console.log('=== ETAPA 1: VERIFICAR / CRIAR TABELAS NO NOCODB ===');
  let existingTables = await getExistingTables();
  console.log('Tabelas existentes no NocoDB:', Object.keys(existingTables));

  for (const schema of TABLE_SCHEMAS) {
    if (!existingTables[schema.table_name]) {
      console.log(`Criando tabela ${schema.table_name}...`);
      const id = await createTable(schema);
      existingTables[schema.table_name] = id;
      console.log(`✔ Tabela ${schema.table_name} criada (ID: ${id})`);
    } else {
      console.log(`Tabela ${schema.table_name} já existe.`);
    }
  }

  console.log('\n=== ETAPA 2: MIGRAÇÃO DOS DADOS (SUPABASE -> NOCODB) ===');
  
  // 1. Configuracoes gerais
  await migrateSmallTable('configuracoes_gerais', existingTables['configuracoes_gerais']);

  // 2. Token facebook
  await migrateSmallTable('token_facebook_juan', existingTables['token_facebook_juan']);

  // 3. Usuarios
  await migrateSmallTable('usuarios', existingTables['usuarios'], 'email');

  // 4. Controle relatorio melina
  await migrateSmallTable('controle_relatorio_melina', existingTables['controle_relatorio_melina']);

  // 5. Clientes
  await migrateSmallTable('clientes', existingTables['clientes']);

  // 6. Clientes vendidos
  await migrateSmallTable('clientes_vendidos', existingTables['clientes_vendidos']);

  // 7. VeiculoOperador
  await migrateSmallTable('VeiculoOperador', existingTables['VeiculoOperador']);

  // 8. publicacoes_design_online
  await migratePublicacoesDesignOnline(existingTables['publicacoes_design_online']);

  console.log('\n=== ETAPA 3: CONFERÊNCIA FINAL DOS DADOS ===');
  for (const schema of TABLE_SCHEMAS) {
    const tName = schema.table_name;
    const tId = existingTables[tName];

    const { count: sbCount } = await supabase.from(tName).select('*', { count: 'exact', head: true });
    
    const nocoRes = await fetch(`${NOCO_URL}/api/v2/tables/${tId}/records/count`, {
      headers: { 'xc-token': NOCO_TOKEN }
    });
    let nocoCount = 0;
    if (nocoRes.ok) {
      const cData = await nocoRes.json();
      nocoCount = cData.count !== undefined ? cData.count : cData;
    } else {
      // Fallback read limit 1 with total
      const fRes = await fetch(`${NOCO_URL}/api/v2/tables/${tId}/records?limit=1`, {
        headers: { 'xc-token': NOCO_TOKEN }
      });
      const fData = await fRes.json();
      nocoCount = fData.pageInfo?.totalRows || 0;
    }

    console.log(`Tabela [${tName}]: Supabase = ${sbCount} | NocoDB = ${nocoCount} ${sbCount === nocoCount ? '✔ (100% IGUAL)' : '⚠️'}`);
  }

  console.log('\n🚀 MIGRAÇÃO FINALIZADA COM SUCESSO!');
}

run().catch(err => {
  console.error('\n❌ Erro fatal durante a migração:', err);
  process.exit(1);
});
