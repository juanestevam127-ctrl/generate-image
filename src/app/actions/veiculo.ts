"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

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

export async function updateVeiculoDadosAction(id: string, novosDados: any) {
    try {
        // Obter veículo atual para sincronizar design_state se existir
        const { data: current } = await supabase
            .from("VeiculoOperador")
            .select("dados, design_state, clienteId")
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

        const updatePayload: any = { dados: novosDados };
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
