const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const NOCO_URL = 'https://evolution-nocodb.5rqumh.easypanel.host';
const NOCO_TOKEN = 'C2l41lZPrFvg6UrzEpB6bwe0tD5bLMFWeuWjAlZD';
const PROJECT_ID = 'pye51jpoz8rz1u1';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Definition of tables to create
const TABLE_SCHEMAS = [
  {
    table_name: 'configuracoes_gerais',
    title: 'configuracoes_gerais',
    columns: [
      { column_name: 'id', title: 'id', uidt: 'Number', pk: true },
      { column_name: 'servidor_url', title: 'servidor_url', uidt: 'LongText' },
      { column_name: 'bucket_nome', title: 'bucket_nome', uidt: 'SingleLineText' },
      { column_name: 'pasta_nome', title: 'pasta_nome', uidt: 'SingleLineText' },
      { column_name: 'token', title: 'token', uidt: 'LongText' },
      { column_name: 'updated_at', title: 'updated_at', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'token_facebook_juan',
    title: 'token_facebook_juan',
    columns: [
      { column_name: 'id', title: 'id', uidt: 'Number', pk: true },
      { column_name: 'token_facebook', title: 'token_facebook', uidt: 'LongText' },
      { column_name: 'app_id', title: 'app_id', uidt: 'SingleLineText' },
      { column_name: 'app_secret', title: 'app_secret', uidt: 'SingleLineText' },
      { column_name: 'created_at', title: 'created_at', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'usuarios',
    title: 'usuarios',
    columns: [
      { column_name: 'email', title: 'email', uidt: 'Email', pk: true },
      { column_name: 'password', title: 'password', uidt: 'SingleLineText' },
      { column_name: 'role', title: 'role', uidt: 'SingleLineText' },
      { column_name: 'name', title: 'name', uidt: 'SingleLineText' },
      { column_name: 'created_at', title: 'created_at', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'controle_relatorio_melina',
    title: 'controle_relatorio_melina',
    columns: [
      { column_name: 'id', title: 'id', uidt: 'Number', pk: true },
      { column_name: 'cliente_enviado', title: 'cliente_enviado', uidt: 'SingleLineText' },
      { column_name: 'mensagem_relatorio', title: 'mensagem_relatorio', uidt: 'LongText' },
      { column_name: 'mensagem_melina', title: 'mensagem_melina', uidt: 'LongText' },
      { column_name: 'mensagem_relatório_enviada', title: 'mensagem_relatório_enviada', uidt: 'Checkbox' },
      { column_name: 'mensagem_melina_enviada', title: 'mensagem_melina_enviada', uidt: 'Checkbox' },
      { column_name: 'horario_mensagem_relatorio_enviada', title: 'horario_mensagem_relatorio_enviada', uidt: 'SingleLineText' },
      { column_name: 'horario_mensagem_melina_enviada', title: 'horario_mensagem_melina_enviada', uidt: 'SingleLineText' },
      { column_name: 'telefone_grupo', title: 'telefone_grupo', uidt: 'SingleLineText' },
      { column_name: 'created_at', title: 'created_at', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'clientes',
    title: 'clientes',
    columns: [
      { column_name: 'id', title: 'id', uidt: 'SingleLineText', pk: true },
      { column_name: 'name', title: 'name', uidt: 'SingleLineText' },
      { column_name: 'webhook_url', title: 'webhook_url', uidt: 'LongText' },
      { column_name: 'webhook_postagens', title: 'webhook_postagens', uidt: 'LongText' },
      { column_name: 'columns', title: 'columns', uidt: 'JSON' },
      { column_name: 'layouts', title: 'layouts', uidt: 'JSON' },
      { column_name: 'prompt', title: 'prompt', uidt: 'LongText' },
      { column_name: 'pasta_veiculos', title: 'pasta_veiculos', uidt: 'SingleLineText' },
      { column_name: 'prompt_imagem_principal', title: 'prompt_imagem_principal', uidt: 'LongText' },
      { column_name: 'prompt_imagem1', title: 'prompt_imagem1', uidt: 'LongText' },
      { column_name: 'prompt_imagem2', title: 'prompt_imagem2', uidt: 'LongText' },
      { column_name: 'prompt_imagem3', title: 'prompt_imagem3', uidt: 'LongText' },
      { column_name: 'json_stories', title: 'json_stories', uidt: 'JSON' },
      { column_name: 'json_feed', title: 'json_feed', uidt: 'JSON' },
      { column_name: 'url_moldura1', title: 'url_moldura1', uidt: 'LongText' },
      { column_name: 'url_moldura2', title: 'url_moldura2', uidt: 'LongText' },
      { column_name: 'url_moldura3', title: 'url_moldura3', uidt: 'LongText' },
      { column_name: 'id_instagram', title: 'id_instagram', uidt: 'SingleLineText' },
      { column_name: 'id_facebook', title: 'id_facebook', uidt: 'SingleLineText' },
      { column_name: 'token', title: 'token', uidt: 'LongText' },
      { column_name: 'caption_template', title: 'caption_template', uidt: 'LongText' },
      { column_name: 'id_clickup', title: 'id_clickup', uidt: 'SingleLineText' },
      { column_name: 'webhook_stories_seg_quar_sex', title: 'webhook_stories_seg_quar_sex', uidt: 'LongText' },
      { column_name: 'atualizacao_token', title: 'atualizacao_token', uidt: 'SingleLineText' },
      { column_name: 'divisao_developrs', title: 'divisao_developrs', uidt: 'Number' },
      { column_name: 'cliente_ativo', title: 'cliente_ativo', uidt: 'Checkbox' },
      { column_name: 'guide_stories', title: 'guide_stories', uidt: 'LongText' },
      { column_name: 'guide_feed', title: 'guide_feed', uidt: 'LongText' },
      { column_name: 'horario_developers', title: 'horario_developers', uidt: 'SingleLineText' },
      { column_name: 'clickup_tarefa_id', title: 'clickup_tarefa_id', uidt: 'SingleLineText' },
      { column_name: 'integracao_tipo', title: 'integracao_tipo', uidt: 'SingleLineText' },
      { column_name: 'bndv_external_key', title: 'bndv_external_key', uidt: 'SingleLineText' },
      { column_name: 'bndv_password', title: 'bndv_password', uidt: 'SingleLineText' },
      { column_name: 'bndv_customer_key', title: 'bndv_customer_key', uidt: 'SingleLineText' },
      { column_name: 'boom_token', title: 'boom_token', uidt: 'SingleLineText' },
      { column_name: 'boom_customer_key', title: 'boom_customer_key', uidt: 'SingleLineText' },
      { column_name: 'boom_url', title: 'boom_url', uidt: 'LongText' },
      { column_name: 'loja_conectada_token', title: 'loja_conectada_token', uidt: 'SingleLineText' },
      { column_name: 'autocerto_username', title: 'autocerto_username', uidt: 'SingleLineText' },
      { column_name: 'autocerto_password', title: 'autocerto_password', uidt: 'SingleLineText' },
      { column_name: 'revenda_mais_url', title: 'revenda_mais_url', uidt: 'LongText' },
      { column_name: 'nome_grupo_whatsapp', title: 'nome_grupo_whatsapp', uidt: 'SingleLineText' },
      { column_name: 'numero_grupo_whatsapp', title: 'numero_grupo_whatsapp', uidt: 'SingleLineText' },
      { column_name: 'created_at', title: 'created_at', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'VeiculoOperador',
    title: 'VeiculoOperador',
    columns: [
      { column_name: 'id', title: 'id', uidt: 'SingleLineText', pk: true },
      { column_name: 'clienteId', title: 'clienteId', uidt: 'SingleLineText' },
      { column_name: 'dados', title: 'dados', uidt: 'JSON' },
      { column_name: 'fotos', title: 'fotos', uidt: 'JSON' },
      { column_name: 'clickupTaskId', title: 'clickupTaskId', uidt: 'SingleLineText' },
      { column_name: 'importado', title: 'importado', uidt: 'Checkbox' },
      { column_name: 'createdAt', title: 'createdAt', uidt: 'SingleLineText' },
      { column_name: 'design_state', title: 'design_state', uidt: 'JSON' }
    ]
  },
  {
    table_name: 'publicacoes_design_online',
    title: 'publicacoes_design_online',
    columns: [
      { column_name: 'id', title: 'id', uidt: 'Number', pk: true },
      { column_name: 'nome_empresa', title: 'nome_empresa', uidt: 'SingleLineText' },
      { column_name: 'imagem', title: 'imagem', uidt: 'LongText' },
      { column_name: 'formato', title: 'formato', uidt: 'SingleLineText' },
      { column_name: 'descricao', title: 'descricao', uidt: 'LongText' },
      { column_name: 'publicado', title: 'publicado', uidt: 'Checkbox' },
      { column_name: 'veiculo_gerado', title: 'veiculo_gerado', uidt: 'SingleLineText' },
      { column_name: 'adicionado_manualmente', title: 'adicionado_manualmente', uidt: 'Checkbox' },
      { column_name: 'data_agendamento', title: 'data_agendamento', uidt: 'SingleLineText' },
      { column_name: 'ordem', title: 'ordem', uidt: 'Number' },
      { column_name: 'publicado_instagram', title: 'publicado_instagram', uidt: 'Checkbox' },
      { column_name: 'webhook_disparado', title: 'webhook_disparado', uidt: 'Checkbox' },
      { column_name: 'identificador_veiculo', title: 'identificador_veiculo', uidt: 'SingleLineText' },
      { column_name: 'created_at', title: 'created_at', uidt: 'SingleLineText' }
    ]
  },
  {
    table_name: 'clientes_vendidos',
    title: 'clientes_vendidos',
    columns: [
      { column_name: 'id', title: 'id', uidt: 'SingleLineText', pk: true },
      { column_name: 'name', title: 'name', uidt: 'SingleLineText' },
      { column_name: 'webhook_url', title: 'webhook_url', uidt: 'LongText' },
      { column_name: 'webhook_postagens', title: 'webhook_postagens', uidt: 'LongText' },
      { column_name: 'columns', title: 'columns', uidt: 'JSON' },
      { column_name: 'prompt', title: 'prompt', uidt: 'LongText' },
      { column_name: 'caption_template', title: 'caption_template', uidt: 'LongText' },
      { column_name: 'id_instagram', title: 'id_instagram', uidt: 'SingleLineText' },
      { column_name: 'id_facebook', title: 'id_facebook', uidt: 'SingleLineText' },
      { column_name: 'token', title: 'token', uidt: 'LongText' },
      { column_name: 'json_stories', title: 'json_stories', uidt: 'JSON' },
      { column_name: 'json_feed', title: 'json_feed', uidt: 'JSON' },
      { column_name: 'cliente_ativo', title: 'cliente_ativo', uidt: 'Checkbox' },
      { column_name: 'guide_stories', title: 'guide_stories', uidt: 'LongText' },
      { column_name: 'guide_feed', title: 'guide_feed', uidt: 'LongText' },
      { column_name: 'revenda_mais_url', title: 'revenda_mais_url', uidt: 'LongText' },
      { column_name: 'created_at', title: 'created_at', uidt: 'SingleLineText' }
    ]
  }
];

async function getExistingTables() {
  const res = await fetch(`${NOCO_URL}/api/v2/meta/bases/${PROJECT_ID}/tables`, {
    headers: { 'xc-token': NOCO_TOKEN }
  });
  const data = await res.json();
  const map = {};
  if (data.list) {
    data.list.forEach(t => {
      map[t.table_name] = t.id;
    });
  }
  return map;
}

async function createTable(schema) {
  const res = await fetch(`${NOCO_URL}/api/v2/meta/bases/${PROJECT_ID}/tables`, {
    method: 'POST',
    headers: {
      'xc-token': NOCO_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(schema)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erro ao criar tabela ${schema.table_name}: ${txt}`);
  }
  const data = await res.json();
  return data.id;
}

module.exports = {
  TABLE_SCHEMAS,
  getExistingTables,
  createTable,
  NOCO_URL,
  NOCO_TOKEN,
  PROJECT_ID,
  supabase
};
