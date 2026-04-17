"use server";

import { supabase } from "@/lib/supabase";

export async function verifyLoginAction(email: string, pass: string) {
    try {
        const { data, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", email.toLowerCase())
            .eq("password", pass)
            .single();

        if (error) {
            console.error("Server Action Login Error:", error);
            if (error.code === 'PGRST116') { // No rows found
                return { success: false, error: "Credenciais inválidas." };
            }
            return { success: false, error: "Erro na conexão com o banco de dados." };
        }

        if (data) {
            const { password, ...safeUser } = data;
            return { success: true, user: safeUser };
        }

        return { success: false, error: "Credenciais inválidas." };
    } catch (e) {
        console.error("Server Action Auth Exception:", e);
        return { success: false, error: "Erro interno no servidor." };
    }
}

export async function loadInitialDataAction() {
    try {
        // Run fetches in parallel on the server
        const [clientsRes, usersRes, layoutsRes, soldRes] = await Promise.all([
            supabase.from("clientes").select("*").order("name", { ascending: true }),
            supabase.from("usuarios").select("*").order("email", { ascending: true }),
            supabase.from("design_online_layouts_clientes").select("*").order("nome_cliente", { ascending: true }),
            supabase.from("clientes_vendidos").select("*").order("name", { ascending: true })
        ]);

        if (clientsRes.error) throw clientsRes.error;
        if (usersRes.error) throw usersRes.error;

        return {
            success: true,
            data: {
                clients: clientsRes.data || [],
                registeredUsers: usersRes.data || [],
                layoutClients: layoutsRes.data || [],
                soldClients: soldRes.data || []
            }
        };
    } catch (error: any) {
        console.error("Server Action Load Data Error:", error);
        return { success: false, error: error.message || "Falha ao carregar dados do servidor." };
    }
}
