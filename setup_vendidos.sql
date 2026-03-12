-- Script para criar a tabela de clientes vendidos
-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS public.clientes_vendidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    webhook_postagens TEXT,
    prompt TEXT,
    columns JSONB DEFAULT '[]'::jsonb,
    caption_template TEXT,
    id_facebook TEXT,
    id_instagram TEXT,
    token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE public.clientes_vendidos ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso para todos (ajuste conforme sua necessidade de segurança)
CREATE POLICY "Permitir acesso total para usuários autenticados" 
ON public.clientes_vendidos 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
