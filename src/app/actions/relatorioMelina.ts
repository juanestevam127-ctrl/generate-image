"use server";

import { supabase } from "@/lib/supabase";

export interface ControleRelatorioMelinaItem {
    id: number;
    created_at: string;
    cliente_enviado: string | null;
    mensagem_relatorio: string | null;
    mensagem_melina: string | null;
    mensagem_relatório_enviada: boolean | null;
    mensagem_melina_enviada: boolean | null;
    horario_mensagem_relatorio_enviada: string | null;
    horario_mensagem_melina_enviada: string | null;
    telefone_grupo: string | null;
}

// 1. Obter o Token UAZAPI salvo nas configurações
export async function getUazapiTokenAction() {
    try {
        const { data, error } = await supabase
            .from("configuracoes_gerais")
            .select("token")
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return { success: true, token: data?.token || "" };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao buscar token UAZAPI." };
    }
}

// 2. Salvar o Token UAZAPI (Apenas Master)
export async function saveUazapiTokenAction(token: string) {
    try {
        const { data: existing } = await supabase
            .from("configuracoes_gerais")
            .select("id")
            .limit(1);

        if (existing && existing.length > 0) {
            const { error } = await supabase
                .from("configuracoes_gerais")
                .update({ token: token.trim(), updated_at: new Date().toISOString() })
                .eq("id", existing[0].id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("configuracoes_gerais")
                .insert([{ token: token.trim() }]);
            if (error) throw error;
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao salvar token UAZAPI." };
    }
}

// 3. Obter lista de e-mails de usuários com acesso permitido à Lista de Carros
export async function getAllowedUsersListaCarrosAction() {
    try {
        const { data, error } = await supabase
            .from("configuracoes_gerais")
            .select("pasta_nome")
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        let allowed: string[] = [];
        if (data?.pasta_nome) {
            try {
                allowed = JSON.parse(data.pasta_nome);
            } catch (e) {
                allowed = [];
            }
        }
        return { success: true, data: Array.isArray(allowed) ? allowed : [] };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao carregar permissões de usuários." };
    }
}

// 4. Salvar lista de usuários permitidos (Apenas Master)
export async function saveAllowedUsersListaCarrosAction(emails: string[]) {
    try {
        const cleanEmails = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
        const { data: existing } = await supabase
            .from("configuracoes_gerais")
            .select("id")
            .limit(1);

        if (existing && existing.length > 0) {
            const { error } = await supabase
                .from("configuracoes_gerais")
                .update({
                    pasta_nome: JSON.stringify(cleanEmails),
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing[0].id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("configuracoes_gerais")
                .insert([{ pasta_nome: JSON.stringify(cleanEmails) }]);
            if (error) throw error;
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao salvar permissões." };
    }
}

// 5. Listar todos os usuários do sistema (para o master gerenciar quem tem acesso)
export async function getAllSystemUsersAction() {
    try {
        const { data, error } = await supabase
            .from("usuarios")
            .select("email, role, name")
            .order("name", { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao carregar usuários." };
    }
}

// 6. Buscar relatórios por intervalo de datas ou geral
export async function getRelatoriosMelinaAction(params?: { startDate?: string; endDate?: string }) {
    try {
        let query = supabase
            .from("controle_relatorio_melina")
            .select("*")
            .order("created_at", { ascending: false });

        if (params?.startDate) {
            query = query.gte("created_at", params.startDate);
        }
        if (params?.endDate) {
            query = query.lte("created_at", params.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { success: true, data: (data || []) as ControleRelatorioMelinaItem[] };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao buscar relatórios." };
    }
}

// 7. Envio UAZAPI
async function sendUazapiText(token: string, number: string, text: string) {
    const cleanNumber = number.trim();
    const endpoint = "https://designonline.uazapi.com/send/text";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": token,
            "Authorization": token
        },
        body: JSON.stringify({
            number: cleanNumber,
            text: text
        })
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
        responseData = JSON.parse(responseText);
    } catch (e) {
        responseData = { raw: responseText };
    }

    if (!response.ok) {
        throw new Error(responseData?.message || responseData?.error || `Erro HTTP ${response.status}`);
    }

    return responseData;
}

// 8. Disparar registro
export async function dispararRelatorioMelinaItemAction(id: number) {
    try {
        const { data: item, error: fetchError } = await supabase
            .from("controle_relatorio_melina")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !item) {
            return { success: false, error: "Registro não encontrado." };
        }

        if (!item.telefone_grupo) {
            return { success: false, error: "Registro não possui telefone_grupo preenchido." };
        }

        // Se já foi enviado com sucesso em ambos, aborta para evitar disparos duplicados
        if (item["mensagem_relatório_enviada"] === true && item.mensagem_melina_enviada === true) {
            return { success: false, error: "Este cliente já recebeu todas as mensagens com sucesso." };
        }

        const tokenRes = await getUazapiTokenAction();
        const token = tokenRes.token || "";

        if (!token) {
            return { success: false, error: "Token da UAZAPI não configurado pelo administrador." };
        }

        const nowIso = new Date().toISOString();
        let relatorioSucesso = item["mensagem_relatório_enviada"] === true;
        let melinaSucesso = item.mensagem_melina_enviada === true;
        let erroRelatorio = "";
        let erroMelina = "";

        // Enviar relatório apenas se ainda não foi enviado
        if (!relatorioSucesso && item.mensagem_relatorio) {
            try {
                await sendUazapiText(token, item.telefone_grupo, item.mensagem_relatorio);
                relatorioSucesso = true;
            } catch (err: any) {
                erroRelatorio = err.message || "Erro no relatório";
                console.error("Falha ao disparar mensagem_relatorio:", err);
            }
        }

        // Enviar melina apenas se ainda não foi enviada
        if (!melinaSucesso && item.mensagem_melina) {
            try {
                if (item.mensagem_relatorio && !item["mensagem_relatório_enviada"]) {
                    await new Promise((r) => setTimeout(r, 1500));
                }
                await sendUazapiText(token, item.telefone_grupo, item.mensagem_melina);
                melinaSucesso = true;
            } catch (err: any) {
                erroMelina = err.message || "Erro na melina";
                console.error("Falha ao disparar mensagem_melina:", err);
            }
        }

        const updates: Partial<ControleRelatorioMelinaItem> = {
            "mensagem_relatório_enviada": relatorioSucesso,
            mensagem_melina_enviada: melinaSucesso,
            horario_mensagem_relatorio_enviada: relatorioSucesso ? nowIso : (item.horario_mensagem_relatorio_enviada || nowIso),
            horario_mensagem_melina_enviada: melinaSucesso ? nowIso : (item.horario_mensagem_melina_enviada || nowIso)
        };

        await supabase
            .from("controle_relatorio_melina")
            .update(updates)
            .eq("id", id);

        if (!relatorioSucesso || !melinaSucesso) {
            const detalhe = [
                !relatorioSucesso ? `Relatório: ${erroRelatorio || 'Falhou'}` : null,
                !melinaSucesso ? `Melina: ${erroMelina || 'Falhou'}` : null
            ].filter(Boolean).join(" | ");

            return {
                success: false,
                error: `Falha no envio (${detalhe})`,
                relatorioSucesso,
                melinaSucesso
            };
        }

        return {
            success: true,
            relatorioSucesso: true,
            melinaSucesso: true
        };
    } catch (e: any) {
        console.error("dispararRelatorioMelinaItemAction error:", e);
        return { success: false, error: e.message || "Erro interno ao processar disparo." };
    }
}

// 9. Disparo em lote dos pendentes/falhas
export async function dispararLoteRelatoriosMelinaAction(ids: number[]) {
    try {
        let sucessos = 0;
        let falhas = 0;
        const erros: string[] = [];

        for (const id of ids) {
            const res = await dispararRelatorioMelinaItemAction(id);
            if (res.success) {
                sucessos++;
            } else {
                falhas++;
                erros.push(`ID ${id}: ${res.error}`);
            }
            await new Promise((r) => setTimeout(r, 1000));
        }

        return {
            success: true,
            sucessos,
            falhas,
            erros
        };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro no disparo em lote." };
    }
}

// 10. Deletar registro
export async function deleteRelatorioMelinaItemAction(id: number) {
    try {
        const { error } = await supabase
            .from("controle_relatorio_melina")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Erro ao deletar registro." };
    }
}
