import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLICKUP_TOKEN = Deno.env.get('CLICKUP_TOKEN') ?? '';
const STORIES_FIELD_ID = 'c3825f6c-e9d3-428f-a424-758fa44110ff';
const STATUS_FALTA_ANUNCIO = 'falta anúncio';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (_req) => {
  if (!CLICKUP_TOKEN) return json({ error: 'CLICKUP_TOKEN não configurado' }, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const results: any[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Posts publicados no Facebook E no Instagram nos últimos 7 dias
  const { data: completedPosts, error } = await supabase
    .from('publicacoes_design_online')
    .select('nome_empresa, veiculo_gerado')
    .eq('publicado', true)
    .eq('publicado_instagram', true)
    .gte('created_at', sevenDaysAgo);

  if (error) return json({ error: error.message }, 500);
  if (!completedPosts?.length) return json({ message: 'Nenhum post concluído' });

  // 2. Remove duplicados (carrossel tem várias linhas por veículo)
  const unique = completedPosts.filter(
    (v, i, a) =>
      v.veiculo_gerado &&
      a.findIndex(t => t.veiculo_gerado === v.veiculo_gerado && t.nome_empresa === v.nome_empresa) === i
  );

  // Cache de clienteId por nome
  const clientCache = new Map<string, string | null>();
  const getClienteId = async (name: string) => {
    if (clientCache.has(name)) return clientCache.get(name)!;
    let { data } = await supabase.from('clientes').select('id').eq('name', name).maybeSingle();
    if (!data) {
      ({ data } = await supabase.from('clientes_vendidos').select('id').eq('name', name).maybeSingle());
    }
    const id = data?.id ?? null;
    clientCache.set(name, id);
    return id;
  };

  for (const post of unique) {
    try {
      const clienteId = await getClienteId(post.nome_empresa);
      if (!clienteId) continue;

      const { data: veiculos, error: vErr } = await supabase
        .from('VeiculoOperador')
        .select('id, clickupTaskId, dados')
        .eq('clienteId', clienteId)
        .not('clickupTaskId', 'is', null)
        .order('createdAt', { ascending: false });

      if (vErr) {
        results.push({ vehicle: post.veiculo_gerado, status: 'erro_veiculo_operador', error: vErr.message });
        continue;
      }
      if (!veiculos?.length) continue;

      // 3. Encontra o veículo correspondente pelo nome
      const alvo = post.veiculo_gerado.trim().toUpperCase();
      const match = veiculos.find(v => {
        const dados = v.dados || {};
        if (dados.clickup_status_updated === true) return false;
        return Object.values(dados).some(val => {
          const s = String(val ?? '').trim().toUpperCase();
          return s.length > 3 && (alvo.includes(s) || s.includes(alvo));
        });
      });

      if (!match) continue;

      // 4. Consulta a tarefa no ClickUp
      const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${match.clickupTaskId}`, {
        headers: { Authorization: CLICKUP_TOKEN, 'Content-Type': 'application/json' },
      });
      if (!taskRes.ok) {
        results.push({ vehicle: post.veiculo_gerado, status: 'erro_get_task', http: taskRes.status });
        continue;
      }
      const task = await taskRes.json();

      const storiesField = task.custom_fields?.find((f: any) => f.id === STORIES_FIELD_ID);
      const hasStory = Array.isArray(storiesField?.value) && storiesField.value.length > 0;

      // Sem imagem no Stories: não muda nada e tenta de novo na próxima execução
      if (!hasStory) {
        results.push({ vehicle: post.veiculo_gerado, status: 'sem_story_aguardando' });
        continue;
      }

      // 5. Muda o status para "falta anúncio"
      const updRes = await fetch(`https://api.clickup.com/api/v2/task/${match.clickupTaskId}`, {
        method: 'PUT',
        headers: { Authorization: CLICKUP_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: STATUS_FALTA_ANUNCIO }),
      });

      if (!updRes.ok) {
        results.push({ vehicle: post.veiculo_gerado, status: 'erro_put_status', error: await updRes.text() });
        continue;
      }

      // 6. Marca como processado
      await supabase
        .from('VeiculoOperador')
        .update({ dados: { ...match.dados, clickup_status_updated: true } })
        .eq('id', match.id);

      results.push({ vehicle: post.veiculo_gerado, status: 'falta_anuncio_ok', task: match.clickupTaskId });
    } catch (e: any) {
      results.push({ vehicle: post.veiculo_gerado, status: 'erro', error: e.message });
    }
  }

  return json({ processed: results.length, results });
});
