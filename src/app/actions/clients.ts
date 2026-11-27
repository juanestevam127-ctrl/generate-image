"use server";

import { supabase } from "@/lib/supabase";

// --- Regular Clients (Table: clientes) ---
async function getNextGroupAndSchedule() {
    // Query all clients with non-null divisao_developrs
    const { data: clients, error } = await supabase
        .from("clientes")
        .select("divisao_developrs, horario_developers")
        .not("divisao_developrs", "is", null);
    
    if (error) throw error;

    const activeClients: any[] = clients || [];
    const hours = ["13h", "14h", "15h", "16h", "17h"];
    
    let group = 1;
    while (true) {
        const groupClients = activeClients.filter((c: any) => c.divisao_developrs === group);
        
        if (groupClients.length < 5) {
            const usedHours = groupClients.map((c: any) => c.horario_developers);
            const freeHour = hours.find(h => !usedHours.includes(h)) || "13h";
            return { divisao_developrs: group, horario_developers: freeHour };
        }
        
        group++;
    }
}

export async function getNextDivisaoAction() {
    try {
        const next = await getNextGroupAndSchedule();
        return { success: true, data: next };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addClientAction(data: any) {
    let nextDivisao = null;
    let nextHorario = null;

    if (data.clienteAtivo !== false) {
        const groupAndSchedule = await getNextGroupAndSchedule();
        nextDivisao = groupAndSchedule.divisao_developrs;
        nextHorario = groupAndSchedule.horario_developers;
    }

    const dbData = {
        name: data.name,
        webhook_url: data.webhookUrl,
        webhook_postagens: data.webhookPostagens,
        prompt: data.prompt,
        columns: data.columns,
        caption_template: data.captionTemplate,
        pasta_veiculos: data.pasta_veiculos,
        id_facebook: data.facebookId,
        id_instagram: data.instagramId,
        token: data.token,
        json_feed: data.jsonFeed,
        json_stories: data.jsonStories,
        divisao_developrs: nextDivisao,
        horario_developers: nextHorario,
        guide_stories: data.guideStories,
        guide_stories_segunda: data.guideStoriesSegunda,
        guide_stories_sabado: data.guideStoriesSabado,
        guide_feed: data.guideFeed,
        cliente_ativo: data.clienteAtivo,
        id_clickup: data.idClickup,
        clickup_tarefa_id: data.clickupTarefaId,
        webhook_stories_seg_quar_sex: data.webhookStoriesSegQuarSex,
        stories_quarta_sexta_domingo: data.storiesQuartaSextaDomingo ?? false,
        integracao_tipo: data.integracaoTipo,
        bndv_external_key: data.bndvExternalKey,
        bndv_password: data.bndvPassword,
        bndv_customer_key: data.bndvCustomerKey,
        boom_token: data.boomToken,
        boom_customer_key: data.boomCustomerKey,
        boom_url: data.boomUrl,
        loja_conectada_token: data.lojaConectadaToken,
        autocerto_username: data.autocertoUsername,
        autocerto_password: data.autocertoPassword,
        autocerto_xml_url: data.autocertoXmlUrl,
        revenda_mais_url: data.revendaMaisUrl,
        nome_grupo_whatsapp: data.nomeGrupoWhatsapp || "",
        numero_grupo_whatsapp: data.numeroGrupoWhatsapp || "",
        layouts: data.layouts || []
    };

    try {
        const { data: inserted, error } = await supabase
            .from("clientes")
            .insert([dbData])
            .select();

        if (error) throw error;
        return { success: true, data: inserted[0] };
    } catch (e: any) {
        console.error("Add Client Error:", e);
        return { success: false, error: e.message };
    }
}

export async function updateClientAction(id: string, updates: any) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
    if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
    if (updates.columns) dbUpdates.columns = updates.columns;
    if (updates.captionTemplate !== undefined) dbUpdates.caption_template = updates.captionTemplate;
    if (updates.pasta_veiculos !== undefined) dbUpdates.pasta_veiculos = updates.pasta_veiculos;
    if (updates.facebookId !== undefined) dbUpdates.id_facebook = updates.facebookId;
    if (updates.instagramId !== undefined) dbUpdates.id_instagram = updates.instagramId;
    if (updates.token !== undefined) dbUpdates.token = updates.token;
    if (updates.jsonFeed !== undefined) dbUpdates.json_feed = updates.jsonFeed;
    if (updates.jsonStories !== undefined) dbUpdates.json_stories = updates.jsonStories;
    if (updates.guideStories !== undefined) dbUpdates.guide_stories = updates.guideStories;
    if (updates.guideStoriesSegSab !== undefined) dbUpdates.guide_stories_seg_sab = updates.guideStoriesSegSab;
    if (updates.guideStoriesSegunda !== undefined) dbUpdates.guide_stories_segunda = updates.guideStoriesSegunda;
    if (updates.guideStoriesSabado !== undefined) dbUpdates.guide_stories_sabado = updates.guideStoriesSabado;
    if (updates.guideFeed !== undefined) dbUpdates.guide_feed = updates.guideFeed;
    if (updates.clienteAtivo !== undefined) dbUpdates.cliente_ativo = updates.clienteAtivo;
    if (updates.idClickup !== undefined) dbUpdates.id_clickup = updates.idClickup;
    if (updates.clickupTarefaId !== undefined) dbUpdates.clickup_tarefa_id = updates.clickupTarefaId;
    if (updates.webhookStoriesSegQuarSex !== undefined) dbUpdates.webhook_stories_seg_quar_sex = updates.webhookStoriesSegQuarSex;
    if (updates.storiesQuartaSextaDomingo !== undefined) dbUpdates.stories_quarta_sexta_domingo = updates.storiesQuartaSextaDomingo;
    if (updates.integracaoTipo !== undefined) dbUpdates.integracao_tipo = updates.integracaoTipo;
    if (updates.bndvExternalKey !== undefined) dbUpdates.bndv_external_key = updates.bndvExternalKey;
    if (updates.bndvPassword !== undefined) dbUpdates.bndv_password = updates.bndvPassword;
    if (updates.bndvCustomerKey !== undefined) dbUpdates.bndv_customer_key = updates.bndvCustomerKey;
    if (updates.boomToken !== undefined) dbUpdates.boom_token = updates.boomToken;
    if (updates.boomCustomerKey !== undefined) dbUpdates.boom_customer_key = updates.boomCustomerKey;
    if (updates.boomUrl !== undefined) dbUpdates.boom_url = updates.boomUrl;
    if (updates.lojaConectadaToken !== undefined) dbUpdates.loja_conectada_token = updates.lojaConectadaToken;
    if (updates.autocertoUsername !== undefined) dbUpdates.autocerto_username = updates.autocertoUsername;
    if (updates.autocertoPassword !== undefined) dbUpdates.autocerto_password = updates.autocertoPassword;
    if (updates.autocertoXmlUrl !== undefined) dbUpdates.autocerto_xml_url = updates.autocertoXmlUrl;
    if (updates.revendaMaisUrl !== undefined) dbUpdates.revenda_mais_url = updates.revendaMaisUrl;
    if (updates.nomeGrupoWhatsapp !== undefined) dbUpdates.nome_grupo_whatsapp = updates.nomeGrupoWhatsapp;
    if (updates.numeroGrupoWhatsapp !== undefined) dbUpdates.numero_grupo_whatsapp = updates.numeroGrupoWhatsapp;
    if (updates.layouts !== undefined) dbUpdates.layouts = updates.layouts;

    try {
        // If activation status is specified, we check if we need to assign or clear group/schedule
        if (updates.clienteAtivo !== undefined) {
            const { data: currentClient, error: getError } = await supabase
                .from("clientes")
                .select("cliente_ativo, divisao_developrs")
                .eq("id", id)
                .single();

            if (!getError && currentClient) {
                if (updates.clienteAtivo === true && (!currentClient.cliente_ativo || !currentClient.divisao_developrs)) {
                    const groupAndSchedule = await getNextGroupAndSchedule();
                    dbUpdates.divisao_developrs = groupAndSchedule.divisao_developrs;
                    dbUpdates.horario_developers = groupAndSchedule.horario_developers;
                } else if (updates.clienteAtivo === false) {
                    dbUpdates.divisao_developrs = null;
                    dbUpdates.horario_developers = null;
                }
            }
        }

        const { data: updated, error } = await supabase
            .from("clientes")
            .update(dbUpdates)
            .eq("id", id)
            .select();

        if (error) throw error;

        if (updates.clienteAtivo !== undefined && updated && updated[0]) {
            const clientName = updated[0].name || "";
            const baseNameMatch = clientName.match(/^(.*?)\s*\(LAYOUT/i);
            const baseName = baseNameMatch ? baseNameMatch[1].trim() : clientName.trim();

            if (updates.clienteAtivo === false) {
                // Se desativou, verifica se sobrou algum layout ativo
                const { data: activeLayouts, error: checkError } = await supabase
                    .from("clientes")
                    .select("id")
                    .ilike("name", `${baseName}%`)
                    .eq("cliente_ativo", true);
                
                if (!checkError && (!activeLayouts || activeLayouts.length === 0)) {
                    await supabase
                        .from("clientes_vendidos")
                        .update({ cliente_ativo: false })
                        .ilike("name", baseName);
                }
            } else if (updates.clienteAtivo === true) {
                // Se ativou o layout, ativa automaticamente o vendido correspondente
                await supabase
                    .from("clientes_vendidos")
                    .update({ cliente_ativo: true })
                    .ilike("name", baseName);
            }
        }

        return { success: true, data: updated ? updated[0] : null };
    } catch (e: any) {
        console.error("Update Client Error:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteClientAction(id: string) {
    const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

// --- Uazapi Groups ---
export async function getUazapiGroupsAction() {
    try {
        const token = process.env.UAZAPI_TOKEN || "467f5fc7-a677-4f0b-a597-8eb9f1a67e82";
        const res = await fetch("https://designonline.uazapi.com/group/list", {
            headers: {
                "Accept": "application/json",
                "token": token
            },
            next: { revalidate: 60 }
        });
        if (!res.ok) throw new Error("Erro na API Uazapi: " + res.status);
        const data = await res.json();
        const groups = (data.groups || []).map((g: any) => ({
            name: g.Name || g.name || "",
            jid: g.JID || g.jid || ""
        })).filter((g: any) => g.name && g.jid).sort((a: any, b: any) => a.name.localeCompare(b.name));

        return { success: true, data: groups };
    } catch (e: any) {
        console.error("Get Uazapi Groups Error:", e);
        return { success: false, error: e.message, data: [] };
    }
}
export async function addSoldClientAction(data: any) {
    return { success: true, data: { id: "deprecated", ...data } };
}

export async function updateSoldClientAction(id: string, updates: any) {
    return { success: true };
}

export async function deleteSoldClientAction(id: string) {
    return { success: true };
}

// --- Layout Clients (Table: design_online_layouts_clientes) ---
export async function addLayoutClientAction(data: any) {
    const dbData = {
        nome_cliente: data.name,
        webhook_url: data.webhookUrl,
        webhook_postagens: data.webhookPostagens,
        prompt: data.prompt,
        columns: data.columns,
        instagram_user_id: data.instagramUserId,
        instagram_token: data.instagramToken,
        facebook_user_id: data.facebookUserId,
        facebook_token: data.facebookToken,
        modelo_feed_id: data.modeloFeedId,
        modelo_stories_id: data.modeloStoriesId,
        json_cliente: data.jsonCliente
    };

    const { data: inserted, error } = await supabase
        .from("design_online_layouts_clientes")
        .insert([dbData])
        .select();

    if (error) throw error;
    return { success: true, data: inserted[0] };
}

export async function updateLayoutClientAction(id: string, updates: any) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.nome_cliente = updates.name;
    if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
    if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
    if (updates.columns) dbUpdates.columns = updates.columns;
    if (updates.instagramUserId) dbUpdates.instagram_user_id = updates.instagramUserId;
    if (updates.instagramToken) dbUpdates.instagram_token = updates.instagramToken;
    if (updates.facebookUserId) dbUpdates.facebook_user_id = updates.facebookUserId;
    if (updates.facebookToken) dbUpdates.facebook_token = updates.facebookToken;
    if (updates.modeloFeedId) dbUpdates.modelo_feed_id = updates.modeloFeedId;
    if (updates.modeloStoriesId) dbUpdates.modelo_stories_id = updates.modeloStoriesId;
    if (updates.jsonCliente) dbUpdates.json_cliente = updates.jsonCliente;

    const { error } = await supabase
        .from("design_online_layouts_clientes")
        .update(dbUpdates)
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

export async function deleteLayoutClientAction(id: string) {
    const { error } = await supabase
        .from("design_online_layouts_clientes")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

// --- Users (Table: usuarios) ---
export async function registerUserAction(userData: any) {
    const { error } = await supabase
        .from("usuarios")
        .insert([userData]);

    if (error) throw error;
    return { success: true };
}

export async function removeUserAction(email: string) {
    const { error } = await supabase
        .from("usuarios")
        .delete()
        .eq("email", email);

    if (error) throw error;
    return { success: true };
}

export async function updateConfiguracoesGeraisAction(config: any) {
    try {
        const { error } = await supabase.from('configuracoes_gerais').update(config).eq('id', 1);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Update config error:', error);
        return { success: false, error: error.message };
    }
}
