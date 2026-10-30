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

// 2. Salvar o Token UAZAPI
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

// 3. Buscar relatórios por intervalo de datas ou geral
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

// 4. Função auxiliar para envio via UAZAPI
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

// 5. Disparar (ou Reenviar) as mensagens de um registro específico
export async function dispararRelatorioMelinaItemAction(id: number, overrideToken?: string) {
    try {
        // 1. Obter registro
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

        // 2. Obter token
        let token = overrideToken?.trim();
        if (!token) {
            const tokenRes = await getUazapiTokenAction();
            token = tokenRes.token || "";
        }

        if (!token) {
            return { success: false, error: "Token da UAZAPI não configurado. Preencha o token no topo da página." };
        }

        const nowIso = new Date().toISOString();
        let relatorioSucesso = false;
        let melinaSucesso = false;
        let erroRelatorio = "";
        let erroMelina = "";

        // Disparo 1: Mensagem do Relatório
        if (item.mensagem_relatorio) {
            try {
                await sendUazapiText(token, item.telefone_grupo, item.mensagem_relatorio);
                relatorioSucesso = true;
            } catch (err: any) {
                erroRelatorio = err.message || "Erro no envio do relatório";
                console.error("Falha ao disparar mensagem_relatorio:", err);
            }
        }

        // Disparo 2: Mensagem da Melina (logo em seguida)
        if (item.mensagem_melina) {
            try {
                // Pequeno delay de 1.5s entre mensagens para ordem garantida no WhatsApp
                await new Promise((r) => setTimeout(r, 1500));
                await sendUazapiText(token, item.telefone_grupo, item.mensagem_melina);
                melinaSucesso = true;
            } catch (err: any) {
                erroMelina = err.message || "Erro no envio da mensagem da atendente";
                console.error("Falha ao disparar mensagem_melina:", err);
            }
        }

        // Atualizar no banco de dados
        const updates: Partial<ControleRelatorioMelinaItem> = {
            "mensagem_relatório_enviada": relatorioSucesso,
            mensagem_melina_enviada: melinaSucesso,
            horario_mensagem_relatorio_enviada: nowIso,
            horario_mensagem_melina_enviada: nowIso
        };

        const { error: updateError } = await supabase
            .from("controle_relatorio_melina")
            .update(updates)
            .eq("id", id);

        if (updateError) {
            console.error("Erro ao atualizar banco após disparo:", updateError);
        }

        if (!relatorioSucesso || !melinaSucesso) {
            const detalhe = [
                !relatorioSucesso ? `Relatório: ${erroRelatorio || 'Falha'}` : null,
                !melinaSucesso ? `Melina: ${erroMelina || 'Falha'}` : null
            ].filter(Boolean).join(" | ");

            return {
                success: false,
                error: `Disparo com falhas (${detalhe})`,
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

// 6. Disparar múltiplos registros em lote (ex: todos os pendentes do dia)
export async function dispararLoteRelatoriosMelinaAction(ids: number[], overrideToken?: string) {
    try {
        let sucessos = 0;
        let falhas = 0;
        const erros: string[] = [];

        for (const id of ids) {
            const res = await dispararRelatorioMelinaItemAction(id, overrideToken);
            if (res.success) {
                sucessos++;
            } else {
                falhas++;
                erros.push(`ID ${id}: ${res.error}`);
            }
            // Delay de segurança entre cada cliente
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

// 7. Deletar registro (caso o usuário precise limpar teste)
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
