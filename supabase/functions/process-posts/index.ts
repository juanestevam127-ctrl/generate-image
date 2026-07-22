import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Calcula a janela de tempo: 2 minutos antes e 2 minutos depois do momento atual
  const now = new Date();
  const tempoInicio = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const tempoFim = new Date(now.getTime() + 2 * 60 * 1000).toISOString();

  // Busca apenas postagens com data_agendamento dentro da janela de +/- 2 minutos
  const { data: pendingPosts, error: fetchError } = await supabase
    .from('publicacoes_design_online')
    .select('*')
    .eq('publicado', false)
    .eq('enviado_webhook', false)
    .not('data_agendamento', 'is', null)
    .gte('data_agendamento', tempoInicio)
    .lte('data_agendamento', tempoFim);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!pendingPosts || pendingPosts.length === 0) {
    return new Response(JSON.stringify({ message: 'Nenhuma postagem na janela de +/- 2 minutos' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Agrupa por empresa + veículo + formato
  const groups: Record<string, any[]> = {};
  for (const post of pendingPosts) {
    const key = `${post.nome_empresa}||${post.veiculo_gerado}||${post.formato}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(post);
  }

  const results: any[] = [];

  for (const [key, posts] of Object.entries(groups)) {
    const firstPost = posts[0];
    const clientName = firstPost.nome_empresa;
    const ids = posts.map((p: any) => p.id);

    // LOCK OTIMISTA: marca como true ANTES de chamar a webhook
    // Impede que outra execução paralela envie o mesmo grupo de posts
    const { data: lockedRows, error: lockError } = await supabase
      .from('publicacoes_design_online')
      .update({ enviado_webhook: true })
      .in('id', ids)
      .eq('enviado_webhook', false)
      .select('id');

    if (lockError || !lockedRows || lockedRows.length === 0) {
      results.push({ key, status: 'skipped', reason: 'ja_processado_por_outra_execucao' });
      continue;
    }

    // Verifica se é cliente de vendidos
    const { count: isSoldCount } = await supabase
      .from('clientes_vendidos')
      .select('*', { count: 'exact', head: true })
      .eq('name', clientName);

    const isSold =
      (firstPost.formato && firstPost.formato.toUpperCase().startsWith('VENDIDO ')) ||
      (isSoldCount !== null && isSoldCount > 0);

    const webhookUrl = isSold
      ? 'https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/postagens-vendidos'
      : 'https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/agendar_postagem';

    // Busca credenciais do cliente
    let client: any = null;

    if (isSold) {
      const { data } = await supabase
        .from('clientes_vendidos')
        .select('*')
        .eq('name', clientName)
        .single();
      client = data;

      if (client && (!client.id_facebook || !client.id_instagram || !client.token)) {
        const { data: stdClient } = await supabase
          .from('clientes')
          .select('*')
          .eq('name', clientName)
          .single();
        if (stdClient) {
          client = {
            ...client,
            id_facebook: client.id_facebook || stdClient.id_facebook,
            id_instagram: client.id_instagram || stdClient.id_instagram,
            token: client.token || stdClient.token
          };
        }
      }
    } else {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('name', clientName)
        .single();
      client = data;
    }

    if (!client) {
      await supabase
        .from('publicacoes_design_online')
        .update({ enviado_webhook: false })
        .in('id', ids);
      results.push({ key, status: 'cliente_nao_encontrado' });
      continue;
    }

    // Monta o payload
    const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
    const isVideo = (url: string) =>
      url && videoExtensions.some((ext: string) => url.toLowerCase().endsWith(ext));

    const isReels =
      firstPost.formato === 'REELS' || firstPost.formato === 'VENDIDO REELS';

    const post_type = isReels
      ? 'REELS'
      : firstPost.formato === 'FEED' || firstPost.formato === 'VENDIDO FEED'
        ? posts.length > 1 ? 'CARROSSEL' : 'ESTATICA'
        : 'IMAGEM';

    const payload = {
      client: client.name,
      facebook_id: client.id_facebook,
      instagram_id: client.id_instagram,
      token: client.token,
      images: posts.map((p: any) => p.imagem),
      video: posts.find((p: any) => isVideo(p.imagem))?.imagem ?? null,
      reels_cover: posts.find((p: any) => !isVideo(p.imagem))?.imagem ?? null,
      description: firstPost.descricao || '',
      format: firstPost.formato,
      post_type,
      scheduled_at: firstPost.data_agendamento,
      scheduled_at_local: '',
      timezone: 'America/Sao_Paulo',
      timezone_offset: -180,
      is_carousel: !isReels && posts.length > 1,
      veiculo_gerado: firstPost.veiculo_gerado
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        results.push({ key, status: 'success', ids });
      } else {
        await supabase
          .from('publicacoes_design_online')
          .update({ enviado_webhook: false })
          .in('id', ids);
        results.push({ key, status: 'webhook_falhou', httpStatus: res.status, error: await res.text() });
      }
    } catch (err: any) {
      await supabase
        .from('publicacoes_design_online')
        .update({ enviado_webhook: false })
        .in('id', ids);
      results.push({ key, status: 'erro_rede', error: err.message });
    }
  }

  return new Response(
    JSON.stringify({
      tempo_inicio: tempoInicio,
      tempo_fim: tempoFim,
      disparados: results.filter(r => r.status === 'success').length,
      pulados: results.filter(r => r.status === 'skipped').length,
      falhos: results.filter(r => !['success', 'skipped'].includes(r.status)).length,
      detalhes: results
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
