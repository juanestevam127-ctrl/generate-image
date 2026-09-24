CREATE TABLE public."clientes" (
  "id" UUID,
  "created_at" TIMESTAMPTZ,
  "name" TEXT,
  "webhook_url" TEXT,
  "webhook_postagens" TEXT,
  "columns" JSONB,
  "prompt" TEXT,
  "pasta_veiculos" TEXT,
  "prompt_imagem_principal" TEXT,
  "prompt_imagem1" TEXT,
  "prompt_imagem2" TEXT,
  "prompt_imagem3" TEXT,
  "json_stories" JSONB,
  "json_feed" JSONB,
  "url_moldura1" TEXT,
  "url_moldura2" TEXT,
  "url_moldura3" TEXT,
  "id_instagram" TEXT,
  "id_facebook" TEXT,
  "token" TEXT,
  "caption_template" TEXT,
  "id_clickup" TEXT,
  "webhook_stories_seg_quar_sex" TEXT,
  "atualizacao_token" DATE,
  "divisao_developrs" NUMERIC,
  "cliente_ativo" BOOLEAN,
  "guide_stories" TEXT,
  "guide_feed" TEXT,
  "horario_developers" TEXT,
  "clickup_tarefa_id" TEXT
);

CREATE TABLE public."clientes_vendidos" (
  "id" UUID,
  "name" TEXT,
  "webhook_url" TEXT,
  "webhook_postagens" TEXT,
  "prompt" TEXT,
  "columns" JSONB,
  "caption_template" TEXT,
  "id_facebook" TEXT,
  "id_instagram" TEXT,
  "token" TEXT,
  "created_at" TIMESTAMPTZ,
  "json_feed" TEXT,
  "json_stories" TEXT,
  "guide_stories" TEXT,
  "guide_feed" TEXT,
  "cliente_ativo" BOOLEAN
);

CREATE TABLE public."VeiculoOperador" (
  "id" UUID,
  "clienteId" UUID,
  "dados" JSONB,
  "fotos" JSONB,
  "clickupTaskId" TEXT,
  "importado" BOOLEAN,
  "createdAt" TIMESTAMPTZ
);

CREATE TABLE public."publicacoes_design_online" (
  "id" INTEGER,
  "created_at" TIMESTAMPTZ,
  "nome_empresa" TEXT,
  "imagem" TEXT,
  "formato" TEXT,
  "descricao" TEXT,
  "publicado" BOOLEAN,
  "veiculo_gerado" TEXT,
  "adicionado_manualmente" BOOLEAN,
  "data_agendamento" TIMESTAMPTZ,
  "ordem" INTEGER,
  "publicado_instagram" BOOLEAN,
  "webhook_disparado" BOOLEAN
);

CREATE TABLE public."design_online_layouts_clientes" (
  "id" UUID,
  "nome_cliente" TEXT,
  "webhook_url" TEXT,
  "texto" TEXT,
  "imagem_url" TEXT,
  "checkbox_ativo" BOOLEAN,
  "instagram_user_id" TEXT,
  "instagram_token" TEXT,
  "facebook_user_id" TEXT,
  "facebook_token" TEXT,
  "modelo_feed_id" TEXT,
  "modelo_stories_id" TEXT,
  "json_cliente" JSONB,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE public."design_online_layouts_disparos" (
  "id" UUID,
  "cliente_id" UUID,
  "nome_cliente" TEXT,
  "status" TEXT,
  "payload" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ
);

CREATE TABLE public."design_online_stories_veiculos" (
  "id" INTEGER,
  "created_at" TIMESTAMPTZ,
  "nome_cliente" TEXT,
  "nome_veiculo" TEXT,
  "id_tarefa" TEXT,
  "url_imagem" TEXT,
  "postado" BOOLEAN,
  "rede_social" TEXT
);

CREATE TABLE public."configuracoes_gerais" (
  "id" INTEGER,
  "servidor_url" TEXT,
  "bucket_nome" TEXT,
  "pasta_nome" TEXT,
  "token" TEXT,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE public."usuarios" (
  "email" TEXT,
  "created_at" TIMESTAMPTZ,
  "password" TEXT,
  "role" TEXT,
  "name" TEXT
);

CREATE TABLE public."token_facebook_juan" (
  "id" INTEGER,
  "created_at" TIMESTAMPTZ,
  "token_facebook" TEXT,
  "app_id" TEXT,
  "app_secret" TEXT
);

CREATE TABLE public."webhook_retry_log" (
  "id" UUID,
  "id_instagram" TEXT,
  "data_postagem" DATE,
  "tentativa" INTEGER,
  "disparado_em" TIMESTAMPTZ,
  "status" TEXT
);

