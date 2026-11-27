"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type VeiculoLogEntry = {
    data: string; // ISO string
    usuario: string; // Nome ou email do usuário
    acao: "CRIADO_MANUAL" | "CRIADO_ESTOQUE_API" | "CRIADO_ESTOQUE" | "IMPORTADO_TABELA" | "GERADO_IMAGEM" | "REFEITO_IMAGEM" | "EDITADO_DADOS";
    titulo: string; // Ex: "Criado em Veículos", "Arte Gerada (1ª versão)", "Refazer Imagens"
    detalhes?: string; // Informações adicionais em texto
    metadata?: Record<string, any>; // Dados estruturados (diff, campos preenchidos, modelo, etc.)
};

export async function registrarHistoricoVeiculoAction(params: {
    veiculoId?: string;
    clickupTaskId?: string;
    usuario?: string;
    acao: VeiculoLogEntry["acao"];
    titulo: string;
    detalhes?: string;
    metadata?: Record<string, any>;
}) {
    try {
        const { veiculoId, clickupTaskId, usuario = "Usuário", acao, titulo, detalhes, metadata } = params;
        if (!veiculoId && !clickupTaskId) return { success: false, error: "Identificador não fornecido" };

        let query = supabase.from("VeiculoOperador").select("id, historico");
        if (veiculoId) {
            query = query.eq("id", veiculoId);
        } else if (clickupTaskId) {
            query = query.eq("clickupTaskId", clickupTaskId);
        }

        const { data: current } = await query.single();
        if (!current) return { success: false, error: "Veículo não encontrado" };

        const currentHistorico: VeiculoLogEntry[] = Array.isArray(current.historico) ? current.historico : [];
        const newEntry: VeiculoLogEntry = {
            data: new Date().toISOString(),
            usuario: usuario || "Usuário",
            acao,
            titulo,
            detalhes,
            metadata
        };

        const updatedHistorico = [...currentHistorico, newEntry];

        await supabase
            .from("VeiculoOperador")
            .update({ historico: updatedHistorico })
            .eq("id", current.id);

        return { success: true, historico: updatedHistorico };
    } catch (e: any) {
        console.error("Erro ao registrar histórico do veículo:", e);
        return { success: false, error: e.message };
    }
}

export async function getVeiculoByTaskIdAction(taskId: string) {
    try {
        const { data, error } = await supabase
            .from("VeiculoOperador")
            .select("*")
            .eq("clickupTaskId", taskId)
            .single();
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateVeiculoDadosAction(id: string, novosDados: any, usuario?: string) {
    try {
        // Obter veículo atual para sincronizar design_state se existir
        const { data: current } = await supabase
            .from("VeiculoOperador")
            .select("dados, design_state, clienteId, historico")
            .eq("id", id)
            .single();

        let updatedDesignState = current?.design_state ? { ...current.design_state } : null;

        if (updatedDesignState && current?.clienteId) {
            const { data: client } = await supabase
                .from("clientes")
                .select("columns")
                .eq("id", current.clienteId)
                .single();

            if (client && client.columns) {
                client.columns.forEach((col: any) => {
                    if (col.type !== "image" && col.type !== "checkbox") {
                        if (novosDados[col.name] !== undefined) {
                            updatedDesignState[col.id] = novosDados[col.name];
                        } else if (novosDados[col.id] !== undefined) {
                            updatedDesignState[col.id] = novosDados[col.id];
                        }
                    }
                });
            }
        }

        // Calcular alterações detalhadas (diff)
        const oldDados = current?.dados || {};
        const alteracoes: { campo: string; anterior: string; novo: string }[] = [];
        const allKeys = Array.from(new Set([...Object.keys(oldDados), ...Object.keys(novosDados)]));
        
        allKeys.forEach(k => {
            if (k.startsWith("_") || k === "clickup_status_updated") return;
            const valAntigo = oldDados[k] !== undefined && oldDados[k] !== null ? String(oldDados[k]).trim() : "";
            const valNovo = novosDados[k] !== undefined && novosDados[k] !== null ? String(novosDados[k]).trim() : "";
            if (valAntigo !== valNovo) {
                alteracoes.push({
                    campo: k,
                    anterior: valAntigo || "(vazio)",
                    novo: valNovo || "(vazio)"
                });
            }
        });

        const prevHist = Array.isArray(current?.historico) ? current.historico : [];
        const resumoDiff = alteracoes.length > 0
            ? alteracoes.map(a => `• ${a.campo}: "${a.anterior}" ➔ "${a.novo}"`).join("\n")
            : "Nenhum campo com alteração detectada.";

        const newLogEntry: VeiculoLogEntry = {
            data: new Date().toISOString(),
            usuario: usuario || "Usuário",
            acao: "EDITADO_DADOS",
            titulo: alteracoes.length > 0 ? `Dados Editados (${alteracoes.length} campo${alteracoes.length > 1 ? "s" : ""})` : "Dados do Veículo Editados",
            detalhes: resumoDiff,
            metadata: {
                alteracoes
            }
        };

        const updatePayload: any = { 
            dados: novosDados,
            historico: [...prevHist, newLogEntry]
        };
        if (updatedDesignState) {
            updatePayload.design_state = updatedDesignState;
        }

        const { error } = await supabase
            .from("VeiculoOperador")
            .update(updatePayload)
            .eq("id", id);
        if (error) throw error;
        revalidatePath("/veiculos");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function getVeiculosOperadorByClienteAction(clienteId: string) {
    try {
        const { data, error } = await supabase
            .from("VeiculoOperador")
            .select("id, clickupTaskId, dados")
            .eq("clienteId", clienteId);

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getVeiculoHistoryAction(veiculoId?: string, clickupTaskId?: string) {
    try {
        if (!veiculoId && !clickupTaskId) return { success: false, error: "Identificador não fornecido" };
        let query = supabase.from("VeiculoOperador").select("*");
        if (veiculoId) {
            query = query.eq("id", veiculoId);
        } else if (clickupTaskId) {
            query = query.eq("clickupTaskId", clickupTaskId);
        }
        const { data, error } = await query.single();
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
