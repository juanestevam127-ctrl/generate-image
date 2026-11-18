"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

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
        const { unstable_noStore: noStore } = await import("next/cache");
        noStore();

        // Fetch clientes first (most critical) — avoid parallel to prevent combined timeout
        const clientsRes = await supabase.from("clientes").select(
            "id, name, webhook_url, webhook_postagens, columns, layouts, prompt, caption_template, pasta_veiculos, id_facebook, id_instagram, token, divisao_developrs, horario_developers, guide_stories, guide_feed, cliente_ativo, id_clickup, clickup_tarefa_id, webhook_stories_seg_quar_sex, integracao_tipo, bndv_external_key, bndv_password, bndv_customer_key, boom_token, boom_customer_key, boom_url, loja_conectada_token, autocerto_username, autocerto_password, revenda_mais_url, nome_grupo_whatsapp, numero_grupo_whatsapp"
        );
        if (clientsRes.error) throw clientsRes.error;

        // Fetch remaining tables in parallel — non-critical, errors won't crash
        const [usersRes, layoutsRes, configRes] = await Promise.all([
            supabase.from("usuarios").select("email, password, role, name"),
            supabase.from("design_online_layouts_clientes").select("*"),
            supabase.from("configuracoes_gerais").select("*").limit(1)
        ]);

        return {
            success: true,
            data: {
                clients: clientsRes.data || [],
                registeredUsers: usersRes.data || [],
                layoutClients: layoutsRes.data || [],
                soldClients: [],
                configuracoesGerais: (configRes.data && configRes.data.length > 0) ? configRes.data[0] : null
            }
        };
    } catch (error: any) {
        console.error("Server Action Load Data Error:", error);
        return { success: false, error: error.message || "Falha ao carregar dados do servidor." };
    }
}

import { uploadImageServerAction } from "./actions/upload";

export async function serverUploadImage(base64: string, bucket: string = 'images', folder: string = '') {
    try {
        const res = await uploadImageServerAction(base64);
        if (res.success && res.publicUrl) {
            return { success: true, url: res.publicUrl };
        }
        throw new Error(res.error || "Falha no upload");
    } catch (error: any) {
        console.error("Server Upload Error:", error);
        return { success: false, error: error.message || "Falha no upload via servidor." };
    }
}

export async function serverUploadFile(formData: FormData, bucket: string = 'images', folder: string = '') {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: "Nenhum arquivo enviado." };

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = `data:${file.type || 'image/png'};base64,${buffer.toString('base64')}`;
        
        const res = await uploadImageServerAction(base64);
        if (res.success && res.publicUrl) {
            return { success: true, url: res.publicUrl };
        }
        throw new Error(res.error || "Falha no upload");
    } catch (error: any) {
        console.error("Server File Upload Error:", error);
        return { success: false, error: error.message || "Falha no upload do arquivo via servidor." };
    }
}

